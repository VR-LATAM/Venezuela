// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Firebase Admin SDK — verificación de tokens + Cloud Messaging
// Inicializa una sola instancia (singleton pattern)
// ═══════════════════════════════════════════════════════════════

import admin from 'firebase-admin';
import { env } from './env';
import { logger } from '../utils/logger';

// Evitar inicializar múltiples veces (en hot-reload de desarrollo)
if (!admin.apps.length) {
  try {
    let credential: admin.credential.Credential;

    if (env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const serviceAccount = JSON.parse(
        Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
      );
      credential = admin.credential.cert(serviceAccount);
    } else {
      credential = admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID!,
        privateKey: env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        clientEmail: env.FIREBASE_CLIENT_EMAIL!,
      });
    }

    admin.initializeApp({
      credential,
      storageBucket: env.FIREBASE_STORAGE_BUCKET,
    });

    logger.info('✅ Firebase Admin SDK inicializado');
  } catch (err) {
    logger.error('❌ Firebase no inicializado — push notifications desactivadas:', err);
  }
}

export const firebaseAuth      = admin.apps.length ? admin.auth()      : null as unknown as ReturnType<typeof admin.auth>;
export const firebaseStorage   = admin.apps.length ? admin.storage()   : null as unknown as ReturnType<typeof admin.storage>;
export const firebaseMessaging = admin.apps.length ? admin.messaging() : null as unknown as ReturnType<typeof admin.messaging>;

// Verificar un ID Token de Firebase y devolver el UID del usuario
// Lanza error si el token es inválido, expirado o fue revocado
export async function verifyFirebaseToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  return firebaseAuth.verifyIdToken(idToken, true); // checkRevoked: true
}

// Enviar notificación push a un token FCM específico
export async function sendPushNotification(params: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  try {
    await firebaseMessaging.send({
      token: params.token,
      notification: {
        title: params.title,
        body: params.body,
      },
      data: params.data,
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'vride_notifications',
        },
      },
    });
  } catch (err) {
    // No lanzar error — fallo de push no debe interrumpir el flujo del viaje
    logger.warn('No se pudo enviar notificación push:', err);
  }
}

// Enviar notificación a múltiples tokens (multicast — max 500 por llamada)
export async function sendMulticastNotification(params: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  if (params.tokens.length === 0) return;

  try {
    const response = await firebaseMessaging.sendEachForMulticast({
      tokens: params.tokens.slice(0, 500),
      notification: { title: params.title, body: params.body },
      data: params.data,
      android: { priority: 'high' },
    });

    const failureCount = response.responses.filter(r => !r.success).length;
    if (failureCount > 0) {
      logger.warn(`${failureCount} notificaciones fallaron de ${params.tokens.length}`);
    }
  } catch (err) {
    logger.warn('Error en notificación multicast:', err);
  }
}
