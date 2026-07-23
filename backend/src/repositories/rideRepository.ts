// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Repository de viajes — solo queries SQL, sin lógica de negocio
// Gestiona el ciclo de vida completo del viaje en la BD
// ═══════════════════════════════════════════════════════════════

import { query, queryOne } from '../config/database';
import { Ride, RideStatus } from '@vride/shared';

// Selección base — extrae coordenadas + datos del pasajero vía JOIN
const RIDE_BASE = `
  SELECT
    r.*,
    ST_Y(r.pickup_location::geometry)  AS pickup_lat,
    ST_X(r.pickup_location::geometry)  AS pickup_lng,
    ST_Y(r.dropoff_location::geometry) AS dropoff_lat,
    ST_X(r.dropoff_location::geometry) AS dropoff_lng,
    u.name      AS passenger_name,
    u.photo_url AS passenger_photo_url
  FROM rides r
  LEFT JOIN users u ON u.id = r.passenger_id
`;

export interface CreateRideParams {
  passengerId: string;
  serviceType: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  stateCode?: string;
  scheduledAt?: string;
  promoCode?: string;
  promoDiscount?: number;
  estimatedWaitMinutes?: number;
  hourlyPackageHours?: number;
}

export interface RideStop {
  id: string;
  ride_id: string;
  order_index: number;
  address: string;
  lat: number;
  lng: number;
  arrived_at: string | null;
}

export interface CompleteRideParams {
  distanceKm: number;
  durationMinutes: number;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeMultiplier: number;
  serviceMultiplier: number;
  subtotal: number;
  platformCommission: number;
  driverEarnings: number;
  totalCharged: number;
  routePolyline?: string;
  stripePaymentIntentId?: string;   // ID del PaymentIntent de Stripe
  paymentStatus?: 'completed' | 'failed' | 'pending'; // resultado del cobro
}

export const rideRepository = {
  // Crear nuevo viaje (estado inicial: 'searching')
  create: (params: CreateRideParams) =>
    queryOne<Ride>(
      `INSERT INTO rides (
         passenger_id, service_type,
         pickup_address, pickup_location,
         dropoff_address, dropoff_location,
         state_code, scheduled_at,
         promo_code, promo_discount,
         estimated_wait_minutes, hourly_package_hours
       ) VALUES (
         $1, $2,
         $3, ST_MakePoint($5, $4)::geography,
         $6, ST_MakePoint($8, $7)::geography,
         $9, $10, $11, $12, $13, $14
       ) RETURNING *,
         $4 AS pickup_lat, $5 AS pickup_lng,
         $7 AS dropoff_lat, $8 AS dropoff_lng`,
      [
        params.passengerId, params.serviceType,
        params.pickupAddress,
        params.pickupLat, params.pickupLng,
        params.dropoffAddress,
        params.dropoffLat, params.dropoffLng,
        params.stateCode ?? null,
        params.scheduledAt ?? null,
        params.promoCode ?? null,
        params.promoDiscount ?? 0,
        params.estimatedWaitMinutes ?? null,
        params.hourlyPackageHours ?? null,
      ]
    ),

  // Ride stops (paradas intermedias)
  addStop: (rideId: string, orderIndex: number, address: string, lat: number, lng: number) =>
    queryOne<RideStop>(
      `INSERT INTO ride_stops (ride_id, order_index, address, lat, lng) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [rideId, orderIndex, address, lat, lng]
    ),

  getStops: (rideId: string) =>
    query<RideStop>(
      'SELECT * FROM ride_stops WHERE ride_id = $1 ORDER BY order_index ASC',
      [rideId]
    ),

  markStopArrived: (stopId: string) =>
    query('UPDATE ride_stops SET arrived_at = NOW() WHERE id = $1', [stopId]),

  // Buscar viaje por ID (incluye coordenadas)
  findById: (id: string) =>
    queryOne<Ride & { pickup_lat: number; pickup_lng: number; dropoff_lat: number; dropoff_lng: number }>(
      `${RIDE_BASE} WHERE r.id = $1`,
      [id]
    ),

  // Viaje activo de un pasajero (estados pre-completado)
  findActiveByPassenger: (passengerId: string) =>
    queryOne<Ride>(
      `${RIDE_BASE}
       WHERE r.passenger_id = $1
         AND r.status NOT IN ('completed', 'cancelled_passenger', 'cancelled_driver', 'no_driver_found')
       ORDER BY r.created_at DESC
       LIMIT 1`,
      [passengerId]
    ),

  // Viaje activo de un conductor (asignado, en camino o en curso)
  findActiveByDriver: (driverId: string) =>
    queryOne<Ride>(
      `${RIDE_BASE}
       WHERE r.driver_id = $1
         AND r.status IN ('driver_assigned', 'driver_arriving', 'driver_arrived', 'in_progress')
       ORDER BY r.created_at DESC
       LIMIT 1`,
      [driverId]
    ),

  // Asignar conductor al viaje
  assignDriver: (rideId: string, driverId: string) =>
    queryOne<Ride>(
      `UPDATE rides
       SET driver_id = $1, status = 'driver_assigned',
           driver_assigned_at = NOW()
       WHERE id = $2
         AND status = 'searching'
       RETURNING *`,
      [driverId, rideId]
    ),

  // Cambiar estado del viaje (con timestamp automático según el estado)
  updateStatus: (rideId: string, status: RideStatus, extras?: {
    cancellationReason?: string;
    cancellationFee?: number;
    searchMaxRadiusKm?: number;
  }) => {
    // Mapeo de estados a columnas de timestamp que deben actualizarse
    const timestampColumn: Partial<Record<RideStatus, string>> = {
      driver_arriving:      'driver_assigned_at = NOW()',
      driver_arrived:       'driver_arrived_pickup_at = NOW()',
      in_progress:          'started_at = NOW()',
      completed:            'completed_at = NOW()',
      cancelled_passenger:  'cancelled_at = NOW()',
      cancelled_driver:     'cancelled_at = NOW()',
      no_driver_found:      'cancelled_at = NOW()',
    };

    const parts = [`status = $1`];
    const values: unknown[] = [status, rideId];
    let i = 3;

    if (timestampColumn[status]) {
      parts.push(timestampColumn[status]!);
    }
    if (extras?.cancellationReason) {
      parts.push(`cancellation_reason = $${i}`);
      values.push(extras.cancellationReason);
      i++;
    }
    if (extras?.cancellationFee !== undefined) {
      parts.push(`cancellation_fee = $${i}`);
      values.push(extras.cancellationFee);
      i++;
    }
    if (extras?.searchMaxRadiusKm !== undefined) {
      parts.push(`search_max_radius_km = $${i}`);
      values.push(extras.searchMaxRadiusKm);
      i++;
    }

    return queryOne<Ride>(
      `UPDATE rides SET ${parts.join(', ')} WHERE id = $2
       RETURNING *,
         ST_Y(pickup_location::geometry)  AS pickup_lat,
         ST_X(pickup_location::geometry)  AS pickup_lng,
         ST_Y(dropoff_location::geometry) AS dropoff_lat,
         ST_X(dropoff_location::geometry) AS dropoff_lng`,
      values
    );
  },

  // Completar viaje con todos los datos de tarifa calculados
  complete: (rideId: string, params: CompleteRideParams) =>
    queryOne<Ride>(
      `UPDATE rides SET
         status = 'completed',
         completed_at = NOW(),
         distance_km = $2,
         duration_minutes = $3,
         base_fare = $4,
         distance_fare = $5,
         time_fare = $6,
         surge_multiplier = $7,
         service_multiplier = $8,
         subtotal = $9,
         platform_commission = $10,
         driver_earnings = $11,
         total_charged = $12,
         route_polyline = $13,
         stripe_payment_intent_id = $14,
         payment_status = $15
       WHERE id = $1
       RETURNING *`,
      [
        rideId,
        params.distanceKm,
        params.durationMinutes,
        params.baseFare,
        params.distanceFare,
        params.timeFare,
        params.surgeMultiplier,
        params.serviceMultiplier,
        params.subtotal,
        params.platformCommission,
        params.driverEarnings,
        params.totalCharged,
        params.routePolyline ?? null,
        params.stripePaymentIntentId ?? null,
        params.paymentStatus ?? 'completed',
      ]
    ),

  // Registrar ganancia del conductor en tabla driver_earnings
  recordDriverEarning: (driverId: string, rideId: string, gross: number, fee: number, net: number) =>
    queryOne<{ id: string }>(
      `INSERT INTO driver_earnings (driver_id, ride_id, type, gross_amount, platform_fee, net_amount, description)
       VALUES ($1, $2, 'ride', $3, $4, $5, 'Ganancia por viaje completado')
       RETURNING id`,
      [driverId, rideId, gross, fee, net]
    ),

  // Registrar cargo por cancelación como ganancia del conductor (100% para el conductor)
  recordCancellationFeeEarning: (driverId: string, rideId: string, amount: number) =>
    queryOne<{ id: string }>(
      `INSERT INTO driver_earnings (driver_id, ride_id, type, gross_amount, platform_fee, net_amount, description)
       VALUES ($1, $2, 'cancellation_fee', $3, 0, $3, 'Compensación por cancelación tardía del pasajero')
       RETURNING id`,
      [driverId, rideId, amount]
    ),

  // Guardar el ID del PaymentIntent de hold (pre-autorización)
  setPaymentIntentId: (rideId: string, paymentIntentId: string) =>
    queryOne<{ id: string }>(
      `UPDATE rides SET stripe_payment_intent_id = $1 WHERE id = $2 RETURNING id`,
      [paymentIntentId, rideId]
    ),

  // Notas del conductor post-viaje
  setDriverNotes: (rideId: string, notes: string) =>
    query('UPDATE rides SET driver_notes = $1 WHERE id = $2', [notes, rideId]),

  // Actualizar métricas del conductor al completar un viaje
  updateDriverStats: (driverId: string, earnings: number) => {
    const safe = Number.isFinite(earnings) ? earnings : 0;
    return queryOne<{ id: string; total_rides: number }>(
      `UPDATE drivers SET
         total_rides        = total_rides + 1,
         rides_this_month   = rides_this_month + 1,
         total_earned       = CASE WHEN total_earned = 'NaN'       THEN $2 ELSE total_earned       + $2 END,
         available_balance  = CASE WHEN available_balance = 'NaN'  THEN $2 ELSE available_balance  + $2 END,
         consecutive_rejections = 0,
         updated_at = NOW()
       WHERE id = $1 RETURNING id, total_rides`,
      [driverId, safe]
    );
  },

  // Actualizar métricas del pasajero al completar un viaje
  updatePassengerStats: (passengerId: string) =>
    queryOne<{ id: string }>(
      `UPDATE passengers SET total_rides = total_rides + 1 WHERE id = $1 RETURNING id`,
      [passengerId]
    ),

  // Incrementar contador de rechazos del conductor (para alertas)
  incrementDriverRejections: (driverId: string) =>
    queryOne<{ consecutive_rejections: number }>(
      `UPDATE drivers SET consecutive_rejections = consecutive_rejections + 1
       WHERE id = $1
       RETURNING consecutive_rejections`,
      [driverId]
    ),

  // Guardar calificación (pasajero → conductor o conductor → pasajero)
  saveRating: (params: {
    rideId: string;
    raterId: string;
    ratedId: string;
    raterRole: 'passenger' | 'driver';
    score: number;
    comment?: string;
  }) =>
    queryOne<{ id: string }>(
      `INSERT INTO ratings (ride_id, rater_id, rated_id, rater_role, score, comment)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (ride_id, rater_role) DO UPDATE SET score = $5, comment = $6
       RETURNING id`,
      [params.rideId, params.raterId, params.ratedId, params.raterRole, params.score, params.comment ?? null]
    ),

  // Actualizar rating promedio del conductor
  updateDriverRating: (driverId: string) =>
    queryOne<{ rating_avg: number }>(
      `UPDATE drivers d
       SET rating_avg = (
         SELECT COALESCE(AVG(r.score::numeric), 5.0)
         FROM ratings r
         JOIN rides ri ON ri.id = r.ride_id
         WHERE ri.driver_id = d.id AND r.rater_role = 'passenger'
       )
       WHERE d.id = $1
       RETURNING rating_avg`,
      [driverId]
    ),

  // Actualizar rating promedio del pasajero
  updatePassengerRating: (passengerId: string) =>
    queryOne<{ rating_avg: number }>(
      `UPDATE passengers p
       SET rating_avg = (
         SELECT COALESCE(AVG(r.score::numeric), 5.0)
         FROM ratings r
         JOIN rides ri ON ri.id = r.ride_id
         WHERE ri.passenger_id = p.id AND r.rater_role = 'driver'
       )
       WHERE p.id = $1
       RETURNING rating_avg`,
      [passengerId]
    ),

  // Historial de viajes (pasajero o conductor)
  findHistory: (userId: string, role: 'passenger' | 'driver', limit = 20, offset = 0) =>
    query<Ride & { passenger_name?: string; driver_name?: string }>(
      `SELECT
         r.*,
         ST_Y(r.pickup_location::geometry)  AS pickup_lat,
         ST_X(r.pickup_location::geometry)  AS pickup_lng,
         ST_Y(r.dropoff_location::geometry) AS dropoff_lat,
         ST_X(r.dropoff_location::geometry) AS dropoff_lng,
         u_p.name AS passenger_name,
         u_d.name AS driver_name
       FROM rides r
       JOIN users u_p ON u_p.id = r.passenger_id
       LEFT JOIN users u_d ON u_d.id = r.driver_id
       WHERE r.${role}_id = $1
         AND r.status IN ('completed', 'cancelled_passenger', 'cancelled_driver', 'no_driver_found')
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
};
