// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Repositorio de viajes programados
// Tabla: scheduled_rides
// El dispatcher (cron) consulta esta tabla cada minuto para despachar
// viajes cuyo scheduled_at esté dentro de los próximos 15 minutos
// ═══════════════════════════════════════════════════════════════

import { db, query, queryOne } from '../config/database';

export interface ScheduledRide {
  id:              string;
  passenger_id:    string;
  service_type:    string;
  pickup_address:  string;
  pickup_lat:      number;
  pickup_lng:      number;
  dropoff_address: string;
  dropoff_lat:     number;
  dropoff_lng:     number;
  scheduled_at:    Date;
  status:          'pending' | 'dispatching' | 'assigned' | 'cancelled' | 'completed';
  ride_id:         string | null;
  reminder_sent:   boolean;
  created_at:      Date;
}

const SELECT_BASE = `
  SELECT
    sr.*,
    ST_Y(sr.pickup_location::geometry)  AS pickup_lat,
    ST_X(sr.pickup_location::geometry)  AS pickup_lng,
    ST_Y(sr.dropoff_location::geometry) AS dropoff_lat,
    ST_X(sr.dropoff_location::geometry) AS dropoff_lng
  FROM scheduled_rides sr
`;

export const scheduledRideRepository = {

  create: async (params: {
    passengerId:    string;
    serviceType:    string;
    pickupAddress:  string;
    pickupLat:      number;
    pickupLng:      number;
    dropoffAddress: string;
    dropoffLat:     number;
    dropoffLng:     number;
    scheduledAt:    Date;
  }): Promise<ScheduledRide> => {
    const { rows } = await db.query<ScheduledRide>(
      `INSERT INTO scheduled_rides
         (passenger_id, service_type, pickup_address, pickup_location,
          dropoff_address, dropoff_location, scheduled_at)
       VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($5, $4), 4326)::geography,
               $6, ST_SetSRID(ST_MakePoint($8, $7), 4326)::geography, $9)
       RETURNING id, passenger_id, service_type, pickup_address, dropoff_address,
                 scheduled_at, status, ride_id, reminder_sent, created_at`,
      [
        params.passengerId,
        params.serviceType,
        params.pickupAddress,
        params.pickupLat, params.pickupLng,
        params.dropoffAddress,
        params.dropoffLat, params.dropoffLng,
        params.scheduledAt,
      ]
    );
    // Agregar coordenadas al resultado
    return { ...rows[0], pickup_lat: params.pickupLat, pickup_lng: params.pickupLng,
             dropoff_lat: params.dropoffLat, dropoff_lng: params.dropoffLng };
  },

  findById: async (id: string): Promise<ScheduledRide | null> => {
    const { rows } = await db.query<ScheduledRide>(
      `${SELECT_BASE} WHERE sr.id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  listByPassenger: async (passengerId: string): Promise<ScheduledRide[]> => {
    const { rows } = await db.query<ScheduledRide>(
      `${SELECT_BASE} WHERE sr.passenger_id = $1 ORDER BY sr.scheduled_at DESC`,
      [passengerId]
    );
    return rows;
  },

  cancel: async (id: string, passengerId: string): Promise<boolean> => {
    const { rowCount } = await db.query(
      `UPDATE scheduled_rides
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND passenger_id = $2 AND status = 'pending'`,
      [id, passengerId]
    );
    return (rowCount ?? 0) > 0;
  },

  // Devuelve los viajes que deben despacharse en los próximos 15 minutos
  // Se llama desde el cron cada minuto
  findDueForDispatch: async (): Promise<ScheduledRide[]> => {
    const { rows } = await db.query<ScheduledRide>(
      `${SELECT_BASE}
       WHERE sr.status = 'pending'
         AND sr.scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '15 minutes'
       ORDER BY sr.scheduled_at ASC`,
    );
    return rows;
  },

  // Marcar como 'dispatching' para evitar doble despacho (race condition entre replicas)
  markDispatching: async (id: string): Promise<boolean> => {
    const { rowCount } = await db.query(
      `UPDATE scheduled_rides SET status = 'dispatching', updated_at = NOW()
       WHERE id = $1 AND status = 'pending'`,
      [id]
    );
    return (rowCount ?? 0) > 0;
  },

  // Vincular el ride creado al viaje programado
  linkRide: async (scheduledId: string, rideId: string): Promise<void> => {
    await db.query(
      `UPDATE scheduled_rides SET status = 'assigned', ride_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [rideId, scheduledId]
    );
  },

  markCompleted: async (scheduledId: string): Promise<void> => {
    await db.query(
      `UPDATE scheduled_rides SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [scheduledId]
    );
  },

  // Recordatorio 30 minutos antes (marcar para no re-enviar)
  findDueForReminder: async (): Promise<ScheduledRide[]> => {
    const { rows } = await db.query<ScheduledRide>(
      `${SELECT_BASE}
       WHERE sr.status = 'pending'
         AND sr.reminder_sent = false
         AND sr.scheduled_at BETWEEN NOW() + INTERVAL '28 minutes' AND NOW() + INTERVAL '32 minutes'`,
    );
    return rows;
  },

  markReminderSent: async (id: string): Promise<void> => {
    await db.query(
      `UPDATE scheduled_rides SET reminder_sent = true WHERE id = $1`,
      [id]
    );
  },
};
