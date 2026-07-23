// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio FCM — Firebase Cloud Messaging (push notifications)
// Usa el Admin SDK de Firebase ya inicializado en config/firebase.ts
// Soporta envío a token individual, a lista de tokens y a topic
// ═══════════════════════════════════════════════════════════════

import admin from 'firebase-admin';
import { logger } from '../utils/logger';

// Tipos locales para los payloads de notificación
export interface PushPayload {
  title:    string;
  body:     string;
  data?:    Record<string, string>; // FCM solo acepta strings en data
  imageUrl?: string;
}

export const fcmService = {

  // ─────────────────────────────────────────────────────────────
  // Enviar notificación a un token FCM individual
  // Retorna true si se envió correctamente
  // ─────────────────────────────────────────────────────────────
  sendToToken: async (token: string, payload: PushPayload): Promise<boolean> => {
    try {
      await admin.messaging().send({
        token,
        notification: {
          title:    payload.title,
          body:     payload.body,
          imageUrl: payload.imageUrl,
        },
        data:     payload.data ?? {},
        android: {
          priority: 'high',
          notification: {
            channelId: 'vride_default',
            priority:  'high',
            sound:     'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      });
      return true;
    } catch (err: unknown) {
      // No lanzar error — si el token es inválido, solo registrar
      const code = (err as { code?: string }).code;
      if (code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token') {
        logger.warn('Token FCM inválido o expirado', { token: token.slice(0, 20) });
        return false;
      }
      logger.error('Error enviando push FCM', { err });
      return false;
    }
  },

  // ─────────────────────────────────────────────────────────────
  // Enviar a múltiples tokens (multicast — hasta 500 tokens por llamada)
  // ─────────────────────────────────────────────────────────────
  sendToTokens: async (tokens: string[], payload: PushPayload): Promise<{
    successCount: number;
    failureCount: number;
    invalidTokens: string[];
  }> => {
    if (tokens.length === 0) return { successCount: 0, failureCount: 0, invalidTokens: [] };

    const invalidTokens: string[] = [];

    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: {
          title:    payload.title,
          body:     payload.body,
          imageUrl: payload.imageUrl,
        },
        data:    payload.data ?? {},
        android: {
          priority: 'high',
          notification: { channelId: 'vride_default', priority: 'high', sound: 'default' },
        },
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
        },
      });

      // Recolectar tokens inválidos para limpiarlos de la BD
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const code = resp.error?.code;
          if (code === 'messaging/registration-token-not-registered' ||
              code === 'messaging/invalid-registration-token') {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      return {
        successCount:  response.successCount,
        failureCount:  response.failureCount,
        invalidTokens,
      };
    } catch (err) {
      logger.error('Error en multicast FCM', { err });
      return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
    }
  },

  // ─────────────────────────────────────────────────────────────
  // Enviar a un topic (ej: 'drivers_TX' para todos los conductores de Texas)
  // ─────────────────────────────────────────────────────────────
  sendToTopic: async (topic: string, payload: PushPayload): Promise<boolean> => {
    try {
      await admin.messaging().send({
        topic,
        notification: {
          title:    payload.title,
          body:     payload.body,
          imageUrl: payload.imageUrl,
        },
        data:    payload.data ?? {},
        android: {
          priority: 'high',
          notification: { channelId: 'vride_default', priority: 'high', sound: 'default' },
        },
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
        },
      });
      return true;
    } catch (err) {
      logger.error('Error enviando a topic FCM', { topic, err });
      return false;
    }
  },

  // ─────────────────────────────────────────────────────────────
  // NOTIFICACIONES PREDEFINIDAS — métodos de conveniencia
  // Llamados desde rideService en los eventos clave del viaje
  // ─────────────────────────────────────────────────────────────

  notifyDriverAssigned: (token: string, driverName: string, vehicleInfo: string) =>
    fcmService.sendToToken(token, {
      title: '🚗 Conductor asignado',
      body:  `${driverName} está en camino — ${vehicleInfo}`,
      data:  { type: 'driver_assigned' },
    }),

  notifyDriverArrived: (token: string, driverName: string) =>
    fcmService.sendToToken(token, {
      title: '📍 Tu conductor llegó',
      body:  `${driverName} te está esperando en el punto de recogida`,
      data:  { type: 'driver_arrived' },
    }),

  notifyRideStarted: (token: string, dropoffAddress: string) =>
    fcmService.sendToToken(token, {
      title: '🚀 Viaje iniciado',
      body:  `En camino hacia ${dropoffAddress}`,
      data:  { type: 'ride_started' },
    }),

  notifyRideCompleted: (token: string, total: number, paymentOk: boolean) =>
    fcmService.sendToToken(token, {
      title: '✅ Viaje completado',
      body:  paymentOk
        ? `¡Llegaste! Se cobró $${total.toFixed(2)} a tu tarjeta.`
        : `¡Llegaste! Hubo un problema con el cobro de $${total.toFixed(2)}.`,
      data:  { type: 'ride_completed', total: total.toString() },
    }),

  notifyRideCancelled: (token: string, byRole: 'passenger' | 'driver') =>
    fcmService.sendToToken(token, {
      title: '❌ Viaje cancelado',
      body:  byRole === 'driver'
        ? 'El conductor canceló el viaje. Intentamos buscar otro.'
        : 'El pasajero canceló el viaje.',
      data:  { type: 'ride_cancelled', by: byRole },
    }),

  notifyEarningReceived: (token: string, amount: number) =>
    fcmService.sendToToken(token, {
      title: '💰 Nueva ganancia',
      body:  `Recibiste $${amount.toFixed(2)} por el viaje completado`,
      data:  { type: 'earning_received', amount: amount.toString() },
    }),

  notifyNewRideRequest: (token: string, pickupAddress: string, estimatedFare: number) =>
    fcmService.sendToToken(token, {
      title: '🔔 Nueva solicitud de viaje',
      body:  `Recogida en: ${pickupAddress} — ~$${estimatedFare.toFixed(2)}`,
      data:  { type: 'new_ride_request' },
    }),

  notifyTipReceived: (token: string, amount: number, passengerName: string) =>
    fcmService.sendToToken(token, {
      title: '🙏 Propina recibida',
      body:  `${passengerName} te dejó una propina de $${amount.toFixed(2)}`,
      data:  { type: 'tip_received', amount: amount.toString() },
    }),

  notifyDisputeResolved: (token: string, resolution: string) =>
    fcmService.sendToToken(token, {
      title: '✅ Disputa resuelta',
      body:  `Tu disputa fue resuelta: ${resolution.slice(0, 80)}`,
      data:  { type: 'dispute_resolved' },
    }),

  notifyScheduledRideReminder: (token: string, pickupAddress: string, minutesBefore: number) =>
    fcmService.sendToToken(token, {
      title: `⏰ Tu viaje comienza en ${minutesBefore} minutos`,
      body:  `Recogida en: ${pickupAddress}. Prepárate.`,
      data:  { type: 'scheduled_reminder', minutes: minutesBefore.toString() },
    }),

  notifyDocumentExpiry: (token: string, docType: string, daysLeft: number) =>
    fcmService.sendToToken(token, {
      title: daysLeft <= 0 ? `🚫 ${docType} VENCIDO` : `⚠️ ${docType} vence en ${daysLeft} días`,
      body:  daysLeft <= 0
        ? 'Tu cuenta será suspendida hasta que renueves el documento.'
        : 'Renueva tu documento para seguir activo en la plataforma.',
      data:  { type: 'document_expiry', doc: docType, days: daysLeft.toString() },
    }),

  notifyPaymentConfirmed: (token: string, amount: number, rideId: string) =>
    fcmService.sendToToken(token, {
      title: '💳 Pago confirmado',
      body:  `Se procesó correctamente el cobro de $${amount.toFixed(2)}`,
      data:  { type: 'payment_confirmed', amount: amount.toString(), rideId },
    }),

  notifyPromoApplied: (token: string, discount: number, code: string) =>
    fcmService.sendToToken(token, {
      title: '🎉 Código aplicado',
      body:  `Código "${code}" — ${discount}% de descuento en tu próximo viaje`,
      data:  { type: 'promo_applied', discount: discount.toString(), code },
    }),
};
