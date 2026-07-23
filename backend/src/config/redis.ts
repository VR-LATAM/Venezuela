// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Cliente Redis — GPS en tiempo real + caché + sesiones + jobs
// Usa ioredis para Redis Pub/Sub (WebSockets a escala nacional)
// ═══════════════════════════════════════════════════════════════

import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

// Cliente principal para operaciones get/set/del
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  lazyConnect: true,
  // Reconexión automática en caso de caída
  retryStrategy: (times: number) => {
    if (times > 10) return null; // Dejar de reintentar después de 10 intentos
    return Math.min(times * 200, 5000); // Espera progresiva (max 5s)
  },
});

redis.on('connect', () => logger.info('✅ Redis conectado'));
redis.on('error', (err) => logger.error('❌ Error en Redis (main):', err));

// ─────────────────────────────────────
// PREFIJOS DE KEYS — organización del espacio de keys en Redis
// ─────────────────────────────────────
export const REDIS_KEYS = {
  // Posición GPS del conductor: "driver:location:{driverId}"
  // TTL: 10 segundos — si no hay update, se considera offline
  driverLocation: (driverId: string) => `driver:location:${driverId}`,

  // Conductores en línea por región (para búsqueda eficiente)
  // "drivers:online" — Set de driver IDs actualmente en línea
  driversOnline: 'drivers:online',

  // Refresh token del usuario: "refresh:{userId}"
  // TTL: 30 días
  refreshToken: (userId: string) => `refresh:${userId}`,

  // Estado del viaje en curso de un conductor (para prevenir doble asignación)
  // "driver:active_ride:{driverId}"
  driverActiveRide: (driverId: string) => `driver:active_ride:${driverId}`,

  // Solicitud de viaje en espera de aceptación: "ride:pending:{rideId}"
  // TTL: 30 segundos (timeout del conductor)
  ridePending: (rideId: string) => `ride:pending:${rideId}`,

  // Caché de configuración de estado (tarifas): "state:config:{stateCode}"
  // TTL: 1 hora (se invalida al editar desde el dashboard)
  stateConfig: (stateCode: string) => `state:config:${stateCode}`,

  // Sesión de socket del usuario: "socket:user:{userId}"
  userSocket: (userId: string) => `socket:user:${userId}`,

  // Cancelaciones del conductor en las últimas 24h: "driver:cancel_count:{driverId}"
  driverCancelCount: (driverId: string) => `driver:cancel_count:${driverId}`,

  // Suspensión del conductor: "driver:suspended:{driverId}"
  // TTL: 12 horas
  driverSuspended: (driverId: string) => `driver:suspended:${driverId}`,

  // Intentos fallidos de login admin por IP: "admin:fail:ip:{hash}"
  adminFailIP:    (ipHash: string) => `admin:fail:ip:${ipHash}`,
  // Intentos fallidos de login admin por email: "admin:fail:email:{hash}"
  adminFailEmail: (emailHash: string) => `admin:fail:email:${emailHash}`,
  // Bloqueo activo: "admin:lock:ip:{hash}" o "admin:lock:email:{hash}"
  adminLockIP:    (ipHash: string) => `admin:lock:ip:${ipHash}`,
  adminLockEmail: (emailHash: string) => `admin:lock:email:${emailHash}`,
} as const;

export const LOCKOUT = {
  MAX_ATTEMPTS:    5,
  WINDOW_SECONDS:  15 * 60,   // ventana de conteo: 15 min
  LOCK_SECONDS:    15 * 60,   // duración del bloqueo: 15 min
} as const;

// TTLs en segundos
export const REDIS_TTL = {
  DRIVER_LOCATION: env.GPS_UPDATE_INTERVAL_SECONDS * 2.5,  // 10s
  REFRESH_TOKEN: 30 * 24 * 60 * 60,                         // 30 días
  RIDE_PENDING: env.DRIVER_ACCEPT_TIMEOUT_SECONDS + 5,       // 35s
  STATE_CONFIG: 60 * 60,                                     // 1 hora
} as const;

export async function checkRedisConnection(): Promise<void> {
  try {
    await redis.ping();
    logger.info('✅ Redis conectado correctamente');
  } catch (err) {
    logger.error('❌ No se pudo conectar a Redis:', err);
    throw err;
  }
}
