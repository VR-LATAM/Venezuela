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

export const membershipCronService = {
  startCron() {
    /* Sábado 04:01 UTC = 00:01 AM Venezuela (UTC-4) */
    cron.schedule('1 4 * * 6', runMembershipSuspension, { timezone: 'UTC' });
    logger.info('✅ Cron membresías programado — sábados 00:01 AM Venezuela');
  },

  /* Permite ejecutar manualmente desde admin si se necesita */
  runNow: runMembershipSuspension,
};
