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
import { vipRepository } from '../repositories/vipRepository';
import { corporateRepository } from '../repositories/corporateRepository';
import { redis, REDIS_KEYS } from '../config/redis';
import { logger } from '../utils/logger';
import { FareEstimate, ServiceType, Ride, CANCELLATION } from '@vride/shared';
import { env } from '../config/env';
import { clinicRepository } from '../repositories/clinicRepository';
import { smsService } from './smsService';

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
export type CommissionTier = 'standard' | 'silver' | 'elite';

export interface DriverCommissionInfo {
  rate:          number;           // 0.19, 0.18 ó 0.17
  tier:          CommissionTier;
  ridesThisYear: number;
  ratingAvg:     number;
  nextTierRides: number | null;    // cuántos viajes faltan para el siguiente nivel
  nextTierRate:  number | null;
}

export async function getDriverCommissionInfo(driverId: string): Promise<DriverCommissionInfo> {
  const { rows } = await db.query<{
    rating_avg:     number;
    rides_this_year: string;
  }>(
    `SELECT
       d.rating_avg,
       COUNT(r.id)::text AS rides_this_year
     FROM drivers d
     LEFT JOIN rides r ON r.driver_id = d.id
       AND r.status = 'completed'
       AND r.completed_at >= date_trunc('year', NOW())
     WHERE d.id = $1
     GROUP BY d.rating_avg`,
    [driverId]
  );

  const ratingAvg     = Number(rows[0]?.rating_avg ?? 5);
  const ridesThisYear = parseInt(rows[0]?.rides_this_year ?? '0');
  const qualifies     = ratingAvg >= 4.75;

  if (qualifies && ridesThisYear >= 1500) {
    return { rate: 0.17, tier: 'elite',    ridesThisYear, ratingAvg, nextTierRides: null, nextTierRate: null };
  }
  if (qualifies && ridesThisYear >= 500) {
    return { rate: 0.18, tier: 'silver',   ridesThisYear, ratingAvg, nextTierRides: 1500 - ridesThisYear, nextTierRate: 0.17 };
  }
  return   { rate: 0.19, tier: 'standard', ridesThisYear, ratingAvg, nextTierRides: qualifies ? 500 - ridesThisYear : null, nextTierRate: qualifies ? 0.18 : null };
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
  }): Promise<FareEstimate> => {
    return calculateFareEstimate({
      ...params,
      driverEtaMinutes: undefined, // Sin ETA hasta asignar conductor
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
    let estimatedFare = 0;
    let tripDistanceMiles = 0;
    try {
      const fareEstimate = await calculateFareEstimate({
        pickupLat:   params.pickupLat,
        pickupLng:   params.pickupLng,
        dropoffLat:  params.dropoffLat,
        dropoffLng:  params.dropoffLng,
        serviceType: params.serviceType as ServiceType,
        stateCode:   params.stateCode ?? 'DC',
      });
      estimatedFare     = fareEstimate.total * vipMultiplier;
      tripDistanceMiles = fareEstimate.distance_miles;
    } catch {
      // Si falla el cálculo continuar sin hold
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
             priority_dispatch, vip_multiplier, status
           ) VALUES (
             $1, $2, $3, ST_SetSRID(ST_MakePoint($5,$4),4326),
             $6, ST_SetSRID(ST_MakePoint($8,$7),4326), $9, $10,
             $11, $12, $13, $14,
             $15, $16, $17, $18, $19, 'searching'
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
            params.stateCode ?? 'TX', params.scheduledAt ?? null,
            params.promoCode ?? null, params.promoDiscount ?? null,
            params.estimatedWaitMinutes ?? null, params.hourlyPackageHours ?? null,
            passengerTier, corporateAccountId, preferredDriverId,
            priorityDispatch, vipMultiplier,
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
    }, params.serviceType, params.passengerId, estimatedFare, tripDistanceMiles)
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
      // Conductor rechazó — limpiar pending e incrementar contador
      await redis.del(`ride:pending:${rideId}`);
      await rideRepository.incrementDriverRejections(driverId);
      logger.info(`Conductor ${driverId} rechazó viaje ${rideId}`);
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
      driver: {
        id: driver?.id,
        name: driver?.name,
        photo_url: driver?.photo_url,
        rating_avg: driver?.rating_avg,
        vehicle_brand: driver?.vehicle_brand,
        vehicle_model: driver?.vehicle_model,
        vehicle_color: driver?.vehicle_color,
        vehicle_plate: driver?.vehicle_plate,
      },
    });

    // Para viajes NEMT de clínica: incluir teléfono del paciente para que el conductor pueda llamar
    const clinicRequest = await clinicRepository.findByRideId(rideId);

    // Notificar al conductor: info del pasajero
    emitToUser(driverId, 'driver:passenger_assigned', {
      rideId,
      passenger: {
        id:            passenger?.id,
        name:          clinicRequest ? clinicRequest.patient_name : passenger?.name,
        photo_url:     passenger?.photo_url,
        patient_phone: clinicRequest?.patient_phone ?? null,
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
    const driverEarnings = Math.round(fareEstimate.total * (1 - commissionRate) * 100) / 100;
    const platformFee    = Math.round((fareEstimate.total * commissionRate - loyaltyDiscount) * 100) / 100;
    const totalCharged   = Math.round((fareEstimate.total - loyaltyDiscount) * 100) / 100;

    if (loyaltyDiscount > 0) {
      logger.info(`Loyalty 10% discount: $${loyaltyDiscount} for passenger ${ride.passenger_id} (week:${ridesThisWeek} month:${ridesThisMonth})`);
    }
    logger.info(`Commission for driver ${driverId}: ${commissionRate * 100}% (tier:${commissionInfo.tier} rides:${commissionInfo.ridesThisYear} rating:${commissionInfo.ratingAvg})`);

    // ── Cobrar al pasajero vía Stripe ─────────────────────────────────────────
    // Si hay un hold previo → capturar. Si no → cobrar directo.
    let stripePaymentIntentId: string | undefined;
    let paymentStatus: 'completed' | 'failed' | 'pending' = 'pending';

    try {
      const actualAmountCents = Math.round(totalCharged * 100);
      const existingHoldId    = (ride as any).stripe_payment_intent_id as string | null;

      if (existingHoldId) {
        // Capturar el hold pre-autorizado
        const capture = await stripeService.captureRide({
          paymentIntentId: existingHoldId,
          amountCents:     actualAmountCents,
        });
        stripePaymentIntentId = existingHoldId;
        paymentStatus = capture.status === 'succeeded' ? 'completed' : 'failed';
        logger.info(`Hold capturado para viaje ${rideId}: ${capture.status}`);
      } else {
        // Sin hold — cobrar directamente (fallback para viajes legacy)
        const [stripeCustomerId, defaultCard] = await Promise.all([
          paymentRepository.getStripeCustomerId(ride.passenger_id),
          paymentRepository.getDefault(ride.passenger_id),
        ]);
        if (stripeCustomerId && defaultCard) {
          const charge = await stripeService.chargeRide({
            stripeCustomerId,
            paymentMethodId: defaultCard.stripe_payment_method_id,
            amountCents:     actualAmountCents,
            rideId,
            passengerName:   ride.passenger_id,
          });
          stripePaymentIntentId = charge.paymentIntentId;
          paymentStatus = charge.status === 'succeeded' ? 'completed' : 'failed';
        }
      }
    } catch (err) {
      logger.error('Fallo en cobro Stripe al completar viaje', { rideId, err });
      paymentStatus = 'failed';
    }

    // Completar viaje + registrar ganancia en una sola transacción (atómico)
    // Si el UPDATE del ride falla, la ganancia no se registra (y viceversa)
    const { completedRide, driverStats } = await withTransaction(async (client) => {
      const [updated] = await Promise.all([
        client.query<Ride>(
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
            fareEstimate.distance_miles, fareEstimate.duration_minutes,
            fareEstimate.base_fare, fareEstimate.distance_fare, fareEstimate.time_fare,
            fareEstimate.surge_multiplier, fareEstimate.service_multiplier,
            fareEstimate.subtotal, platformFee,
            driverEarnings, fareEstimate.total,
            stripePaymentIntentId ?? null, paymentStatus,
          ]
        ),
        client.query(
          `INSERT INTO driver_earnings (driver_id, ride_id, type, gross_amount, platform_fee, net_amount, description)
           VALUES ($1, $2, 'ride', $3, $4, $5, 'Ganancia por viaje completado')`,
          [driverId, rideId, fareEstimate.total, platformFee, driverEarnings]
        ),
      ]);

      const completedRide = updated.rows[0];
      if (!completedRide) throw new Error('RIDE_NOT_FOUND');

      const [statsResult] = await Promise.all([
        client.query<{ total_rides: number }>(
          `UPDATE drivers SET total_rides = COALESCE(total_rides,0)+1,
             available_balance = COALESCE(available_balance,0)+$2
           WHERE id = $1 RETURNING total_rides`,
          [driverId, driverEarnings]
        ),
        client.query(
          `UPDATE passengers SET total_rides = COALESCE(total_rides,0)+1 WHERE id = $1`,
          [ride.passenger_id]
        ),
      ]);

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

    // Limpiar estado del conductor en Redis
    await redis.del(REDIS_KEYS.driverActiveRide(driverId));

    // Notificar al pasajero con el monto cobrado (socket + push)
    emitToUser(ride.passenger_id, 'passenger:ride_completed', {
      rideId,
      totalCharged: fareEstimate.total,
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

    return completedRide;
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

    // Cobro por cancelación tardía (solo aplica al pasajero)
    // Se cobra si el conductor ya llegó, o si pasaron más de FREE_WINDOW_MINUTES desde la asignación
    let cancellationFee: number | undefined;
    if (role === 'passenger') {
      const driverArrived = ride.status === 'driver_arrived';
      const pastFreeWindow = (() => {
        if (!ride.driver_assigned_at) return false;
        const assignedMs = new Date(ride.driver_assigned_at).getTime();
        const elapsedMinutes = (Date.now() - assignedMs) / 60_000;
        return elapsedMinutes > CANCELLATION.FREE_WINDOW_MINUTES;
      })();

      if (driverArrived || pastFreeWindow) {
        cancellationFee = CANCELLATION.FEE_USD;

        // 1. Cobrar al pasajero (fallo silencioso — el viaje se cancela igual)
        try {
          const [stripeCustomerId, defaultCard, passenger] = await Promise.all([
            paymentRepository.getStripeCustomerId(ride.passenger_id),
            paymentRepository.getDefault(ride.passenger_id),
            passengerRepository.findById(ride.passenger_id),
          ]);
          if (stripeCustomerId && defaultCard) {
            await stripeService.chargeRide({
              stripeCustomerId,
              paymentMethodId: defaultCard.stripe_payment_method_id,
              amountCents:     Math.round(CANCELLATION.FEE_USD * 100),
              rideId,
              passengerName:   passenger?.name ?? 'Pasajero',
            });
          }
        } catch (err) {
          logger.warn(`Cancellation fee charge failed for ride ${rideId}`, err);
        }

        // 2. Acreditar al conductor (siempre, independiente del cobro)
        if (ride.driver_id) {
          try {
            await Promise.all([
              rideRepository.recordCancellationFeeEarning(ride.driver_id, rideId, CANCELLATION.FEE_USD),
              rideRepository.updateDriverStats(ride.driver_id, CANCELLATION.FEE_USD),
            ]);
            // Transferir a Stripe Connect si el conductor tiene cuenta verificada
            const driverStripeInfo = await paymentRepository.getDriverStripeInfo(ride.driver_id);
            if (driverStripeInfo?.stripe_account_id && driverStripeInfo.stripe_account_verified) {
              await stripeService.transferToDriver({
                stripeAccountId: driverStripeInfo.stripe_account_id,
                amountCents:     Math.round(CANCELLATION.FEE_USD * 100),
                rideId,
                driverId:        ride.driver_id,
              });
            }
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

    // Liberar el hold de Stripe si existe y no se cobró la tarifa de cancelación
    const holdId = (ride as any).stripe_payment_intent_id as string | null;
    if (holdId && !cancellationFee) {
      stripeService.releaseHold(holdId).catch(err =>
        logger.warn(`No se pudo liberar hold ${holdId} para viaje ${rideId}`, err)
      );
    }

    // Limpiar Redis si hay conductor asignado
    if (ride.driver_id) {
      await redis.del(REDIS_KEYS.driverActiveRide(ride.driver_id));
      // Notificar al conductor si el pasajero cancela
      if (role === 'passenger') {
        emitToUser(ride.driver_id, 'driver:ride_cancelled', { rideId, reason, cancellationFee });
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
  tripDistanceMiles: number = 0
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

    // Buscar conductores disponibles en el radio (PostGIS ST_DWithin)
    let nearbyDrivers = await driverRepository.findNearby(
      pickup.lng, pickup.lat,
      radiusKm * 1000,
      serviceType,
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

    // Ofrecer viaje a cada conductor en orden de distancia (más cercano primero)
    for (const driver of candidates) {
      triedDriverIds.add(driver.id);

      // Verificar que el conductor sigue disponible
      const driverData = await driverRepository.findById(driver.id);
      if (!driverData?.is_online || driverData?.status !== 'active') continue;

      // Notificar al conductor via Socket.io
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
        estimatedDriverEarnings: Math.round(estimatedFare * 0.87 * 100) / 100,
        tripDistanceMiles,
        specialNeeds: specialCategories,
        passengerName:      (passengerProfile as any)?.name      ?? null,
        passengerPhotoUrl:  (passengerProfile as any)?.photo_url ?? null,
        passengerRating:    (passengerProfile as any)?.rating_avg ?? null,
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
