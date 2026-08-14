import { query, queryOne } from '../config/database';

const DISCOUNT_AMOUNT = 2.00;
const MIN_FARE        = 5.00;
const MAX_PER_48H     = 1;
const MAX_PER_WEEK    = 3;
const MAX_PER_MONTH   = 5;
const NEW_PASSENGER_THRESHOLD = 3;

export const discountRepository = {

  isNewPassenger: async (passengerId: string): Promise<boolean> => {
    const row = await queryOne<{ total_rides: number }>(
      `SELECT total_rides FROM passengers WHERE id = $1`,
      [passengerId]
    );
    return (row?.total_rides ?? 0) < NEW_PASSENGER_THRESHOLD;
  },

  getDriverDiscountStatus: async (driverId: string): Promise<{
    last48h: number;
    thisWeek: number;
    thisMonth: number;
    canAutomatic: boolean;
    canVoluntary: boolean;
  }> => {
    const row = await queryOne<{ last48h: string; this_week: string; this_month: string }>(
      `SELECT
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '48 hours') AS last48h,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('week', NOW()))    AS this_week,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))   AS this_month
       FROM driver_discount_tracking
       WHERE driver_id = $1`,
      [driverId]
    );

    const last48h   = parseInt(row?.last48h   ?? '0', 10);
    const thisWeek  = parseInt(row?.this_week  ?? '0', 10);
    const thisMonth = parseInt(row?.this_month ?? '0', 10);

    const withinLimits = last48h < MAX_PER_48H && thisWeek < MAX_PER_WEEK;
    const canAutomatic = withinLimits && thisMonth < MAX_PER_MONTH;
    const canVoluntary = withinLimits && thisMonth >= MAX_PER_MONTH;

    return { last48h, thisWeek, thisMonth, canAutomatic, canVoluntary };
  },

  recordDiscount: async (driverId: string, rideId: string, isVoluntary: boolean): Promise<void> => {
    await query(
      `INSERT INTO driver_discount_tracking (driver_id, ride_id, is_voluntary) VALUES ($1, $2, $3)`,
      [driverId, rideId, isVoluntary]
    );
    await query(
      `UPDATE rides SET new_passenger_discount = TRUE, discount_amount = $1 WHERE id = $2`,
      [DISCOUNT_AMOUNT, rideId]
    );
  },

  DISCOUNT_AMOUNT,
  MIN_FARE,
};
