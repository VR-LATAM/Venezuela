// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Controlador de referidos — código, progreso y bonos
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import { sendSuccess } from '../utils/response';

export const referralController = {

  // GET /referral/me — código propio + lista de referidos + progreso
  getMyReferrals: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const driverId = req.user!.userId;

      // Código propio y stats del conductor
      const { rows: driverRows } = await db.query<{
        referral_code:     string;
        total_earned:      number;
        available_balance: number;
      }>(
        `SELECT referral_code, total_earned::float, available_balance::float FROM drivers WHERE id = $1`,
        [driverId]
      );

      const driver = driverRows[0];

      // Referidos activos con progreso
      const { rows: referrals } = await db.query<{
        referred_driver_id:   string;
        referred_name:        string;
        rides_completed:      number;
        rides_required:       number;
        status:               string;
        first_ride_bonus_paid: boolean;
        completed_at:         Date | null;
        created_at:           Date;
      }>(
        `SELECT r.referred_driver_id, u.name AS referred_name,
                r.rides_completed, r.rides_required, r.status,
                r.first_ride_bonus_paid, r.completed_at, r.created_at
         FROM referrals r
         JOIN users u ON u.id = r.referred_driver_id
         WHERE r.referrer_driver_id = $1
         ORDER BY r.created_at DESC`,
        [driverId]
      );

      // Ganancias de referidos
      const { rows: bonusRows } = await db.query<{ total: string }>(
        `SELECT COALESCE(SUM(net_amount), 0)::text AS total
         FROM driver_earnings WHERE driver_id = $1 AND type = 'referral_bonus'`,
        [driverId]
      );

      sendSuccess(res, {
        referralCode:    driver?.referral_code ?? null,
        referrals:       referrals.map(r => ({
          ...r,
          progressPercent: Math.min(100, Math.round((r.rides_completed / r.rides_required) * 100)),
        })),
        totalReferrals:  referrals.length,
        activeReferrals: referrals.filter(r => r.status === 'in_progress').length,
        totalBonusEarned: parseFloat(bonusRows[0]?.total ?? '0'),
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /referral/leaderboard — top 10 conductores con más referidos (incentivo)
  leaderboard: async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { rows } = await db.query<{
        driver_id:    string;
        driver_name:  string;
        total_refs:   string;
        completed_refs: string;
      }>(
        `SELECT r.referrer_driver_id AS driver_id,
                u.name AS driver_name,
                COUNT(*) AS total_refs,
                COUNT(*) FILTER (WHERE r.status IN ('completed','paid')) AS completed_refs
         FROM referrals r
         JOIN users u ON u.id = r.referrer_driver_id
         GROUP BY r.referrer_driver_id, u.name
         ORDER BY completed_refs DESC, total_refs DESC
         LIMIT 10`
      );

      sendSuccess(res, {
        leaderboard: rows.map((r, i) => ({
          rank:          i + 1,
          driverName:    r.driver_name,
          totalReferrals:    parseInt(r.total_refs),
          completedReferrals: parseInt(r.completed_refs),
        })),
      });
    } catch (err) {
      next(err);
    }
  },
};
