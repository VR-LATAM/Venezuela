// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { query, queryOne } from '../config/database';

export interface PassengerSubscription {
  id: string;
  passenger_id: string;
  plan: string;
  price_usd: number;
  discount_percent: number;
  stripe_subscription_id: string | null;
  status: 'active' | 'cancelled' | 'past_due';
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export const subscriptionRepository = {

  getByPassenger: (passengerId: string) =>
    queryOne<PassengerSubscription>(
      `SELECT * FROM passenger_subscriptions WHERE passenger_id = $1`,
      [passengerId]
    ),

  isActive: async (passengerId: string): Promise<boolean> => {
    const sub = await queryOne<{ status: string }>(
      `SELECT status FROM passenger_subscriptions
       WHERE passenger_id = $1 AND status = 'active'
         AND (current_period_end IS NULL OR current_period_end > NOW())`,
      [passengerId]
    );
    return !!sub;
  },

  create: async (data: {
    passengerId: string;
    stripeSubscriptionId?: string;
    periodStart?: string;
    periodEnd?: string;
  }): Promise<PassengerSubscription> => {
    const row = await queryOne<PassengerSubscription>(
      `INSERT INTO passenger_subscriptions
         (passenger_id, stripe_subscription_id, current_period_start, current_period_end)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (passenger_id) DO UPDATE
         SET status = 'active',
             stripe_subscription_id = EXCLUDED.stripe_subscription_id,
             current_period_start   = EXCLUDED.current_period_start,
             current_period_end     = EXCLUDED.current_period_end,
             cancelled_at           = NULL
       RETURNING *`,
      [data.passengerId, data.stripeSubscriptionId ?? null, data.periodStart ?? null, data.periodEnd ?? null]
    );
    return row!;
  },

  cancel: (passengerId: string) =>
    query(
      `UPDATE passenger_subscriptions
       SET status = 'cancelled', cancelled_at = NOW()
       WHERE passenger_id = $1`,
      [passengerId]
    ),

  updateStatus: (passengerId: string, status: string) =>
    query(
      `UPDATE passenger_subscriptions SET status = $2 WHERE passenger_id = $1`,
      [passengerId, status]
    ),

  getDiscount: async (passengerId: string): Promise<number> => {
    const sub = await queryOne<{ discount_percent: number }>(
      `SELECT discount_percent FROM passenger_subscriptions
       WHERE passenger_id = $1 AND status = 'active'
         AND (current_period_end IS NULL OR current_period_end > NOW())`,
      [passengerId]
    );
    return sub?.discount_percent ?? 0;
  },
};
