// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio de referidos y bonos — todos los incentivos al conductor
//
// BONOS POR HITO (pago único, autofinanciados por comisiones):
//   $25  — Welcome bonus      al completar 50 viajes totales
//   $50  — Referral bonus     al completar 75 viajes (si fue referido)
//   $50  — World Cup bonus    al completar 150 viajes
//   $15  — Certification bonus al completar 50 viajes de un servicio certificado
//
// BONOS MENSUALES (cron el 1° de cada mes):
//   $50  — Performance bonus  al conductor con 100+ viajes/mes y rating ≥4.8
//   $50  — Referral monthly   al referidor por cada mes que su referido complete 100+ viajes
//          (máximo 12 meses → $600 total)
// ═══════════════════════════════════════════════════════════════

import cron from 'node-cron';
import { db } from '../config/database';
import { notificationRepository } from '../repositories/notificationRepository';
import { fcmService } from './fcmService';
import { logger } from '../utils/logger';

// ─────────────────────────────────────────────────────────────
// Helper — pagar un bono y actualizar balance del conductor
// ─────────────────────────────────────────────────────────────
async function payBonus(
  driverId: string,
  amount: number,
  type: string,
  description: string,
  notificationBody: string,
): Promise<void> {
  await Promise.all([
    db.query(
      `INSERT INTO driver_earnings (driver_id, type, gross_amount, platform_fee, net_amount, description)
       VALUES ($1, $2, $3, 0, $3, $4)`,
      [driverId, type, amount, description]
    ),
    db.query(
      `UPDATE drivers SET available_balance = available_balance + $1, total_earned = total_earned + $1 WHERE id = $2`,
      [amount, driverId]
    ),
  ]);

  notificationRepository.getPrimaryToken(driverId).then(token => {
    if (token) fcmService.sendToToken(token, {
      title: `💰 $${amount} bonus unlocked!`,
      body:  notificationBody,
      data:  { type, amount: String(amount) },
    });
  }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────
// Helper — verificar si un bono ya fue pagado a este conductor
// ─────────────────────────────────────────────────────────────
async function bonusAlreadyPaid(driverId: string, type: string): Promise<boolean> {
  const { rows } = await db.query(
    `SELECT id FROM driver_earnings WHERE driver_id = $1 AND type = $2 LIMIT 1`,
    [driverId, type]
  );
  return rows.length > 0;
}

export const referralService = {

  // ─────────────────────────────────────────────────────────────
  // Verificar bonos por hito al completar un viaje
  // Llamado desde rideService.completeRide con el total actualizado
  // ─────────────────────────────────────────────────────────────
  onRideCompleted: async (driverId: string, totalRides: number, serviceType: string): Promise<void> => {

    // ── Bono de bienvenida — $25 al completar 50 viajes ──
    if (totalRides === 50) {
      if (!await bonusAlreadyPaid(driverId, 'welcome_bonus')) {
        await payBonus(
          driverId, 25, 'welcome_bonus',
          'Welcome bonus: 50 trips completed',
          'You completed 50 trips! $25 welcome bonus added to your balance.'
        );
        logger.info(`Welcome bonus paid to driver ${driverId}`);
      }
    }

    // ── Bono de referido — $50 al completar 75 viajes (si fue referido) ──
    if (totalRides === 75) {
      const { rows: refs } = await db.query<{
        id: string;
        referrer_driver_id: string;
        first_ride_bonus_paid: boolean;
      }>(
        `SELECT id, referrer_driver_id, first_ride_bonus_paid
         FROM referrals
         WHERE referred_driver_id = $1 AND status IN ('pending', 'in_progress') AND first_ride_bonus_paid = false`,
        [driverId]
      );

      if (refs[0]) {
        await Promise.all([
          payBonus(
            driverId, 50, 'referral_first_bonus',
            'Referral bonus: 75 trips completed',
            'You completed 75 trips! $50 referral bonus added to your balance.'
          ),
          db.query(
            `UPDATE referrals SET first_ride_bonus_paid = true, status = 'in_progress' WHERE id = $1`,
            [refs[0].id]
          ),
        ]);
        logger.info(`Referral first bonus paid to referred driver ${driverId}`);
      }
    }

    // ── Bono Copa Mundial — $50 al completar 150 viajes ──
    if (totalRides === 150) {
      if (!await bonusAlreadyPaid(driverId, 'world_cup_bonus')) {
        await payBonus(
          driverId, 50, 'world_cup_bonus',
          'FIFA World Cup 2026 bonus: 150 trips completed',
          'Amazing! 150 trips completed. $50 FIFA World Cup 2026 bonus added to your balance!'
        );
        logger.info(`World Cup bonus paid to driver ${driverId}`);
      }
    }

    // ── Bono de certificación — $15 al completar 50 viajes de un servicio certificado ──
    if (serviceType && serviceType !== 'standard') {
      const certBonusType = `certification_bonus_${serviceType}`;
      if (!await bonusAlreadyPaid(driverId, certBonusType)) {
        // Verificar que el conductor tiene certificación activa para este servicio
        const { rows: cert } = await db.query(
          `SELECT id FROM driver_service_certifications
           WHERE driver_id = $1 AND service_type = $2 AND is_active = true LIMIT 1`,
          [driverId, serviceType]
        );
        if (cert[0]) {
          // Contar viajes completados de este tipo de servicio
          const { rows: tripCount } = await db.query<{ count: string }>(
            `SELECT COUNT(*) as count FROM rides
             WHERE driver_id = $1 AND service_type = $2 AND status = 'completed'`,
            [driverId, serviceType]
          );
          if (parseInt(tripCount[0]?.count ?? '0') >= 50) {
            await payBonus(
              driverId, 15, certBonusType,
              `Certification bonus: 50 ${serviceType} trips completed`,
              `50 ${serviceType} trips completed! $15 certification bonus added to your balance.`
            );
            logger.info(`Certification bonus (${serviceType}) paid to driver ${driverId}`);
          }
        }
      }
    }
  },

  // ─────────────────────────────────────────────────────────────
  // CRON MENSUAL — bonos de desempeño y referidos mensuales
  // Se ejecuta el 1° de cada mes a las 00:05
  // ─────────────────────────────────────────────────────────────
  startCron: (): void => {
    cron.schedule('5 0 1 * *', async () => {
      logger.info('Cron de bonos mensuales iniciado');
      try {
        // ── 1. Bono de desempeño ($50 por 100+ viajes con ≥4.8) ──
        const { rows: perfDrivers } = await db.query<{ id: string }>(
          `SELECT id FROM drivers
           WHERE rides_this_month >= 100
             AND rating_avg >= 4.8
             AND status = 'active'`
        );
        for (const driver of perfDrivers) {
          await db.query(
            `INSERT INTO driver_earnings (driver_id, type, gross_amount, platform_fee, net_amount, description)
             VALUES ($1, 'performance_bonus', 50, 0, 50, 'Monthly bonus: 100+ rides with rating ≥4.8')
             ON CONFLICT DO NOTHING`,
            [driver.id]
          );
          await db.query(
            `UPDATE drivers SET available_balance = available_balance + 50, total_earned = total_earned + 50 WHERE id = $1`,
            [driver.id]
          );
        }
        logger.info(`Performance bonuses paid to ${perfDrivers.length} drivers`);

        // ── 2. Bono mensual de referido ($50/mes cuando referido completa ≥100 viajes) ──
        const { rows: qualifyingRefs } = await db.query<{
          id: string;
          referrer_driver_id: string;
          referred_driver_id: string;
          rides_completed: number;
          rides_required: number;
        }>(
          `SELECT r.id, r.referrer_driver_id, r.referred_driver_id,
                  r.rides_completed, r.rides_required
           FROM referrals r
           JOIN drivers d ON d.id = r.referred_driver_id
           WHERE r.status = 'in_progress'
             AND d.rides_this_month >= 100`
        );

        for (const ref of qualifyingRefs) {
          await db.query(
            `INSERT INTO driver_earnings (driver_id, type, gross_amount, platform_fee, net_amount, description)
             VALUES ($1, 'referral_monthly_bonus', 50, 0, 50, 'Monthly referral bonus: referred driver completed 100+ rides')`,
            [ref.referrer_driver_id]
          );
          await db.query(
            `UPDATE drivers SET available_balance = available_balance + 50, total_earned = total_earned + 50 WHERE id = $1`,
            [ref.referrer_driver_id]
          );

          const { rows: updated } = await db.query<{ rides_completed: number; rides_required: number }>(
            `UPDATE referrals SET rides_completed = rides_completed + 1
             WHERE id = $1 RETURNING rides_completed, rides_required`,
            [ref.id]
          );

          const monthsDone = updated[0]?.rides_completed ?? 0;
          const monthsReq  = updated[0]?.rides_required  ?? 12;

          notificationRepository.getPrimaryToken(ref.referrer_driver_id).then(token => {
            if (token) fcmService.sendToToken(token, {
              title: '💰 $50 referral bonus!',
              body:  `Your referred driver completed month ${monthsDone}/${monthsReq}. $50 added to your balance.`,
              data:  { type: 'referral_monthly_bonus', amount: '50' },
            });
          }).catch(() => {});

          if (monthsDone >= monthsReq) {
            await db.query(
              `UPDATE referrals SET status = 'paid', completed_at = NOW() WHERE id = $1`,
              [ref.id]
            );
            notificationRepository.getPrimaryToken(ref.referrer_driver_id).then(token => {
              if (token) fcmService.sendToToken(token, {
                title: '🎉 Referral complete!',
                body:  'Your referred driver completed 12 qualifying months. You earned $600 total!',
                data:  { type: 'referral_complete', amount: '600' },
              });
            }).catch(() => {});
          }
        }
        logger.info(`Referral monthly bonuses paid to ${qualifyingRefs.length} referrers`);

        // ── 3. Resetear contador mensual ──
        await db.query(`UPDATE drivers SET rides_this_month = 0`);

      } catch (err) {
        logger.error('Error en cron de bonos mensuales:', err);
      }
    });

    logger.info('Cron de referidos y bonos iniciado');
  },
};
