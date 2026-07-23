// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { query, queryOne } from '../config/database';

export interface WaitlistEntry {
  id: string;
  passenger_id: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  dropoff_address: string;
  service_type: string;
  state_code: string | null;
  notified: boolean;
  expires_at: string;
  created_at: string;
}

export const waitlistRepository = {

  add: async (data: {
    passengerId: string;
    pickupLat: number;
    pickupLng: number;
    pickupAddress: string;
    dropoffAddress: string;
    serviceType: string;
    stateCode?: string;
  }): Promise<WaitlistEntry> => {
    const row = await queryOne<WaitlistEntry>(
      `INSERT INTO ride_waitlist
         (passenger_id, pickup_lat, pickup_lng, pickup_address, dropoff_address, service_type, state_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [data.passengerId, data.pickupLat, data.pickupLng, data.pickupAddress,
       data.dropoffAddress, data.serviceType, data.stateCode ?? null]
    );
    return row!;
  },

  getByPassenger: (passengerId: string) =>
    queryOne<WaitlistEntry>(
      `SELECT * FROM ride_waitlist
       WHERE passenger_id = $1 AND notified = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [passengerId]
    ),

  // Buscar pasajeros en espera cerca de donde un conductor se conectó
  getNearby: (lat: number, lng: number, radiusKm: number = 20) =>
    query<WaitlistEntry>(
      `SELECT * FROM ride_waitlist
       WHERE notified = FALSE AND expires_at > NOW()
         AND ST_Distance(
           ST_MakePoint(pickup_lng, pickup_lat)::geography,
           ST_MakePoint($2, $1)::geography
         ) <= $3 * 1000
       ORDER BY created_at ASC`,
      [lat, lng, radiusKm]
    ),

  markNotified: (id: string) =>
    query(`UPDATE ride_waitlist SET notified = TRUE WHERE id = $1`, [id]),

  remove: (passengerId: string) =>
    query(`DELETE FROM ride_waitlist WHERE passenger_id = $1`, [passengerId]),

  // Limpiar expirados (llamar en el cron)
  cleanExpired: () =>
    query(`DELETE FROM ride_waitlist WHERE expires_at < NOW()`, []),
};
