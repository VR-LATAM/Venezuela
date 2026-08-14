// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Cron: sábados 00:01 AM (hora Venezuela UTC-4 = 04:01 UTC)
// Suspende conductores que no renovaron la membresía el viernes
// ═══════════════════════════════════════════════════════════════

import cron from 'node-cron';
import { membershipRepository } from '../repositories/membershipRepository';
import { fcmService } from './fcmService';
import { db } from '../config/database';
import { logger } from '../utils/logger';

async function runMembershipSuspension(): Promise<void> {
  logger.info('═══ SUSPENSIÓN DE MEMBRESÍAS INICIADA ═══');
  try {
    const suspended = await membershipRepository.expireAndSuspend();
    logger.info(`Membresías procesadas — conductores suspendidos: ${suspended}`);
  } catch (err) {
    logger.error('Error en suspensión de membresías:', err);
  }
  logger.info('═══ SUSPENSIÓN DE MEMBRESÍAS FINALIZADA ═══');
}

async function runWeeklyRejectionReset(): Promise<void> {
  try {
    await membershipRepository.resetWeeklyRejectionCounters();
    logger.info('Contadores de rechazos semanales reseteados');
  } catch (err) {
    logger.error('Error al resetear contadores de rechazos:', err);
  }
}

async function runMembershipPaymentReminder(): Promise<void> {
  try {
    const nowVE  = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Caracas' }));
    const dayVE  = nowVE.getDay();  // 4=jueves, 5=viernes
    const hourVE = nowVE.getHours();

    /* Solo enviar dentro de la ventana: jueves 12:00–23:00 o viernes 00:00–14:00 */
    const inWindow = (dayVE === 4 && hourVE >= 12) || (dayVE === 5 && hourVE < 14);
    if (!inWindow) return;

    const hoursLeft = dayVE === 4
      ? (24 - hourVE) + 14  /* horas que quedan hasta el viernes 14:00 */
      : 14 - hourVE;

    const { rows } = await db.query<{ token: string }>(
      `SELECT DISTINCT pt.token
       FROM push_tokens pt
       JOIN users u ON u.id = pt.user_id
       JOIN drivers d ON d.user_id = u.id
       WHERE d.status = 'active'
         AND d.membership_status NOT IN ('active', 'pending_approval')`
    );

    if (rows.length === 0) return;

    const tokens  = rows.map(r => r.token);
    const hoursMsg = hoursLeft === 1 ? '1 hora' : `${hoursLeft} horas`;

    await fcmService.sendToTokens(tokens, {
      title: '⚠️ Renueva tu membresía',
      body:  `Tienes ${hoursMsg} para pagar tu membresía antes del cierre del viernes a las 2:00 PM. Hazlo ahora para no perder tu acceso el sábado.`,
      data:  { screen: 'membership' },
    });

    logger.info(`Recordatorio membresía enviado a ${tokens.length} conductor(es) — ${hoursMsg} restantes`);
  } catch (err) {
    logger.error('Error en recordatorio de membresía:', err);
  }
}

async function runPenaltyReactivation(): Promise<void> {
  try {
    const reactivated = await membershipRepository.reactivatePenaltySuspended();
    if (reactivated > 0) {
      logger.info(`Penalidad: ${reactivated} conductor(es) reactivado(s) con días de crédito`);
    }
  } catch (err) {
    logger.error('Error en reactivación por penalidad:', err);
  }
}

export const membershipCronService = {
  startCron() {
    /* Sábado 04:01 UTC = 00:01 AM Venezuela (UTC-4) */
    cron.schedule('1 4 * * 6', runMembershipSuspension, { timezone: 'UTC' });
    logger.info('✅ Cron membresías programado — sábados 00:01 AM Venezuela');

    /* Sábado 04:00 UTC = 00:00 AM Venezuela — fin de semana viernes, resetear rechazos */
    cron.schedule('0 4 * * 6', runWeeklyRejectionReset, { timezone: 'UTC' });
    logger.info('✅ Cron rechazos programado — viernes 00:00 AM Venezuela (fin de semana)');

    /* Diario 04:05 UTC = 00:05 AM Venezuela — reactiva conductores suspendidos por penalidad */
    cron.schedule('5 4 * * *', runPenaltyReactivation, { timezone: 'UTC' });
    logger.info('✅ Cron reactivación penalidad programado — diario 00:05 AM Venezuela');

    /* Cada hora: jueves 12 PM → viernes 2 PM Venezuela — recordatorio de pago de membresía */
    cron.schedule('0 * * * *', runMembershipPaymentReminder, { timezone: 'America/Caracas' });
    logger.info('✅ Cron recordatorio membresía programado — jueves 12 PM → viernes 2 PM Venezuela');
  },

  /* Permite ejecutar manualmente desde admin si se necesita */
  runNow: runMembershipSuspension,
  runPenaltyReactivationNow: runPenaltyReactivation,
};
