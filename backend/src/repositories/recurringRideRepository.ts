// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { query, queryOne } from '../config/database';

export interface RecurringRide {
  id: string;
  passenger_id: string;
  nickname: string | null;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  service_type: string;
  days_of_week: number[];
  time_of_day: string;
  state_code: string;
  is_active: boolean;
  advance_hours: number;
  last_created_at: string | null;
  created_at: string;
}

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export const recurringRideRepository = {

  getByPassenger: (passengerId: string) =>
    query<RecurringRide>(
      `SELECT * FROM recurring_rides WHERE passenger_id = $1 ORDER BY created_at DESC`,
      [passengerId]
    ),

  getById: (id: string, passengerId: string) =>
    queryOne<RecurringRide>(
      `SELECT * FROM recurring_rides WHERE id = $1 AND passenger_id = $2`,
      [id, passengerId]
    ),

  create: async (data: {
    passengerId: string;
    nickname?: string;
    pickupAddress: string;
    pickupLat: number;
    pickupLng: number;
    dropoffAddress: string;
    dropoffLat: number;
    dropoffLng: number;
    serviceType: string;
    daysOfWeek: number[];
    timeOfDay: string;
    stateCode: string;
  }): Promise<RecurringRide> => {
    const row = await queryOne<RecurringRide>(
      `INSERT INTO recurring_rides
         (passenger_id, nickname, pickup_address, pickup_lat, pickup_lng,
          dropoff_address, dropoff_lat, dropoff_lng, service_type,
          days_of_week, time_of_day, state_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        data.passengerId, data.nickname ?? null,
        data.pickupAddress, data.pickupLat, data.pickupLng,
        data.dropoffAddress, data.dropoffLat, data.dropoffLng,
        data.serviceType, data.daysOfWeek, data.timeOfDay, data.stateCode,
      ]
    );
    return row!;
  },

  toggleActive: (id: string, passengerId: string, active: boolean) =>
    query(
      `UPDATE recurring_rides SET is_active = $3 WHERE id = $1 AND passenger_id = $2`,
      [id, passengerId, active]
    ),

  delete: (id: string, passengerId: string) =>
    query(
      `DELETE FROM recurring_rides WHERE id = $1 AND passenger_id = $2`,
      [id, passengerId]
    ),

  // Para el job: obtener recurrentes que deben crear viaje hoy
  getDueToday: () =>
    query<RecurringRide>(
      `SELECT * FROM recurring_rides
       WHERE is_active = TRUE
         AND EXTRACT(DOW FROM NOW()) = ANY(days_of_week)
         AND time_of_day::time > NOW()::time
         AND time_of_day::time <= (NOW() + INTERVAL '2 hours')::time
         AND (last_created_at IS NULL
              OR last_created_at::date < NOW()::date)`,
      []
    ),

  markCreated: (id: string) =>
    query(
      `UPDATE recurring_rides SET last_created_at = NOW() WHERE id = $1`,
      [id]
    ),

  formatDays: (days: number[]) =>
    days.sort().map(d => DAY_NAMES[d]).join(', '),
};
