// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Validación de variables de entorno con Zod
// Falla al arrancar si falta alguna variable obligatoria
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),

  // Base de datos
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerida'),

  // Redis
  REDIS_URL: z.string().min(1, 'REDIS_URL es requerida'),

  // JWT
  JWT_SECRET: z.string().min(64, 'JWT_SECRET debe tener al menos 64 caracteres'),
  JWT_EXPIRES_IN: z.string().default('2h'),
  JWT_REFRESH_SECRET: z.string().min(64, 'JWT_REFRESH_SECRET debe tener al menos 64 caracteres'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Supabase Storage
  SUPABASE_URL: z.string().min(1, 'SUPABASE_URL es requerida'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY es requerida'),

  // Firebase Admin SDK — se acepta JSON completo en base64 o variables individuales
  FIREBASE_SERVICE_ACCOUNT_BASE64: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),

  // Google Maps
  GOOGLE_MAPS_API_KEY: z.string().min(1, 'GOOGLE_MAPS_API_KEY es requerida'),

  /* Stripe no se usa en Venezuela — pagos son Zelle, Binance, Pago Móvil */
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Encriptación PII (date_of_birth, home_address, license_number)
  // Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  DB_ENCRYPTION_KEY: z.string().min(32, 'DB_ENCRYPTION_KEY must be at least 32 characters').optional(),

  // Panel de administración
  ADMIN_PANEL_PASSWORD: z.string().min(8, 'ADMIN_PANEL_PASSWORD must be at least 8 characters').optional(),

  // Configuración de negocio (con valores por defecto)
  PLATFORM_COMMISSION_PERCENT: z.string().default('13').transform(Number),
  DRIVER_SEARCH_INITIAL_RADIUS_KM: z.string().default('10').transform(Number),
  DRIVER_SEARCH_MAX_RADIUS_KM: z.string().default('150').transform(Number),
  DRIVER_ACCEPT_TIMEOUT_SECONDS: z.string().default('30').transform(Number),
  PASSENGER_FREE_CANCEL_MINUTES: z.string().default('2').transform(Number),
  CANCELLATION_FEE_USD: z.string().default('3.00').transform(Number),
  DRIVER_MIN_WITHDRAWAL_USD: z.string().default('10.00').transform(Number),
  DRIVER_REFERRAL_BONUS_USD: z.string().default('600.00').transform(Number),
  DRIVER_REFERRAL_RIDES_REQUIRED: z.string().default('50').transform(Number),
  DRIVER_REFERRED_FIRST_RIDE_BONUS_USD: z.string().default('50.00').transform(Number),
  GPS_UPDATE_INTERVAL_SECONDS: z.string().default('4').transform(Number),

  // Twilio — SMS para notificaciones NEMT (opcional; si no está configurado se omite el SMS)
  TWILIO_ACCOUNT_SID:  z.string().optional(),
  TWILIO_AUTH_TOKEN:   z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3001,http://localhost:3002'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  RATE_LIMIT_AUTH_MAX: z.string().default('30').transform(Number),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
