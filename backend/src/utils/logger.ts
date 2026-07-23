// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Logger Winston — rotación diaria de logs
// ═══════════════════════════════════════════════════════════════

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Campos que nunca deben aparecer en logs
const PII_FIELDS = new Set([
  'email', 'phone', 'name', 'full_name', 'address', 'home_address',
  'pickup_address', 'dropoff_address', 'date_of_birth', 'license_number',
  'password', 'token', 'accessToken', 'refreshToken', 'authorization',
]);

// Patrones PII en strings libres
const EMAIL_RE    = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
const PHONE_RE    = /\b(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g;
const GPS_RE      = /(-?\d{1,3}\.\d{4,})/g;

function scrubValue(val: unknown): unknown {
  if (typeof val === 'string') {
    return val
      .replace(EMAIL_RE, '[EMAIL]')
      .replace(PHONE_RE, '[PHONE]')
      .replace(GPS_RE,   (m) => m.slice(0, 4) + '…');
  }
  if (val && typeof val === 'object') return scrubObject(val as Record<string, unknown>);
  return val;
}

function scrubObject(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = PII_FIELDS.has(k.toLowerCase()) ? '[REDACTED]' : scrubValue(v);
  }
  return out;
}

const piiScrubber = winston.format((info) => {
  const { level, message, timestamp: ts, stack, ...meta } = info;
  const cleanMeta = scrubObject(meta as Record<string, unknown>);
  const cleanMessage = typeof message === 'string'
    ? message.replace(EMAIL_RE, '[EMAIL]').replace(PHONE_RE, '[PHONE]')
    : message;
  return { ...cleanMeta, level, message: cleanMessage, timestamp: ts, stack };
});

const logFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `${ts} [${level}]: ${stack ?? message}`;
});

export const logger = winston.createLogger({
  level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    piiScrubber(),
    logFormat
  ),
  transports: [
    // Consola con colores en desarrollo
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
    }),
    // Archivo rotado diariamente (mantiene 14 días)
    new DailyRotateFile({
      filename: 'logs/veronaride-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '20m',
    }),
    // Errores en archivo separado
    new DailyRotateFile({
      filename: 'logs/errors-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
    }),
  ],
});
