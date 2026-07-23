// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio SMS — notificaciones Twilio para viajes NEMT de clínica
// Solo activo si TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_PHONE_NUMBER están configurados
// ═══════════════════════════════════════════════════════════════

import { logger } from '../utils/logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null;

function getClient() {
  if (_client) return _client;
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _client = require('twilio')(sid, token);
  return _client;
}

export const smsService = {
  // Avisa al paciente que el conductor ya llegó afuera
  sendDriverArriving: async (
    patientPhone: string,
    driverName: string,
    patientName: string,
  ): Promise<void> => {
    const client = getClient();
    if (!client) {
      logger.warn('[SMS] Twilio not configured — skipping patient notification');
      return;
    }
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!from) {
      logger.warn('[SMS] TWILIO_PHONE_NUMBER not set — skipping SMS');
      return;
    }
    try {
      await client.messages.create({
        from,
        to: patientPhone,
        body: `Hi ${patientName}, your VeronaRide driver ${driverName} has arrived and is waiting outside. Please head out when you are ready.`,
      });
      logger.info(`[SMS] Arrival notification sent to ${patientPhone}`);
    } catch (err) {
      logger.error('[SMS] Failed to send arrival SMS:', err);
    }
  },
};
