// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio de viajes — lógica de negocio central
// Gestiona el ciclo de vida completo: solicitud → búsqueda → asignación → completado
// Algoritmo de búsqueda nacional sin geofencing (radio dinámico PostGIS)
// ═══════════════════════════════════════════════════════════════

import { db, query as rawQuery, withTransaction } from '../config/database';
import { rideRepository, CreateRideParams } from '../repositories/rideRepository';
import { driverRepository } from '../repositories/driverRepository';
import { passengerRepository } from '../repositories/passengerRepository';
import { paymentRepository } from '../repositories/paymentRepository';
import { notificationRepository } from '../repositories/notificationRepository';
import { stripeService } from './stripeService';
import { fcmService } from './fcmService';
import { referralService } from './referralService';
import { emailService } from './emailService';
import { calculateFareEstimate, getStateConfig } from './fareService';
import { emitToUser, emitToAdmins } from '../socket/emitter';
import { discountRepository } from '../repositories/discountRepository';
import { vipRepository } from '../repositories/vipRepository';
import { corporateRepository } from '../repositories/corporateRepository';
import { redis, REDIS_KEYS } from '../config/redis';
import { logger } from '../utils/logger';
import { FareEstimate, ServiceType, Ride, CANCELLATION } from '@vride/shared';
import { env } from '../config/env';
import { clinicRepository } from '../repositories/clinicRepository';
import { smsService } from './smsService';
import { membershipRepository, currentPeriodEnd, currentPeriodStart } from '../repositories/membershipRepository';

// ─────────────────────────────────────────────────────────────
// COMISIÓN PROGRESIVA POR DESEMPEÑO — se calcula desde el 1 de enero del año en curso
//
//   15% → base (conductor nuevo o rating < 4.75)
//   14% → 500+ viajes en el año en curso + rating ≥ 4.75
//   13% → 1,500+ viajes en el año en curso + rating ≥ 4.75
//
// Reset automático: el 1 de enero cada año el contador vuelve a cero.
// Si la calificación baja de 4.75 → pierde el nivel inmediatamente.
// ─────────────────────────────────────────────────────────────
export type CommissionTier = 'standard';

export interface DriverCommissionInfo {
  rate:          number;
  tier:          CommissionTier;
  ridesThisYear: number;
  ratingAvg:     number;
  nextTierRides: number | null;
  nextTierRate:  number | null;
}

export async function getDriverCommissionInfo(driverId: string): Promise<DriverCommissionInfo> {
  const { rows } = await db.query<{
    rating_avg:      number;
    rides_this_year: string;
  }>(
    `SELECT d.rating_avg, COUNT(r.id)::text AS rides_this_year
     FROM drivers d
     LEFT JOIN rides r ON r.driver_id = d.id
       AND r.status = 'completed'
       AND r.completed_at >= date_trunc('year', NOW())
     WHERE d.id = $1
     GROUP BY d.rating_avg`,
    [driverId]
  );

  return {
    rate:          0,
    tier:          'standard',
    ridesThisYear: parseInt(rows[0]?.rides_this_year ?? '0'),
    ratingAvg:     Number(rows[0]?.rating_avg ?? 5),
    nextTierRides: null,
    nextTierRate:  null,
  };
}

// Radio dinámico de búsqueda nacional — sin límite geográfico (no geofencing)
const SEARCH_RADIUS_STEPS_KM = [10, 20, 40, 80, 150];
const DRIVER_ACCEPT_TIMEOUT_MS = env.DRIVER_ACCEPT_TIMEOUT_SECONDS * 1000;

export interface RequestRideParams {
  passengerId: string;
  serviceType: ServiceType;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  stateCode: string;
  scheduledAt?: string;
  promoCode?: string;
  promoDiscount?: number;
  estimatedWaitMinutes?: number;
  hourlyPackageHours?: number;
  billToCorporate?: boolean;
  // Encomienda / Delivery
  packageDescription?: string;
  packageSize?: 'small' | 'medium' | 'large';
  senderName?: string;
  senderPhone?: string;
  recipientName?: string;
  recipientPhone?: string;
  deliveryVehicle?: 'motorcycle' | 'sedan' | 'suv' | 'pickup' | 'plataforma' | '350' | 'npr';
  // Carga — precio ofrecido por el pasajero
  offeredPrice?: number;
  cargaVehicle?: '350' | 'npr';
}

export const rideService = {
  // ───────────────────────���─────────────
  // ESTIMAR TARIFA (antes de confirmar el viaje)
  // ─────────────────────────────────────
  estimateFare: async (params: {
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number;
    dropoffLng: number;
    serviceType: ServiceType;
    stateCode: string;
    estimatedWaitMinutes?: number;
    hourlyPackageHours?: number;
    packageSize?: 'small' | 'medium' | 'large';
    deliveryVehicle?: 'motorcycle' | 'sedan' | 'suv' | 'pickup' | 'plataforma';
    cargaVehicle?: '350' | 'npr';
  }): Promise<FareEstimate> => {
    return calculateFareEstimate({
      ...params,
      driverEtaMinutes: undefined,
    });
  },

  // ─────────────────────────────────────
  // SOLICITAR VIAJE
  // Crea el registro y lanza búsqueda asíncrona de conductor
  // ─────────────────────────────────────
  requestRide: async (params: RequestRideParams): Promise<Ride> => {
    // Verificar que el pasajero no tenga un viaje activo
    const activeRide = await rideRepository.findActiveByPassenger(params.passengerId);
    if (activeRide) throw new Error('PASSENGER_HAS_ACTIVE_RIDE');

    // Resolver tier VIP / Corporate
    const [vipProfile, corpEmployee] = await Promise.all([
      vipRepository.findByPassenger(params.passengerId).catch(() => null),
      params.billToCorporate
        ? corporateRepository.findEmployeeByPassenger(params.passengerId).catch(() => null)
        : Promise.resolve(null),
    ]);

    const isVip        = !!vipProfile;
    const isCorporate  = !!corpEmployee;
    const vipMultiplier = isVip ? (vipProfile.price_multiplier ?? 1.30) : 1.00;
    const preferredDriverId = isVip ? (vipProfile.preferred_driver_id ?? null) : null;
    const priorityDispatch  = isVip ? vipProfile.priority_dispatch : false;
    const corporateAccountId = isCorporate ? corpEmployee.corporate_id : null;
    const passengerTier = isVip ? 'vip' : isCorporate ? 'corporate_employee' : 'standard';

    // Validar límite de gasto corporativo
    if (isCorporate && corpEmployee.spending_limit) {
      const remaining = corpEmployee.spending_limit - (corpEmployee.spent_this_month ?? 0);
      if (remaining <= 0) throw new Error('CORPORATE_SPENDING_LIMIT_REACHED');
    }

    // Calcular tarifa estimada
    // Para carga: usar el precio ofrecido por el pasajero directamente
    let estimatedFare = 0;
    let tripDistanceKm = 0;
    if (params.serviceType === 'carga' && params.offeredPrice) {
      estimatedFare = params.offeredPrice;
    } else {
      try {
        const fareEstimate = await calculateFareEstimate({
          pickupLat:   params.pickupLat,
          pickupLng:   params.pickupLng,
          dropoffLat:  params.dropoffLat,
          dropoffLng:  params.dropoffLng,
          serviceType: params.serviceType as ServiceType,
          stateCode:   params.stateCode ?? 'DC',
          cargaVehicle: params.cargaVehicle,
        });
        estimatedFare     = fareEstimate.total * vipMultiplier;
        tripDistanceKm = fareEstimate.distance_km;
      } catch {
        // Si falla el cálculo continuar sin hold
      }
    }

    // ── Pre-autorización de pago (hold) ──
    // Si el pasajero tiene tarjeta, bloquear el monto estimado antes de crear el viaje
    let holdIntentId: string | null = null;
    if (estimatedFare > 0) {
      try {
        const [stripeCustomerId, defaultPm] = await Promise.all([
          paymentRepository.getStripeCustomerId(params.passengerId),
          paymentRepository.getDefault(params.passengerId),
        ]);
        if (stripeCustomerId && defaultPm) {
          const holdAmountCents = Math.max(Math.round(estimatedFare * 1.15 * 100), 500); // +15% margen, mínimo $5
          const hold = await stripeService.holdRide({
            stripeCustomerId,
            paymentMethodId: defaultPm.stripe_payment_method_id,
            amountCents:     holdAmountCents,
            rideId:          'pending',
            passengerName:   params.passengerId,
          });
          holdIntentId = hold.paymentIntentId;
          logger.info(`Hold creado para pasajero ${params.passengerId}: ${holdIntentId} ($${(holdAmountCents / 100).toFixed(2)})`);
        }
      } catch (holdErr: unknown) {
        const errMsg = holdErr instanceof Error ? holdErr.message : String(holdErr);
        logger.warn(`Hold Stripe omitido para pasajero ${params.passengerId}: ${errMsg} — viaje continúa como efectivo`);
        holdIntentId = null;
      }
    }

    // Crear el viaje + guardar PI ID en una sola transacción (atómico)
    // Si falla cualquier paso, la transacción hace rollback y liberamos el hold de Stripe
    let ride: Ride;
    try {
      ride = await withTransaction(async (client) => {
        const created = await client.query<Ride & { pickup_lat: number; pickup_lng: number; dropoff_lat: number; dropoff_lng: number }>(
          `INSERT INTO rides (
             passenger_id, service_type, pickup_address, pickup_location,
             dropoff_address, dropoff_location, state_code, scheduled_at,
             promo_code, promo_discount, estimated_wait_minutes, hourly_package_hours,
             passenger_tier, corporate_account_id, preferred_driver_id,
             priority_dispatch, vip_multiplier,
             package_description, package_size,
             sender_name, sender_phone,
             recipient_name, recipient_phone,
             delivery_vehicle, offered_price,
             initial_estimated_fare,
             status
           ) VALUES (
             $1, $2, $3, ST_SetSRID(ST_MakePoint($5,$4),4326),
             $6, ST_SetSRID(ST_MakePoint($8,$7),4326), $9, $10,
             $11, $12, $13, $14,
             $15, $16, $17, $18, $19,
             $20, $21,
             $22, $23,
             $24, $25,
             $26, $27,
             $28,
             'searching'
           )
           RETURNING *,
             ST_Y(pickup_location::geometry)  AS pickup_lat,
             ST_X(pickup_location::geometry)  AS pickup_lng,
             ST_Y(dropoff_location::geometry) AS dropoff_lat,
             ST_X(dropoff_location::geometry) AS dropoff_lng`,
          [
            params.passengerId, params.serviceType,
            params.pickupAddress, params.pickupLat, params.pickupLng,
            params.dropoffAddress, params.dropoffLat, params.dropoffLng,
            params.stateCode ?? 'DC', params.scheduledAt ?? null,
            params.promoCode ?? null, params.promoDiscount ?? null,
            params.estimatedWaitMinutes ?? null, params.hourlyPackageHours ?? null,
            passengerTier, corporateAccountId, preferredDriverId,
            priorityDispatch, vipMultiplier,
            params.packageDescription ?? null,
            params.packageSize ?? null,
            params.senderName ?? null,
            params.senderPhone ?? null,
            params.recipientName ?? null,
            params.recipientPhone ?? null,
            params.deliveryVehicle ?? null,
            params.offeredPrice ?? null,
            estimatedFare > 0 ? estimatedFare : null,
          ]
        );
        const newRide = created.rows[0];
        if (!newRide) throw new Error('FAILED_TO_CREATE_RIDE');

        if (holdIntentId) {
          await client.query(
            `UPDATE rides SET stripe_payment_intent_id = $1 WHERE id = $2`,
            [holdIntentId, newRide.id]
          );
        }
        return newRide;
      });
    } catch (err) {
      if (holdIntentId) stripeService.releaseHold(holdIntentId).catch(() => {});
      throw err;
    }

    // Notificar al admin dashboard
    emitToAdmins('admin:ride_created', { rideId: ride.id, passengerId: params.passengerId });

    // Iniciar búsqueda asíncrona (no bloquea la respuesta HTTP)
    // Safety timer — garantía absoluta: pasajero SIEMPRE recibe respuesta en ≤ 3 min
    // aunque searchAndNotifyDrivers cuelgue o crashee en silencio
    const _safetyRideId    = ride.id;
    const _safetyPassenger = params.passengerId;
    const _safetyTimer = setTimeout(async () => {
      try {
        const r = await rideRepository.findById(_safetyRideId);
        if (r && r.status === 'searching') {
          await rideRepository.updateStatus(_safetyRideId, 'no_driver_found');
          emitToUser(_safetyPassenger, 'passenger:no_driver_found', { rideId: _safetyRideId });
          logger.warn(`Viaje ${_safetyRideId}: safety timer disparado — forzado no_driver_found tras 3 min`);
        }
      } catch (e) {
        logger.error('Error en safety timer:', e);
      }
    }, 3 * 60 * 1000);

    searchAndNotifyDrivers(ride.id, {
      lat: params.pickupLat,
      lng: params.pickupLng,
    }, params.serviceType, params.passengerId, estimatedFare, tripDistanceKm,
      params.serviceType === 'encomienda' ? (params.deliveryVehicle ?? undefined) : undefined)
      .finally(() => clearTimeout(_safetyTimer))
      .catch(async (err) => {
        console.error('[searchAndNotify] CRASH:', err?.message ?? err, err?.stack ?? '');
        logger.error('Error en búsqueda de conductores:', err);
        // Garantizar que el pasajero reciba respuesta aunque la función crashee
        try {
          const r = await rideRepository.findById(_safetyRideId);
          if (r && r.status === 'searching') {
            await rideRepository.updateStatus(_safetyRideId, 'no_driver_found');
            emitToUser(_safetyPassenger, 'passenger:no_driver_found', { rideId: _safetyRideId });
          }
        } catch { /* último recurso — ya logueado arriba */ }
      });

    return ride;
  },

  // ─────────────────────────────────────
  // RESPUESTA DEL CONDUCTOR (aceptar/rechazar)
  // Llamado desde el socket handler
  // ─────────────────────────────────────
  handleDriverResponse: async (
    rideId: string,
    driverId: string,
    accepted: boolean
  ): Promise<void> => {
    // Verificar que este conductor es el que está esperando respuesta
    const pendingDriverId = await redis.get(`ride:pending:${rideId}`);
    if (pendingDriverId !== driverId) {
      logger.warn(`Driver ${driverId} respondió a viaje ${rideId} pero no es el conductor esperado`);
      return;
    }

    // Verificar suspensión antes de permitir aceptar
    if (accepted && await rideService.isDriverSuspended(driverId)) {
      const ttl = await redis.ttl(REDIS_KEYS.driverSuspended(driverId));
      const resumeAt = new Date(Date.now() + ttl * 1000).toISOString();
      emitToUser(driverId, 'driver:suspended', {
        message: 'You are suspended. You cannot accept rides at this time.',
        resumeAt,
      });
      return;
    }

    if (!accepted) {
      await redis.del(`ride:pending:${rideId}`);
      const { consecutive_rejections } = await membershipRepository.incrementRejectionCounter(driverId);
      logger.info(`Conductor ${driverId} rechazó viaje ${rideId} — rechazos esta semana: ${consecutive_rejections}/15`);

      if (consecutive_rejections >= 15) {
        const membership = await membershipRepository.getCurrentMembership(driverId);
        let creditDays = 0;
        let reactivationDate = '';

        if (membership) {
          const periodEnd = new Date(membership.period_end);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const msDay = 86_400_000;
          creditDays = Math.max(0, Math.round((periodEnd.getTime() - today.getTime()) / msDay) + 1);

          const daysUntilFriday = ((5 - today.getDay() + 7) % 7) || 7;
          const nextFriday = new Date(today.getTime() + daysUntilFriday * msDay);
          const reactivation = new Date(nextFriday.getTime() + (7 - creditDays) * msDay);
          reactivationDate = reactivation.toISOString().split('T')[0];
        }

        await membershipRepository.applySuspensionPenalty(driverId, creditDays, reactivationDate);
        emitToUser(driverId, 'driver:suspended_penalty', {
          rejections: consecutive_rejections,
          creditDays,
          reactivationDate,
        });
        logger.warn(`Conductor ${driverId} suspendido por penalidad — 15 rechazos — crédito ${creditDays} días — reactiva ${reactivationDate}`);
      }

      // La búsqueda continuará porque el timeout en searchAndNotifyDrivers detectará el rechazo
      return;
    }

    // Conductor aceptó — asignar en BD PRIMERO, luego borrar la clave Redis
    // El orden importa: waitForDriverResponse detecta la clave null y consulta la BD,
    // por lo que la asignación debe estar completada antes de borrar la clave.
    const ride = await rideRepository.assignDriver(rideId, driverId);
    if (!ride) {
      // El viaje ya fue asignado a otro conductor (carrera)
      logger.warn(`Viaje ${rideId} ya fue asignado cuando ${driverId} aceptó`);
      emitToUser(driverId, 'driver:ride_already_taken', { rideId });
      return;
    }

    // Registrar descuento si este viaje tenía descuento automático
    const discountFlag = await redis.get(`ride:discount:${rideId}`);
    if (discountFlag === 'automatic') {
      discountRepository.recordDiscount(driverId, rideId, false).catch(err => {
        logger.error(`Error registrando descuento para viaje ${rideId}:`, err);
      });
      await redis.del(`ride:discount:${rideId}`);
    }

    logger.info(`Conductor ${driverId} asignado al viaje ${rideId}`);

    // Ahora que la BD está actualizada, liberar la clave pending para que
    // waitForDriverResponse pueda leer el estado correcto
    await redis.del(`ride:pending:${rideId}`);

    // Guardar viaje activo del conductor en Redis para rápido acceso
    await redis.setex(REDIS_KEYS.driverActiveRide(driverId), 7200, rideId);

    // Notificar al pasajero: conductor asignado
    const [driver, passenger] = await Promise.all([
      driverRepository.findById(driverId),
      passengerRepository.findById(ride.passenger_id),
    ]);
    emitToUser(ride.passenger_id, 'passenger:driver_assigned', {
      rideId,
      hasDiscount:    discountFlag != null,
      discountAmount: discountFlag != null ? discountRepository.DISCOUNT_AMOUNT : 0,
      driver: {
        id:             driver?.id,
        name:           driver?.operative_code ?? driver?.name,
        operative_code: driver?.operative_code,
        photo_url:      driver?.photo_url,
        rating_avg:     driver?.rating_avg,
        vehicle_brand:  driver?.vehicle_brand,
        vehicle_model:  driver?.vehicle_model,
        vehicle_color:  driver?.vehicle_color,
        vehicle_plate:  driver?.vehicle_plate,
      },
    });

    // Para viajes NEMT de clínica: incluir teléfono del paciente para que el conductor pueda llamar
    const clinicRequest = await clinicRepository.findByRideId(rideId);

    // Notificar al conductor: info del pasajero
    emitToUser(driverId, 'driver:passenger_assigned', {
      rideId,
      passenger: {
        id:             passenger?.id,
        name:           passenger?.operative_code ?? (clinicRequest ? clinicRequest.patient_name : passenger?.name),
        operative_code: passenger?.operative_code,
        photo_url:      passenger?.photo_url,
        patient_phone:  clinicRequest?.patient_phone ?? null,
      },
    });

    // Push al pasajero: conductor asignado
    notificationRepository.getPrimaryToken(ride.passenger_id).then(token => {
      if (token && driver) {
        const vehicleInfo = `${driver.vehicle_color} ${driver.vehicle_brand} ${driver.vehicle_model}`;
        fcmService.notifyDriverAssigned(token, driver.name, vehicleInfo);
      }
    }).catch(() => {/* no bloquear */});

    // Notificar al admin
    emitToAdmins('admin:ride_status_changed', {
      rideId, status: 'driver_assigned', driverId,
    });
  },

  // ─────────────────────────────────────
  // RESPUESTA A DESCUENTO VOLUNTARIO
  // ─────────────────────────────────────
  handleVoluntaryDiscountResponse: async (
    rideId: string,
    driverId: string,
    accepted: boolean
  ): Promise<void> => {
    if (!accepted) {
      logger.info(`Conductor ${driverId} rechazó el descuento voluntario para viaje ${rideId}`);
      return;
    }

    // Verificar que el viaje aún está disponible (no asignado)
    const ride = await rideRepository.findById(rideId);
    if (!ride || ride.status !== 'searching') {
      emitToUser(driverId, 'driver:ride_already_taken', { rideId });
      return;
    }

    // Asignar el viaje a este conductor
    const assigned = await rideRepository.assignDriver(rideId, driverId);
    if (!assigned) {
      emitToUser(driverId, 'driver:ride_already_taken', { rideId });
      return;
    }

    // Registrar el descuento voluntario
    discountRepository.recordDiscount(driverId, rideId, true).catch(err => {
      logger.error(`Error registrando descuento voluntario para viaje ${rideId}:`, err);
    });

    await redis.setex(REDIS_KEYS.driverActiveRide(driverId), 7200, rideId);

    const [driver, passenger] = await Promise.all([
      driverRepository.findById(driverId),
      passengerRepository.findById(ride.passenger_id),
    ]);

    emitToUser(ride.passenger_id, 'passenger:driver_assigned', {
      rideId,
      driver: {
        id:             driver?.id,
        name:           driver?.operative_code ?? driver?.name,
        operative_code: driver?.operative_code,
        photo_url:      driver?.photo_url,
        rating_avg:     driver?.rating_avg,
        vehicle_brand:  driver?.vehicle_brand,
        vehicle_model:  driver?.vehicle_model,
        vehicle_color:  driver?.vehicle_color,
        vehicle_plate:  driver?.vehicle_plate,
      },
    });

    emitToUser(driverId, 'driver:passenger_assigned', {
      rideId,
      passenger: {
        id:             passenger?.id,
        name:           passenger?.operative_code ?? passenger?.name,
        operative_code: passenger?.operative_code,
        photo_url:      passenger?.photo_url,
      },
    });

    driverRepository.incrementRidesAccepted(driverId).catch(() => {});
    logger.info(`Conductor ${driverId} aceptó descuento voluntario — viaje ${rideId} asignado`);
  },

  // ─────────────────────────────────────
  // CONDUCTOR LLEGÓ AL PUNTO DE RECOGIDA
  // ─────────────────────────────────────
  driverArrived: async (rideId: string, driverId: string): Promise<Ride> => {
    const ride = await rideRepository.findById(rideId);
    if (!ride) throw new Error('RIDE_NOT_FOUND');
    if (ride.driver_id !== driverId) throw new Error('NOT_YOUR_RIDE');
    if (ride.status !== 'driver_arriving' && ride.status !== 'driver_assigned') {
      throw new Error('INVALID_RIDE_STATUS');
    }

    const updated = await rideRepository.updateStatus(rideId, 'driver_arrived');
    if (!updated) throw new Error('RIDE_NOT_FOUND');

    // Notificar al pasajero por socket y push
    emitToUser(ride.passenger_id, 'passenger:driver_arrived', { rideId });
    const driverName = (updated as unknown as { driver_name?: string }).driver_name ?? 'Your driver';
    notificationRepository.getPrimaryToken(ride.passenger_id).then(token => {
      if (token) fcmService.notifyDriverArrived(token, driverName);
    }).catch(() => {/* no bloquear */});

    // SMS al paciente si es un viaje NEMT de clínica
    clinicRepository.findByRideId(rideId).then(async clinicReq => {
      if (clinicReq?.patient_phone) {
        await smsService.sendDriverArriving(
          clinicReq.patient_phone,
          driverName,
          clinicReq.patient_name,
        );
      }
    }).catch(() => {/* no bloquear */});

    return updated;
  },

  // ─────────────────────────────────────
  // INICIAR VIAJE (pasajero a bordo)
  // ─────────────────────────────────────
  startRide: async (rideId: string, driverId: string): Promise<Ride> => {
    const ride = await rideRepository.findById(rideId);
    if (!ride) throw new Error('RIDE_NOT_FOUND');
    if (ride.driver_id !== driverId) throw new Error('NOT_YOUR_RIDE');
    if (ride.status !== 'driver_arrived') throw new Error('INVALID_RIDE_STATUS');

    const updated = await rideRepository.updateStatus(rideId, 'in_progress');
    if (!updated) throw new Error('RIDE_NOT_FOUND');

    // Notificar al pasajero por socket y push
    emitToUser(ride.passenger_id, 'passenger:ride_started', { rideId });
    notificationRepository.getPrimaryToken(ride.passenger_id).then(token => {
      if (token) fcmService.notifyRideStarted(token, ride.dropoff_address);
    }).catch(() => {/* no bloquear */});
    emitToAdmins('admin:ride_status_changed', { rideId, status: 'in_progress' });

    return updated;
  },

  // ─────────────────────────────────────
  // COMPLETAR VIAJE
  // Calcula la tarifa final y registra ganancias del conductor
  // ─────────────────────────────────────
  completeRide: async (rideId: string, driverId: string): Promise<Ride> => {
    const ride = await rideRepository.findById(rideId) as
      (Ride & { pickup_lat: number; pickup_lng: number; dropoff_lat: number; dropoff_lng: number }) | null;
    if (!ride) throw new Error('RIDE_NOT_FOUND');
    if (ride.driver_id !== driverId) throw new Error('NOT_YOUR_RIDE');
    if (ride.status !== 'in_progress') throw new Error('INVALID_RIDE_STATUS');

    // Calcular tarifa final con datos reales de distancia/tiempo
    const stateCode = ride.state_code ?? 'TX';
    const rideAny   = ride as any;
    const fareEstimate = await calculateFareEstimate({
      pickupLat:            ride.pickup_lat  ?? 0,
      pickupLng:            ride.pickup_lng  ?? 0,
      dropoffLat:           ride.dropoff_lat ?? 0,
      dropoffLng:           ride.dropoff_lng ?? 0,
      serviceType:          ride.service_type as ServiceType,
      stateCode,
      hourlyPackageHours:   rideAny.hourly_package_hours ?? undefined,
      estimatedWaitMinutes: rideAny.wait_minutes > 0 ? rideAny.wait_minutes : undefined,
    });
    // Para carga: respetar el precio negociado (counter_price si fue contra-oferta, offered_price si fue directo)
    if (ride.service_type === 'carga') {
      const negotiatedPrice = +(rideAny.counter_price ?? rideAny.offered_price ?? fareEstimate.total);
      if (negotiatedPrice > 0) {
        fareEstimate.total    = negotiatedPrice;
        fareEstimate.subtotal = negotiatedPrice;
      }
    }

    // Para wait_and_return: sumar el wait_fare real al total
    const realWaitFare = +(rideAny.wait_fare ?? 0);
    if (ride.service_type === 'wait_and_return' && realWaitFare > 0) {
      fareEstimate.total   = Math.round((fareEstimate.total + realWaitFare) * 100) / 100;
      fareEstimate.subtotal = fareEstimate.total;
    }

    // ── Comisión Venezuela: 0% — conductor recibe el 100% de la tarifa ──
    const commissionRate = 0;

    // ── Descuento de lealtad al pasajero (absorbido por la plataforma) ──
    // Califica: 15+ viajes esta semana ó 50+ viajes este mes
    const { rows: ridesCountRows } = await db.query<{
      rides_this_week:  string;
      rides_this_month: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE completed_at >= date_trunc('week', NOW()))::text  AS rides_this_week,
         COUNT(*) FILTER (WHERE completed_at >= date_trunc('month', NOW()))::text AS rides_this_month
       FROM rides
       WHERE passenger_id = $1 AND status = 'completed'`,
      [ride.passenger_id]
    );
    const ridesThisWeek       = parseInt(ridesCountRows[0]?.rides_this_week  ?? '0');
    const ridesThisMonth      = parseInt(ridesCountRows[0]?.rides_this_month ?? '0');
    const isFrequentPassenger = ridesThisWeek >= 25 || ridesThisMonth >= 50;
    const loyaltyDiscount     = isFrequentPassenger
      ? Math.round(fareEstimate.total * 0.10 * 100) / 100
      : 0;

    // ── Cálculo final ──
    // Driver earns their % of the gross fare (platform absorbs the loyalty discount)
    const newPassengerDiscount = rideAny.new_passenger_discount === true
      ? Math.round(((rideAny.discount_amount as number) ?? discountRepository.DISCOUNT_AMOUNT) * 100) / 100
      : 0;
    const driverEarnings = Math.round((fareEstimate.total * (1 - commissionRate) - newPassengerDiscount) * 100) / 100;
    const platformFee    = Math.round((fareEstimate.total * commissionRate - loyaltyDiscount) * 100) / 100;
    const totalCharged   = Math.round((fareEstimate.total - loyaltyDiscount) * 100) / 100;

    if (loyaltyDiscount > 0) {
      logger.info(`Loyalty 10% discount: $${loyaltyDiscount} for passenger ${ride.passenger_id} (week:${ridesThisWeek} month:${ridesThisMonth})`);
    }
    if (newPassengerDiscount > 0) {
      logger.info(`Descuento nuevo pasajero: -$${newPassengerDiscount} absorbido por conductor ${driverId}`);
    }
    logger.info(`Comisión Venezuela 0% — conductor recibe $${driverEarnings} de $${fareEstimate.total}`);

    // Venezuela: pago en efectivo — el conductor recibe el dinero del pasajero directamente.
    // No hay integración con Stripe; el viaje se marca como pagado al finalizarlo.
    let stripePaymentIntentId: string | undefined;
    const paymentStatus: 'completed' | 'failed' | 'pending' = 'completed';

    // Completar viaje + registrar ganancia en una sola transacción (atómico)
    // Queries secuenciales — pg no soporta client.query() concurrentes en el mismo cliente
    const { completedRide, driverStats } = await withTransaction(async (client) => {
      const updated = await client.query<Ride>(
        `UPDATE rides SET
           status = 'completed', completed_at = NOW(),
           distance_km = $2, duration_minutes = $3,
           base_fare = $4, distance_fare = $5, time_fare = $6,
           surge_multiplier = $7, service_multiplier = $8,
           subtotal = $9, platform_commission = $10,
           driver_earnings = $11, total_charged = $12,
           stripe_payment_intent_id = $13, payment_status = $14
         WHERE id = $1 RETURNING *`,
        [
          rideId,
          fareEstimate.distance_km, fareEstimate.duration_minutes,
          fareEstimate.base_fare, fareEstimate.distance_fare, fareEstimate.time_fare,
          fareEstimate.surge_multiplier, fareEstimate.service_multiplier,
          fareEstimate.subtotal, platformFee,
          driverEarnings, fareEstimate.total,
          stripePaymentIntentId ?? null, paymentStatus,
        ]
      );

      const completedRide = updated.rows[0];
      if (!completedRide) throw new Error('RIDE_NOT_FOUND');

      await client.query(
        `INSERT INTO driver_earnings (driver_id, ride_id, type, gross_amount, platform_fee, net_amount, description)
         VALUES ($1, $2, 'ride', $3, $4, $5, 'Ganancia por viaje completado')`,
        [driverId, rideId, fareEstimate.total, platformFee, driverEarnings]
      );

      const statsResult = await client.query<{ total_rides: number }>(
        `UPDATE drivers SET total_rides = COALESCE(total_rides,0)+1,
           available_balance = COALESCE(available_balance,0)+$2
         WHERE id = $1 RETURNING total_rides`,
        [driverId, driverEarnings]
      );

      await client.query(
        `UPDATE passengers SET total_rides = COALESCE(total_rides,0)+1 WHERE id = $1`,
        [ride.passenger_id]
      );

      return { completedRide, driverStats: statsResult.rows[0] };
    });
    if (!completedRide) throw new Error('RIDE_NOT_FOUND');

    // Verificar bonos por hito (después de la transacción — total_rides ya actualizado)
    const totalRides = driverStats?.total_rides ?? 0;
    const serviceType = ride.service_type ?? 'standard';
    referralService.onRideCompleted(driverId, totalRides, serviceType).catch(err =>
      logger.warn('Error procesando bonos al completar viaje', { err })
    );

    // ── Transferencia automática al conductor (si tiene cuenta Connect verificada) ──
    try {
      const driverStripeInfo = await paymentRepository.getDriverStripeInfo(driverId);
      if (driverStripeInfo?.stripe_account_id && driverStripeInfo.stripe_account_verified && paymentStatus === 'completed') {
        await stripeService.transferToDriver({
          stripeAccountId: driverStripeInfo.stripe_account_id,
          amountCents:     Math.round(driverEarnings * 100),
          rideId,
          driverId,
        });
      }
    } catch (err) {
      // La transferencia falla silenciosamente — el conductor tiene el balance en available_balance
      logger.warn('Fallo en transferencia Stripe al conductor', { rideId, driverId, err });
    }

    // Actualizar gasto mensual del empleado corporativo si aplica
    if ((rideAny as any).corporate_account_id && ride.passenger_id) {
      corporateRepository.updateEmployeeSpending(
        (rideAny as any).corporate_account_id, ride.passenger_id, fareEstimate.total
      ).catch(() => {});
    }

    // Limpiar estado del conductor en Redis (no bloquear si falla)
    await redis.del(REDIS_KEYS.driverActiveRide(driverId)).catch((err: unknown) =>
      logger.warn('Error limpiando Redis al completar viaje', { rideId, driverId, err })
    );

    // Notificar al pasajero con el monto cobrado (socket + push)
    emitToUser(ride.passenger_id, 'passenger:ride_completed', {
      rideId,
      totalCharged:  fareEstimate.total,
      totalVes:      fareEstimate.total_ves,
      exchangeRate:  fareEstimate.exchange_rate_ves,
      driverEarnings,
      paymentStatus,
    });

    // Push al pasajero y al conductor en paralelo
    Promise.all([
      notificationRepository.getPrimaryToken(ride.passenger_id).then(token => {
        if (token) fcmService.notifyRideCompleted(token, fareEstimate.total, paymentStatus === 'completed');
      }),
      notificationRepository.getPrimaryToken(driverId).then(token => {
        if (token) fcmService.notifyEarningReceived(token, driverEarnings);
      }),
    ]).catch(() => {/* no bloquear */});

    emitToAdmins('admin:ride_status_changed', { rideId, status: 'completed' });

    // Enviar recibo PDF por email al pasajero (fire-and-forget, no bloquea)
    (async () => {
      try {
        const { db } = await import('../config/database');
        const { rows } = await db.query<any>(
          `SELECT u_p.name AS passenger_name, u_p.email AS passenger_email,
                  u_d.name AS driver_name,
                  CONCAT(d.vehicle_color, ' ', d.vehicle_brand, ' ', d.vehicle_model) AS driver_vehicle,
                  ST_Y(r.pickup_location::geometry)  AS pickup_lat,
                  ST_X(r.pickup_location::geometry)  AS pickup_lng,
                  ST_Y(r.dropoff_location::geometry) AS dropoff_lat,
                  ST_X(r.dropoff_location::geometry) AS dropoff_lng
           FROM rides r
           JOIN users u_p ON u_p.id = r.passenger_id
           LEFT JOIN users u_d ON u_d.id = r.driver_id
           LEFT JOIN drivers d ON d.id = r.driver_id
           WHERE r.id = $1`,
          [rideId]
        );
        if (rows[0]) {
          await emailService.sendReceipt({
            ride: { ...completedRide, ...rows[0] } as any,
          });
        }
      } catch (err) {
        logger.warn('Error enviando recibo por email', { rideId, err });
      }
    })();

    const vesRate = fareEstimate.exchange_rate_ves ?? 0;
    return {
      ...completedRide,
      driver_earnings_ves: vesRate ? Math.round(driverEarnings * vesRate * 100) / 100 : 0,
      exchange_rate_ves:   vesRate,
    } as any;
  },

  // ─────────────────────────────────────
  // CANCELAR VIAJE (pasajero o conductor)
  // ─────────────────────────────────────
  cancelRide: async (rideId: string, userId: string, role: 'passenger' | 'driver', reason?: string): Promise<Ride> => {
    const ride = await rideRepository.findById(rideId);
    if (!ride) throw new Error('RIDE_NOT_FOUND');

    // Verificar que el viaje pertenece al usuario
    const isOwner = role === 'passenger'
      ? ride.passenger_id === userId
      : ride.driver_id === userId;
    if (!isOwner) throw new Error('NOT_YOUR_RIDE');

    // No se puede cancelar un viaje ya completado o ya cancelado
    const blockedStatuses = role === 'driver'
      ? ['completed', 'cancelled_passenger', 'cancelled_driver', 'no_driver_found']
      : ['in_progress', 'completed', 'cancelled_passenger', 'cancelled_driver', 'no_driver_found'];
    if (blockedStatuses.includes(ride.status)) {
      throw new Error('CANNOT_CANCEL_IN_STATUS');
    }

    // Fee por cancelación tardía (Venezuela — efectivo, el pasajero se lo da al conductor)
    let cancellationFee: number | undefined;
    if (role === 'passenger') {
      const driverArrived = ride.status === 'driver_arrived';
      const pastFreeWindow = (() => {
        if (!ride.driver_assigned_at) return false;
        const elapsedMinutes = (Date.now() - new Date(ride.driver_assigned_at).getTime()) / 60_000;
        return elapsedMinutes > CANCELLATION.FREE_WINDOW_MINUTES;
      })();

      if (driverArrived || pastFreeWindow) {
        const pct = CANCELLATION.FEE_PCT[ride.service_type];
        if (pct !== undefined) {
          const base = ride.initial_estimated_fare ?? ride.offered_price ?? 0;
          cancellationFee = Math.round(base * pct * 100) / 100;
        } else {
          cancellationFee = CANCELLATION.FEE_FIXED[ride.service_type] ?? CANCELLATION.DEFAULT_FIXED;
        }

        if (ride.driver_id) {
          try {
            await Promise.all([
              rideRepository.recordCancellationFeeEarning(ride.driver_id, rideId, cancellationFee),
              rideRepository.updateDriverStats(ride.driver_id, cancellationFee),
            ]);
          } catch (err) {
            logger.warn(`Cancellation fee driver credit failed for ride ${rideId}`, err);
          }
        }
      }
    }

    const newStatus = role === 'passenger' ? 'cancelled_passenger' : 'cancelled_driver';
    const updated = await rideRepository.updateStatus(rideId, newStatus, {
      cancellationReason: reason,
      cancellationFee,
    });
    if (!updated) throw new Error('RIDE_NOT_FOUND');

    // Limpiar Redis si hay conductor asignado
    if (ride.driver_id) {
      await redis.del(REDIS_KEYS.driverActiveRide(ride.driver_id));
      if (role === 'passenger') {
        emitToUser(ride.driver_id, 'driver:ride_cancelled', { rideId, reason, cancellationFee });
      }
    }

    // Notificar al conductor pendiente (viaje aún en búsqueda, sin driver_id asignado)
    if (role === 'passenger' && !ride.driver_id) {
      const pendingDriverId = await redis.get(`ride:pending:${rideId}`);
      if (pendingDriverId) {
        emitToUser(pendingDriverId, 'driver:ride_cancelled', { rideId, reason });
        await redis.del(`ride:pending:${rideId}`);
      }
    }

    // Notificar al pasajero si el conductor cancela
    if (role === 'driver') {
      emitToUser(ride.passenger_id, 'passenger:ride_cancelled_by_driver', { rideId, reason });

      // Sistema de suspensión por cancelaciones excesivas
      // Excepción: si el conductor ya llegó y el pasajero no apareció, no cuenta
      const passengerLate = ride.status === 'driver_arrived';
      if (!passengerLate) {
        await rideService.trackDriverCancellation(userId);
      }
    }

    return updated;
  },

  // ─────────────────────────────────────
  // SUSPENSIÓN POR CANCELACIONES EXCESIVAS
  // 5 cancelaciones en 24h → suspensión de 12h
  // ─────────────────────────────────────
  trackDriverCancellation: async (driverId: string): Promise<void> => {
    const key = REDIS_KEYS.driverCancelCount(driverId);
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 24 * 60 * 60); // ventana de 24 horas
    }

    if (count === 3 || count === 4) {
      // Aviso preventivo
      emitToUser(driverId, 'driver:cancellation_warning', {
        count,
        message: `Warning: you have ${count} cancellations today. On the 5th you will be suspended for 12 hours.`,
      });
      logger.warn(`Conductor ${driverId} lleva ${count} cancelaciones hoy`);
    }

    if (count >= 5) {
      // Suspender 12 horas
      await redis.setex(REDIS_KEYS.driverSuspended(driverId), 12 * 60 * 60, '1');
      // Sacar al conductor de la lista de disponibles
      await redis.srem(REDIS_KEYS.driversOnline, driverId);
      emitToUser(driverId, 'driver:suspended', {
        message: 'You have been suspended for 12 hours for exceeding the daily cancellation limit.',
        resumeAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      });
      logger.warn(`Conductor ${driverId} suspendido 12h por ${count} cancelaciones`);
    }
  },

  // Verificar si un conductor está suspendido
  isDriverSuspended: async (driverId: string): Promise<boolean> => {
    const suspended = await redis.get(REDIS_KEYS.driverSuspended(driverId));
    return suspended === '1';
  },

  // ─────────────────────────────────────
  // CALIFICAR VIAJE (bidireccional)
  // ─────────────────────────────────────
  // ─────────────────────────────────────
  // WAIT & RETURN — iniciar período de espera
  // El conductor llega al destino y pulsa "Start Waiting"
  // ─────────────────────────────────────
  startWait: async (rideId: string, driverId: string): Promise<void> => {
    const ride = await rideRepository.findById(rideId);
    if (!ride) throw new Error('RIDE_NOT_FOUND');
    if (ride.driver_id !== driverId) throw new Error('NOT_YOUR_RIDE');
    if (ride.service_type !== 'wait_and_return') throw new Error('NOT_WAIT_AND_RETURN');
    if (ride.status !== 'in_progress') throw new Error('INVALID_RIDE_STATUS');

    const { db } = await import('../config/database');
    await db.query(
      `UPDATE rides SET wait_started_at = NOW() WHERE id = $1`,
      [rideId]
    );

    emitToUser(ride.passenger_id, 'passenger:driver_waiting', {
      rideId,
      message: 'Your driver is waiting for you at the appointment',
    });
  },

  // ─────────────────────────────────────
  // WAIT & RETURN — finalizar espera e iniciar regreso
  // Calcula wait_fare con tiempo real de espera
  // ─────────────────────────────────────
  endWait: async (rideId: string, driverId: string): Promise<{ waitMinutes: number; waitFare: number }> => {
    const ride = await rideRepository.findById(rideId) as any;
    if (!ride) throw new Error('RIDE_NOT_FOUND');
    if (ride.driver_id !== driverId) throw new Error('NOT_YOUR_RIDE');
    if (ride.service_type !== 'wait_and_return') throw new Error('NOT_WAIT_AND_RETURN');
    if (!ride.wait_started_at) throw new Error('WAIT_NOT_STARTED');

    const stateConfig = await getStateConfig(ride.state_code ?? 'DC');
    const waitPerMin  = +(stateConfig?.wait_per_minute_rate ?? 0.30);
    const waitMs      = Date.now() - new Date(ride.wait_started_at).getTime();
    const waitMinutes = Math.ceil(waitMs / 60_000);
    const waitFare    = Math.round(waitMinutes * waitPerMin * 100) / 100;

    const { db } = await import('../config/database');
    await db.query(
      `UPDATE rides SET wait_ended_at = NOW(), wait_minutes = $1, wait_fare = $2 WHERE id = $3`,
      [waitMinutes, waitFare, rideId]
    );

    emitToUser(ride.passenger_id, 'passenger:driver_done_waiting', {
      rideId,
      waitMinutes,
      waitFare,
      message: 'Your driver is ready — heading back now',
    });

    return { waitMinutes, waitFare };
  },

  // ──────────��──────────────────────────
  // CONTRA-OFERTA DEL CONDUCTOR (solo carga)
  // ────────────────────���────────────────
  submitCounterOffer: async (rideId: string, driverId: string, counterPrice: number, counterReason: string): Promise<void> => {
    const ride = await rideRepository.findById(rideId);
    if (!ride) throw new Error('RIDE_NOT_FOUND');
    if (ride.service_type !== 'carga') throw new Error('NOT_CARGA_RIDE');
    if (!['searching', 'price_negotiation'].includes(ride.status)) throw new Error('INVALID_RIDE_STATUS');

    await rideRepository.updateCounterOffer(rideId, driverId, counterPrice, counterReason);

    // Extender TTL del pending para dar tiempo al pasajero (5 minutos)
    await redis.expire(`ride:pending:${rideId}`, 5 * 60);

    // Obtener nombre del conductor para el pasajero
    const driverData = await driverRepository.findById(driverId);
    emitToUser(ride.passenger_id, 'passenger:counter_offer', {
      rideId,
      counterPrice,
      counterReason,
      driverName: driverData?.name ?? 'Conductor',
    });

    logger.info(`Contra-oferta: viaje=${rideId} conductor=${driverId} precio=$${counterPrice}`);
  },

  // ───────���─────────────────────────────
  // RESPUESTA DEL PASAJERO A LA CONTRA-OFERTA
  // ────────���─────────────────��──────────
  respondToCounterOffer: async (rideId: string, passengerId: string, accept: boolean): Promise<void> => {
    const ride = await rideRepository.findById(rideId);
    if (!ride) throw new Error('RIDE_NOT_FOUND');
    if (ride.passenger_id !== passengerId) throw new Error('NOT_YOUR_RIDE');
    if (ride.status !== 'price_negotiation') throw new Error('INVALID_RIDE_STATUS');

    const counterDriverId = (ride as any).counter_driver_id as string | null;
    if (!counterDriverId) throw new Error('NO_COUNTER_OFFER');

    if (accept) {
      const updated = await rideRepository.acceptCounterOffer(rideId);
      if (!updated) throw new Error('RIDE_NOT_FOUND');

      // Liberar la clave pending → waitForDriverResponse resolverá true
      await redis.del(`ride:pending:${rideId}`);
      await redis.setex(REDIS_KEYS.driverActiveRide(counterDriverId), 7200, rideId);

      const [driver, passenger] = await Promise.all([
        driverRepository.findById(counterDriverId),
        passengerRepository.findById(passengerId),
      ]);

      emitToUser(passengerId, 'passenger:driver_assigned', {
        rideId,
        driver: {
          id: driver?.id, name: driver?.operative_code ?? driver?.name,
          operative_code: driver?.operative_code,
          photo_url: driver?.photo_url,
          rating_avg: driver?.rating_avg, vehicle_brand: driver?.vehicle_brand,
          vehicle_model: driver?.vehicle_model, vehicle_color: driver?.vehicle_color,
          vehicle_plate: driver?.vehicle_plate,
        },
      });
      emitToUser(counterDriverId, 'driver:passenger_assigned', {
        rideId,
        passenger: {
          id: passenger?.id,
          name: passenger?.operative_code ?? passenger?.name,
          operative_code: passenger?.operative_code,
          photo_url: passenger?.photo_url,
        },
      });
      emitToAdmins('admin:ride_status_changed', { rideId, status: 'driver_assigned', driverId: counterDriverId });
      logger.info(`Contra-oferta aceptada: viaje=${rideId} conductor=${counterDriverId}`);
    } else {
      // Rechazar: resetear y seguir buscando
      await rideRepository.rejectCounterOffer(rideId);
      // Liberar la clave pending → waitForDriverResponse resolverá false → búsqueda continúa
      await redis.del(`ride:pending:${rideId}`);
      emitToUser(counterDriverId, 'driver:counter_rejected', { rideId });
      logger.info(`Contra-oferta rechazada: viaje=${rideId} conductor=${counterDriverId}`);
    }
  },

  submitRating: async (params: {
    rideId: string;
    raterId: string;
    raterRole: 'passenger' | 'driver';
    score: number;
    comment?: string;
  }): Promise<void> => {
    const ride = await rideRepository.findById(params.rideId);
    if (!ride) throw new Error('RIDE_NOT_FOUND');
    if (ride.status !== 'completed') throw new Error('RIDE_NOT_COMPLETED');

    const ratedId = params.raterRole === 'passenger'
      ? ride.driver_id!
      : ride.passenger_id;

    await rideRepository.saveRating({
      rideId:   params.rideId,
      raterId:  params.raterId,
      ratedId,
      raterRole: params.raterRole,
      score:    params.score,
      comment:  params.comment,
    });

    // Actualizar promedio del calificado
    if (params.raterRole === 'passenger') {
      await rideRepository.updateDriverRating(ratedId);
    } else {
      await rideRepository.updatePassengerRating(ratedId);
    }

    // Enviar mensajes de agradecimiento a la otra parte si los seleccionó
    if (params.comment) {
      const event = params.raterRole === 'passenger'
        ? 'driver:passenger_thankyou'
        : 'passenger:driver_thankyou';
      emitToUser(ratedId, event, { messages: params.comment, rideId: params.rideId });
    }
  },
};

// ────────────────────────────────��────
// Búsqueda asíncrona de conductores — algoritmo nacional sin geofencing
// Expande el radio progresivamente: 10→20→40→80→150km
// ─────────────────────────────────────
async function searchAndNotifyDrivers(
  rideId: string,
  pickup: { lat: number; lng: number },
  serviceType: string,
  passengerId: string,
  estimatedFare: number = 0,
  tripDistanceKm: number = 0,
  deliveryVehicle?: string
): Promise<void> {
  const triedDriverIds = new Set<string>();
  let currentRadiusIndex = 0;

  // ── DIAGNÓSTICO: estado de conductores en BD al iniciar búsqueda ──
  try {
    const diagRows = await rawQuery<{
      id: string; is_online: boolean; status: string; is_active: boolean;
      services: string[] | null; has_location: boolean;
      lat: number | null; lng: number | null;
    }>(
      `SELECT d.id, d.is_online, d.status, u.is_active,
              d.services,
              d.current_location IS NOT NULL AS has_location,
              ST_Y(d.current_location::geometry) AS lat,
              ST_X(d.current_location::geometry) AS lng
       FROM drivers d JOIN users u ON u.id = d.id
       WHERE d.is_online = true OR d.last_location_at > NOW() - INTERVAL '5 minutes'`
    );
    const diagSummary = diagRows.map(r => ({
      id: r.id.slice(0, 8),
      online: r.is_online, status: r.status, active: r.is_active,
      services: r.services, loc: r.has_location ? `${r.lat?.toFixed(4)},${r.lng?.toFixed(4)}` : 'NULL',
    }));
    const diagMsg = `[DIAG] ride=${rideId} Conductores recientes (${diagRows.length}): ${JSON.stringify(diagSummary)}`;
    console.log(diagMsg);
    logger.warn(diagMsg);
  } catch (e) {
    console.error('[DIAG] Error en query diagnóstico:', e);
    logger.error('[DIAG] Error en query diagnóstico:', e);
  }

  while (currentRadiusIndex < SEARCH_RADIUS_STEPS_KM.length) {
    const radiusKm = SEARCH_RADIUS_STEPS_KM[currentRadiusIndex]!;

    // Verificar que el viaje sigue en estado 'searching'
    const ride = await rideRepository.findById(rideId);
    const stopMsg = `[SEARCH-CHECK] viaje=${rideId} estado=${ride?.status ?? 'NOT_FOUND'}`;
    console.log(stopMsg);
    if (!ride || ride.status !== 'searching') {
      console.log(`[SEARCH-STOP] viaje=${rideId} — detenido. estado=${ride?.status ?? 'NOT_FOUND'}`);
      logger.info(`Búsqueda detenida para viaje ${rideId} — estado: ${ride?.status}`);
      return;
    }

    // Para encomienda con vehículo específico, buscar ese tipo de conductor
    const matchServiceType = (serviceType === 'encomienda' && deliveryVehicle)
      ? deliveryVehicle
      : serviceType;

    let nearbyDrivers = await driverRepository.findNearby(
      pickup.lng, pickup.lat,
      radiusKm * 1000,
      matchServiceType,
      10
    );

    // VIP: si tiene conductor preferido y está disponible, moverlo al frente
    const rideForVip = await rideRepository.findById(rideId) as any;
    if (rideForVip?.preferred_driver_id) {
      const preferred = nearbyDrivers.find(d => d.id === rideForVip.preferred_driver_id);
      if (preferred) {
        nearbyDrivers = [preferred, ...nearbyDrivers.filter(d => d.id !== preferred.id)];
        logger.info(`[VIP] Conductor preferido ${preferred.id.slice(0,8)} movido al frente`);
      }
    }

    const findMsg = `[findNearby] viaje=${rideId} radio=${radiusKm}km tipo=${serviceType} encontrados=${nearbyDrivers.length}${nearbyDrivers.length > 0 ? ` ids=[${nearbyDrivers.map(d => d.id.slice(0,8)).join(',')}]` : ''}`;
    console.log(findMsg);
    logger.info(findMsg);

    // Filtrar conductores ya contactados
    const candidates = nearbyDrivers.filter(d => !triedDriverIds.has(d.id));

    if (candidates.length === 0) {
      // Diagnóstico extendido en el primer radio para identificar por qué no hay conductores
      if (currentRadiusIndex === 0) {
        try {
          const [inArea, onlineActive] = await Promise.all([
            rawQuery<{ cnt: string }>(
              `SELECT COUNT(*)::text AS cnt FROM drivers d JOIN users u ON u.id = d.id
               WHERE ST_DWithin(d.current_location::geography, ST_MakePoint($1,$2)::geography, $3)`,
              [pickup.lng, pickup.lat, radiusKm * 1000]
            ),
            rawQuery<{ cnt: string; ids: string }>(
              `SELECT COUNT(*)::text AS cnt,
                      STRING_AGG(LEFT(d.id::text,8)||'[online='||d.is_online::text||',svc='||COALESCE(array_to_string(d.services,','),'NULL')||']', ' ') AS ids
               FROM drivers d JOIN users u ON u.id = d.id
               WHERE u.is_active = true AND d.status = 'active'`
            ),
          ]);
          const diag3Msg = `[DIAG3] radio=${radiusKm}km: ${inArea[0]?.cnt ?? 0} conductores en área | activos en total: ${onlineActive[0]?.ids ?? '(ninguno)'}`;
          console.log(diag3Msg);
          logger.warn(diag3Msg);
        } catch { /* diagnóstico opcional */ }
      }
      // Sin candidatos en este radio — expandir si hay más niveles
      currentRadiusIndex++;
      if (currentRadiusIndex < SEARCH_RADIUS_STEPS_KM.length) {
        const nextRadius = SEARCH_RADIUS_STEPS_KM[currentRadiusIndex]!;
        emitToUser(passengerId, 'passenger:search_radius', { radiusKm: nextRadius });
        logger.info(`Viaje ${rideId}: expandiendo radio a ${nextRadius}km`);
      }
      continue;
    }

    // Obtener necesidades especiales del pasajero para incluirlas en la solicitud
    const passengerProfile = await passengerRepository.findById(passengerId).catch(() => null);
    const specialNeeds = (passengerProfile as any)?.special_needs ?? null;
    const specialCategories: string[] = specialNeeds?.categories ?? (specialNeeds?.category && specialNeeds.category !== 'none' ? [specialNeeds.category] : []);

    // Verificar si el pasajero es nuevo (< 3 viajes completados) y si la tarifa aplica
    const isNewPassenger = await discountRepository.isNewPassenger(passengerId).catch(() => false);
    const fareQualifies  = estimatedFare >= discountRepository.MIN_FARE;
    const discountEligible = isNewPassenger && fareQualifies;

    // Ofrecer viaje a cada conductor en orden de distancia (más cercano primero)
    for (const driver of candidates) {
      triedDriverIds.add(driver.id);

      // Verificar que el conductor sigue disponible
      const driverData = await driverRepository.findById(driver.id);
      if (!driverData?.is_online || driverData?.status !== 'active') continue;

      // Calcular estado del descuento para este conductor
      let discountType: 'automatic' | 'voluntary' | 'none' = 'none';
      if (discountEligible) {
        const discountStatus = await discountRepository.getDriverDiscountStatus(driver.id);
        if (discountStatus.canAutomatic) discountType = 'automatic';
        else if (discountStatus.canVoluntary) discountType = 'voluntary';
      }

      // Si es voluntario, enviar solicitud especial y esperar respuesta por separado
      if (discountType === 'voluntary') {
        emitToUser(driver.id, 'driver:voluntary_discount_request', {
          rideId,
          pickupAddress:  ride.pickup_address,
          dropoffAddress: ride.dropoff_address,
          estimatedFare,
          discountAmount: discountRepository.DISCOUNT_AMOUNT,
          driverEarnings: estimatedFare - discountRepository.DISCOUNT_AMOUNT,
          passengerName:  (passengerProfile as any)?.operative_code ?? (passengerProfile as any)?.name ?? null,
        });
        continue;
      }

      // Notificar al conductor via Socket.io
      const rideAny2 = ride as any;
      emitToUser(driver.id, 'driver:new_ride_request', {
        rideId,
        pickupAddress:  ride.pickup_address,
        dropoffAddress: ride.dropoff_address,
        pickupLat:  pickup.lat,
        pickupLng:  pickup.lng,
        serviceType,
        distanceFromDriver: Math.round((driver as unknown as { distance_meters: number }).distance_meters / 100) / 10,
        timeoutSeconds:     env.DRIVER_ACCEPT_TIMEOUT_SECONDS,
        estimatedFare,
        estimatedDriverEarnings: discountType === 'automatic'
          ? estimatedFare - discountRepository.DISCOUNT_AMOUNT
          : estimatedFare,
        tripDistanceKm,
        specialNeeds: specialCategories,
        passengerName:      (passengerProfile as any)?.operative_code ?? (passengerProfile as any)?.name ?? null,
        passengerPhotoUrl:  (passengerProfile as any)?.photo_url ?? null,
        passengerRating:    (passengerProfile as any)?.rating_avg ?? null,
        consecutiveRejections: driverData.consecutive_rejections ?? 0,
        isDiscountRide:     discountType === 'automatic',
        discountAmount:     discountType === 'automatic' ? discountRepository.DISCOUNT_AMOUNT : 0,
        // Encomienda / Delivery
        packageDescription: rideAny2.package_description ?? null,
        packageSize:        rideAny2.package_size        ?? null,
        senderName:         rideAny2.sender_name         ?? null,
        senderPhone:        rideAny2.sender_phone        ?? null,
        recipientName:      rideAny2.recipient_name      ?? null,
        recipientPhone:     rideAny2.recipient_phone     ?? null,
      });

      // Push al conductor (por si no tiene la app abierta)
      notificationRepository.getPrimaryToken(driver.id).then(token => {
        if (token) fcmService.notifyNewRideRequest(token, ride.pickup_address, estimatedFare);
      }).catch(() => {/* no bloquear */});

      // Marcar en Redis que este conductor está siendo esperado
      await redis.setex(
        `ride:pending:${rideId}`,
        env.DRIVER_ACCEPT_TIMEOUT_SECONDS + 5,
        driver.id
      );

      // Guardar flag de descuento para registrarlo cuando el conductor acepte
      if (discountType === 'automatic') {
        await redis.setex(`ride:discount:${rideId}`, env.DRIVER_ACCEPT_TIMEOUT_SECONDS + 60, 'automatic');
      }

      logger.info(`Viaje ${rideId}: ofrecido al conductor ${driver.id} (${radiusKm}km)`);
      // Incrementar contador de viajes ofrecidos
      driverRepository.incrementRidesOffered(driver.id).catch(() => {});

      // Esperar respuesta del conductor (timeout de 30s)
      const accepted = await waitForDriverResponse(rideId, driver.id);

      if (accepted) {
        // La asignación ya fue procesada en handleDriverResponse
        driverRepository.incrementRidesAccepted(driver.id).catch(() => {});
        return;
      }

      logger.info(`Conductor ${driver.id} no respondió o rechazó viaje ${rideId}`);
    }

    // Todos los conductores en este radio rechazaron/no respondieron
    currentRadiusIndex++;
    if (currentRadiusIndex < SEARCH_RADIUS_STEPS_KM.length) {
      const nextRadius = SEARCH_RADIUS_STEPS_KM[currentRadiusIndex]!;
      emitToUser(passengerId, 'passenger:search_radius', { radiusKm: nextRadius });
    }
  }

  // Sin conductores en ningún radio — notificar al pasajero
  await rideRepository.updateStatus(rideId, 'no_driver_found');
  emitToUser(passengerId, 'passenger:no_driver_found', { rideId });
  emitToAdmins('admin:ride_status_changed', { rideId, status: 'no_driver_found' });
  logger.info(`Viaje ${rideId}: ningún conductor disponible en ningún radio`);
}

// ────────────────────���────────────────
// Esperar respuesta del conductor (promesa con timeout)
// Resuelve true si el conductor aceptó, false si rechazó/timeout
// ─────────────────────────────────────
async function waitForDriverResponse(rideId: string, driverId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const checkInterval = 500;
    let elapsed = 0;
    let resolved = false;

    // Protección anti double-resolve: si el interval lanza varios callbacks concurrentes
    const safeResolve = (val: boolean) => {
      if (!resolved) { resolved = true; resolve(val); }
    };

    const interval = setInterval(async () => {
      elapsed += checkInterval;

      try {
        const pendingDriver = await redis.get(`ride:pending:${rideId}`);

        if (pendingDriver === null) {
          clearInterval(interval);
          try {
            const ride = await rideRepository.findById(rideId);
            safeResolve(ride?.driver_id === driverId && ride.status === 'driver_assigned');
          } catch {
            // Error de DB al verificar aceptación — asumir no aceptado
            safeResolve(false);
          }
          return;
        }

        if (elapsed >= DRIVER_ACCEPT_TIMEOUT_MS) {
          // Si el pasajero está revisando una contra-oferta, esperar hasta 5 minutos
          if (elapsed < 5 * 60 * 1000) {
            const rideNow = await rideRepository.findById(rideId).catch(() => null);
            if (rideNow?.status === 'price_negotiation') return;
          }
          clearInterval(interval);
          try { await redis.del(`ride:pending:${rideId}`); } catch { /* ignorar */ }
          safeResolve(false);
        }
      } catch (err) {
        // Error de Redis en este tick — logear y verificar timeout
        logger.error(`[waitForDriverResponse] Error Redis para viaje ${rideId}:`, err);
        if (elapsed >= DRIVER_ACCEPT_TIMEOUT_MS) {
          clearInterval(interval);
          safeResolve(false);
        }
      }
    }, checkInterval);
  });
}
