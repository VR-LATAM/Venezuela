// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { query, queryOne } from '../config/database';

export interface RideTip {
  id: string;
  ride_id: string;
  passenger_id: string;
  driver_id: string;
  amount: number;
  stripe_payment_intent: string | null;
  status: string;
  created_at: string;
}

export const tipRepository = {
  create: async (data: {
    rideId: string;
    passengerId: string;
    driverId: string;
    amount: number;
    stripePaymentIntent?: string;
  }): Promise<RideTip> => {
    const row = await queryOne<RideTip>(
      `INSERT INTO ride_tips (ride_id, passenger_id, driver_id, amount, stripe_payment_intent)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.rideId, data.passengerId, data.driverId, data.amount, data.stripePaymentIntent ?? null]
    );
    return row!;
  },

  getByRide: (rideId: string) =>
    queryOne<RideTip>('SELECT * FROM ride_tips WHERE ride_id = $1', [rideId]),

  getTotalByDriver: async (driverId: string): Promise<number> => {
    const row = await queryOne<{ total: string }>(
      'SELECT COALESCE(SUM(amount), 0)::text AS total FROM ride_tips WHERE driver_id = $1 AND status = $2',
      [driverId, 'completed']
    );
    return parseFloat(row?.total ?? '0');
  },
};
