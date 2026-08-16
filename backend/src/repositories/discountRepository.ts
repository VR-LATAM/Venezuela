import { query, queryOne } from '../config/database';

const NEW_PASSENGER_MAX       = 3;
const NEW_PASSENGER_DISCOUNT  = 1.00;
const NEW_PASSENGER_MIN_FARE  = 3.00;

const LOYALTY_CYCLE_SIZE      = 8;    // viajes regulares antes del descuento
const LOYALTY_MIN_FARE_TIER1  = 5.00;
const LOYALTY_MIN_FARE_TIER2  = 10.00;
const LOYALTY_DISCOUNT_TIER1  = 1.00;
const LOYALTY_DISCOUNT_TIER2  = 2.00;

const MIN_HOURS_BETWEEN = 96;
const MAX_PER_WEEK      = 2;
const MAX_PER_MONTH     = 5;

export const discountRepository = {

  /* Verdadero si el pasajero aún no ha usado sus 3 descuentos de bienvenida */
  isNewPassenger: async (passengerId: string): Promise<boolean> => {
    const row = await queryOne<{ new_passenger_discounts_used: number }>(
      `SELECT new_passenger_discounts_used FROM passengers WHERE id = $1`,
      [passengerId]
    );
    return (row?.new_passenger_discounts_used ?? 0) < NEW_PASSENGER_MAX;
  },

  /* Verdadero cuando el pasajero completó 8 viajes en el ciclo (el siguiente = descuento) */
  isLoyaltyRide: async (passengerId: string): Promise<boolean> => {
    const row = await queryOne<{ loyalty_cycle_rides: number }>(
      `SELECT loyalty_cycle_rides FROM passengers WHERE id = $1`,
      [passengerId]
    );
    return (row?.loyalty_cycle_rides ?? 0) === LOYALTY_CYCLE_SIZE;
  },

  /* $2 si tarifa >= $10, $1 si tarifa >= $5 */
  calculateLoyaltyDiscount: (fare: number): number => {
    if (fare >= LOYALTY_MIN_FARE_TIER2) return LOYALTY_DISCOUNT_TIER2;
    if (fare >= LOYALTY_MIN_FARE_TIER1) return LOYALTY_DISCOUNT_TIER1;
    return 0;
  },

  getDriverDiscountStatus: async (driverId: string): Promise<{
    last96h: number;
    thisWeek: number;
    thisMonth: number;
    canTake: boolean;
  }> => {
    const row = await queryOne<{ last96h: string; this_week: string; this_month: string }>(
      `SELECT
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '${MIN_HOURS_BETWEEN} hours') AS last96h,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('week',  NOW()))                    AS this_week,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))                    AS this_month
       FROM driver_discount_tracking
       WHERE driver_id = $1`,
      [driverId]
    );

    const last96h   = parseInt(row?.last96h   ?? '0', 10);
    const thisWeek  = parseInt(row?.this_week  ?? '0', 10);
    const thisMonth = parseInt(row?.this_month ?? '0', 10);

    const canTake = last96h < 1 && thisWeek < MAX_PER_WEEK && thisMonth < MAX_PER_MONTH;
    return { last96h, thisWeek, thisMonth, canTake };
  },

  recordDiscount: async (
    driverId: string,
    rideId: string,
    discountAmount: number,
    discountType: 'new_passenger' | 'loyalty'
  ): Promise<void> => {
    await query(
      `INSERT INTO driver_discount_tracking (driver_id, ride_id, is_voluntary) VALUES ($1, $2, FALSE)`,
      [driverId, rideId]
    );
    await query(
      `UPDATE rides SET new_passenger_discount = TRUE, discount_amount = $1, discount_type = $2 WHERE id = $3`,
      [discountAmount, discountType, rideId]
    );
  },

  NEW_PASSENGER_DISCOUNT,
  NEW_PASSENGER_MIN_FARE,
  LOYALTY_MIN_FARE_TIER1,
};
