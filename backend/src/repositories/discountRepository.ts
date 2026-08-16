import { query, queryOne } from '../config/database';

const CYCLE_LENGTH            = 8;
const NEW_PASSENGER_THRESHOLD = 3;
const NEW_PASSENGER_DISCOUNT  = 2.00;
const MIN_FARE_TIER1          = 5.00;
const MIN_FARE_TIER2          = 10.00;
const DISCOUNT_TIER1          = 1.00;
const DISCOUNT_TIER2          = 2.00;
const MIN_HOURS_BETWEEN       = 96;
const MAX_PER_WEEK            = 2;
const MAX_PER_MONTH           = 5;

export const discountRepository = {

  /* Verdadero si el pasajero tiene menos de 3 viajes completados (primeros 3 viajes = promo bienvenida) */
  isNewPassenger: async (passengerId: string): Promise<boolean> => {
    const row = await queryOne<{ total_rides: number }>(
      `SELECT total_rides FROM passengers WHERE id = $1`,
      [passengerId]
    );
    return (row?.total_rides ?? 0) < NEW_PASSENGER_THRESHOLD;
  },

  /* Verdadero cuando el pasajero está en la posición 7 (va a completar su 8vo viaje del ciclo) */
  isLoyaltyRide: async (passengerId: string): Promise<boolean> => {
    const row = await queryOne<{ loyalty_cycle_rides: number }>(
      `SELECT loyalty_cycle_rides FROM passengers WHERE id = $1`,
      [passengerId]
    );
    return (row?.loyalty_cycle_rides ?? 0) === CYCLE_LENGTH - 1;
  },

  /* $2 si la tarifa es >= $10, $1 si >= $5, $0 si no aplica */
  calculateDiscount: (fare: number): number => {
    if (fare >= MIN_FARE_TIER2) return DISCOUNT_TIER2;
    if (fare >= MIN_FARE_TIER1) return DISCOUNT_TIER1;
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

  recordDiscount: async (driverId: string, rideId: string, discountAmount: number): Promise<void> => {
    await query(
      `INSERT INTO driver_discount_tracking (driver_id, ride_id, is_voluntary) VALUES ($1, $2, FALSE)`,
      [driverId, rideId]
    );
    await query(
      `UPDATE rides SET new_passenger_discount = TRUE, discount_amount = $1 WHERE id = $2`,
      [discountAmount, rideId]
    );
  },

  /* Avanza el contador de ciclo del pasajero tras completar un viaje.
     Si fue viaje con descuento: resetea a 0 (el 8vo viaje no cuenta en el nuevo ciclo).
     Si fue regular: incrementa (de 0 a 6; al llegar a 7 el siguiente será el descuento). */
  advanceLoyaltyCycle: async (passengerId: string, wasDiscountRide: boolean): Promise<void> => {
    if (wasDiscountRide) {
      await query(`UPDATE passengers SET loyalty_cycle_rides = 0 WHERE id = $1`, [passengerId]);
    } else {
      await query(
        `UPDATE passengers
         SET loyalty_cycle_rides = LEAST(COALESCE(loyalty_cycle_rides, 0) + 1, $1)
         WHERE id = $2`,
        [CYCLE_LENGTH - 1, passengerId]
      );
    }
  },

  NEW_PASSENGER_DISCOUNT,
  MIN_FARE: MIN_FARE_TIER1,
};
