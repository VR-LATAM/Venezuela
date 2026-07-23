// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio de pagos automáticos semanales — cada lunes 00:05 AM
//
// POR CADA VIAJE (13% comisión):
//   Pasajero paga:        $20.00  (ejemplo)
//   Conductor recibe:     $17.40  (87%)
//   Plataforma retiene:   $ 2.60  (13%)
//
// CADA LUNES — pago automático al conductor:
//   Balance bruto:        $17.40  (acumulado en la semana)
//   Fee de Stripe:        $ 0.29  (0.25% + $0.25 fijo)
//   Conductor recibe:     $17.11  (neto en su banco)
//   Plataforma absorbe:   $ 0.29  (el fee de Stripe sale de la plataforma)
//
// RESUMEN SEMANAL en logs:
//   → Cuánto se pagó a conductores (neto)
//   → Cuánto cobró Stripe
//   → Cuánto retuvo la plataforma (acumulado de comisiones del período)
// ═══════════════════════════════════════════════════════════════

import cron from 'node-cron';
import { db } from '../config/database';
import { stripeService } from './stripeService';
import { notificationRepository } from '../repositories/notificationRepository';
import { fcmService } from './fcmService';
import { logger } from '../utils/logger';

// Tarifa de Stripe Connect por payout: 0.25% + $0.25 fijo
function calcStripeFee(amount: number): number {
  return Math.round((amount * 0.0025 + 0.25) * 100) / 100;
}

async function runWeeklyPayout(): Promise<void> {
  logger.info('═══ PAGO SEMANAL AUTOMÁTICO INICIADO ═══');

  // 1. Obtener todos los conductores elegibles
  const { rows: drivers } = await db.query<{
    id:                     string;
    name:                   string;
    available_balance:      number;
    stripe_account_id:      string;
    stripe_account_verified: boolean;
  }>(
    `SELECT d.id, u.name, d.available_balance, d.stripe_account_id, d.stripe_account_verified
     FROM drivers d
     JOIN users u ON u.id = d.id
     WHERE d.available_balance >= 10
       AND d.stripe_account_id IS NOT NULL
       AND d.stripe_account_verified = true
       AND d.status = 'active'
     ORDER BY d.available_balance DESC`
  );

  if (drivers.length === 0) {
    logger.info('Pago semanal: sin conductores elegibles esta semana.');
    return;
  }

  // 2. Totales para el resumen final
  let totalGross       = 0;
  let totalStripeFees  = 0;
  let totalNet         = 0;
  let successCount     = 0;
  let failCount        = 0;

  // 3. Procesar cada conductor
  for (const driver of drivers) {
    const gross     = Math.round(driver.available_balance * 100) / 100;
    const stripeFee = calcStripeFee(gross);
    const net       = Math.round((gross - stripeFee) * 100) / 100;

    if (net <= 0) {
      logger.warn(`Pago omitido para ${driver.name} — balance insuficiente después del fee ($${gross})`);
      continue;
    }

    try {
      // Descontar balance inmediatamente (previene doble pago)
      const { rowCount } = await db.query(
        `UPDATE drivers
         SET available_balance = available_balance - $1
         WHERE id = $2 AND available_balance >= $1`,
        [gross, driver.id]
      );

      if ((rowCount ?? 0) === 0) {
        logger.warn(`Pago omitido para ${driver.name} — balance cambió antes del pago`);
        continue;
      }

      // Crear registro del retiro
      const { rows: [withdrawal] } = await db.query<{ id: string }>(
        `INSERT INTO driver_withdrawals (driver_id, amount, status, stripe_transfer_id)
         VALUES ($1, $2, 'processing', NULL)
         RETURNING id`,
        [driver.id, net] // guardamos el neto que recibirá el conductor
      );

      // Registrar el fee de Stripe como ganancia de plataforma
      await db.query(
        `INSERT INTO driver_earnings (driver_id, type, gross_amount, platform_fee, net_amount, description)
         VALUES ($1, 'weekly_payout_stripe_fee', $2, 0, $3, $4)`,
        [
          driver.id,
          gross,
          stripeFee,
          `Stripe fee for weekly payout — gross: $${gross.toFixed(2)}, fee: $${stripeFee.toFixed(2)}, net: $${net.toFixed(2)}`,
        ]
      );

      // Ejecutar payout en Stripe
      const payoutId = await stripeService.createPayout({
        stripeAccountId: driver.stripe_account_id,
        amountCents:     Math.round(net * 100),
        driverId:        driver.id,
      });

      // Actualizar registro con el ID de Stripe
      await db.query(
        `UPDATE driver_withdrawals SET stripe_transfer_id = $1 WHERE id = $2`,
        [payoutId, withdrawal.id]
      );

      totalGross      += gross;
      totalStripeFees += stripeFee;
      totalNet        += net;
      successCount++;

      logger.info(
        `✅ Pago enviado a ${driver.name}: bruto $${gross.toFixed(2)} · fee Stripe $${stripeFee.toFixed(2)} · neto $${net.toFixed(2)}`
      );

      // Notificación push al conductor
      notificationRepository.getPrimaryToken(driver.id).then(token => {
        if (token) fcmService.sendToToken(token, {
          title: '💰 Weekly payment sent!',
          body: `$${net.toFixed(2)} has been sent to your bank account. It will arrive in 1-3 business days.`,
          data: { type: 'weekly_payout', gross: String(gross), fee: String(stripeFee), net: String(net) },
        });
      }).catch(() => {});

    } catch (err) {
      failCount++;
      // Revertir el balance si Stripe falló
      await db.query(
        'UPDATE drivers SET available_balance = available_balance + $1 WHERE id = $2',
        [gross, driver.id]
      );
      logger.error(`❌ Pago fallido para ${driver.name} ($${gross}):`, err);
    }
  }

  // 4. Calcular lo que retuvo la plataforma en el período (comisiones de la semana)
  const { rows: [platformEarnings] } = await db.query<{ platform_revenue: string }>(
    `SELECT COALESCE(SUM(platform_commission), 0)::text AS platform_revenue
     FROM rides
     WHERE status = 'completed'
       AND completed_at >= NOW() - INTERVAL '7 days'`
  );
  const platformRevenue = parseFloat(platformEarnings?.platform_revenue ?? '0');

  // 5. Resumen final en logs
  logger.info(`
═══════════════════════════════════════════════
RESUMEN SEMANAL — ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
═══════════════════════════════════════════════
Conductores pagados:      ${successCount}
Conductores fallidos:     ${failCount}
───────────────────────────────────────────────
Total bruto pagado:       $${totalGross.toFixed(2)}
Total fee Stripe:         $${totalStripeFees.toFixed(2)}  (0.25% + $0.25 por pago)
Total neto a conductores: $${totalNet.toFixed(2)}
───────────────────────────────────────────────
Ingresos plataforma       $${platformRevenue.toFixed(2)}
(comisiones 13% últimos 7 días)
═══════════════════════════════════════════════
  `);
}

export const payoutService = {
  // Iniciar el cron de pagos semanales automáticos
  // Se ejecuta cada lunes a las 00:05 AM
  startCron: (): void => {
    cron.schedule('5 0 * * 1', async () => {
      try {
        await runWeeklyPayout();
      } catch (err) {
        logger.error('Error crítico en pago semanal automático:', err);
      }
    });
    logger.info('✅ Cron de pagos semanales iniciado — todos los lunes 00:05 AM');
  },

  // Para ejecutar manualmente desde el panel de admin si es necesario
  runNow: runWeeklyPayout,
};
