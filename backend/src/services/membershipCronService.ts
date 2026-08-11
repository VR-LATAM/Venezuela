// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Cron: sábados 00:01 AM (hora Venezuela UTC-4 = 04:01 UTC)
// Suspende conductores que no renovaron la membresía el viernes
// ═══════════════════════════════════════════════════════════════

import cron from 'node-cron';
import { membershipRepository } from '../repositories/membershipRepository';
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
  },

  /* Permite ejecutar manualmente desde admin si se necesita */
  runNow: runMembershipSuspension,
  runPenaltyReactivationNow: runPenaltyReactivation,
};
