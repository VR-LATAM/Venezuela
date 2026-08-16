// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Controlador de autenticación — delega toda la lógica al authService
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { authService } from '../services/authService';
import { auditRepository } from '../repositories/auditRepository';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { logger } from '../utils/logger';
import { query, queryOne } from '../config/database';
import { generateMfaSetupToken } from '../utils/jwt';
import { redis, REDIS_KEYS, LOCKOUT } from '../config/redis';

// Hashea IP o email para no almacenar PII en Redis
const hashForLock = (s: string) =>
  crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

async function isLocked(ip: string, email: string): Promise<{ locked: boolean; ttl: number }> {
  const [lockIP, lockEmail] = await Promise.all([
    redis.ttl(REDIS_KEYS.adminLockIP(hashForLock(ip))),
    redis.ttl(REDIS_KEYS.adminLockEmail(hashForLock(email))),
  ]);
  const ttl = Math.max(lockIP, lockEmail);
  return { locked: ttl > 0, ttl };
}

async function recordFailure(ip: string, email: string): Promise<void> {
  const ipKey    = REDIS_KEYS.adminFailIP(hashForLock(ip));
  const emailKey = REDIS_KEYS.adminFailEmail(hashForLock(email));

  const [ipCount, emailCount] = await Promise.all([
    redis.incr(ipKey),
    redis.incr(emailKey),
  ]);
  await Promise.all([
    redis.expire(ipKey,    LOCKOUT.WINDOW_SECONDS),
    redis.expire(emailKey, LOCKOUT.WINDOW_SECONDS),
  ]);

  if (ipCount >= LOCKOUT.MAX_ATTEMPTS) {
    await redis.setex(REDIS_KEYS.adminLockIP(hashForLock(ip)), LOCKOUT.LOCK_SECONDS, '1');
  }
  if (emailCount >= LOCKOUT.MAX_ATTEMPTS) {
    await redis.setex(REDIS_KEYS.adminLockEmail(hashForLock(email)), LOCKOUT.LOCK_SECONDS, '1');
  }
}

async function clearFailures(ip: string, email: string): Promise<void> {
  await Promise.all([
    redis.del(REDIS_KEYS.adminFailIP(hashForLock(ip))),
    redis.del(REDIS_KEYS.adminFailEmail(hashForLock(email))),
    redis.del(REDIS_KEYS.adminLockIP(hashForLock(ip))),
    redis.del(REDIS_KEYS.adminLockEmail(hashForLock(email))),
  ]);
}

// Schemas de validación Zod para cada endpoint
const PASSENGER_CATEGORIES = [
  'elderly', 'pregnant', 'post_surgery', 'wheelchair',
  'visual_impairment', 'hearing_impairment', 'cognitive', 'with_minor',
  'medical_equipment', 'none',
] as const;

const registerPassengerSchema = z.object({
  firebaseToken:         z.string().min(1, 'Firebase token is required'),
  name:                  z.string().min(2, 'Name is too short').max(100),
  phone:                 z.string().optional(),
  language:              z.enum(['es', 'en']).optional(),
  stateCode:             z.string().length(2).toUpperCase().optional(),
  emergencyContactName:  z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactEmail: z.string().email().optional(),
  passengerCategories:   z.array(z.enum(PASSENGER_CATEGORIES)).optional(),
  referralCode:          z.string().max(30).optional(),
});

const registerDriverSchema = z.object({
  firebaseToken: z.string().min(1, 'Firebase token is required'),
  name: z.string().min(2, 'Name is too short').max(100),
  phone: z.string().min(10, 'Invalid phone number'),
  language: z.enum(['es', 'en']).optional(),
  stateCode: z.string().length(2).toUpperCase(),
  referralCode: z.string().optional(),
});

const loginSchema = z.object({
  firebaseToken: z.string().min(1, 'Firebase token is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const authController = {
  // POST /auth/register/passenger
  registerPassenger: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = registerPassengerSchema.parse(req.body);
      const result = await authService.registerPassenger(body);
      sendCreated(res, result);
    } catch (err) {
      handleAuthError(err, res, next);
    }
  },

  // POST /auth/register/driver
  registerDriver: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = registerDriverSchema.parse(req.body);
      const result = await authService.registerDriver(body);
      sendCreated(res, result);
    } catch (err) {
      handleAuthError(err, res, next);
    }
  },

  // POST /auth/login
  login: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { firebaseToken } = loginSchema.parse(req.body);
      const result = await authService.login(firebaseToken);
      sendSuccess(res, result);
    } catch (err) {
      handleAuthError(err, res, next);
    }
  },

  // POST /auth/refresh
  refresh: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = refreshSchema.parse(req.body);
      const tokens = await authService.refreshTokens(refreshToken);
      sendSuccess(res, tokens);
    } catch (err) {
      handleAuthError(err, res, next);
    }
  },

  // POST /auth/logout  (requiere JWT válido)
  logout: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await authService.logout(req.user!.userId);
      sendSuccess(res, { message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  },

  // GET /auth/me  (devuelve el perfil del usuario autenticado)
  me: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userRepository } = await import('../repositories/userRepository');
      const user = await userRepository.findById(req.user!.userId);
      if (!user) {
        sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
        return;
      }
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  },

  // POST /auth/push-token  (registrar token FCM del dispositivo)
  savePushToken: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        token: z.string().min(1),
        platform: z.enum(['ios', 'android']),
      });
      const { token, platform } = schema.parse(req.body);
      const { query } = await import('../config/database');

      await query(
        `INSERT INTO push_tokens (user_id, token, platform)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, platform) DO UPDATE SET token = $2, updated_at = NOW()`,
        [req.user!.userId, token, platform]
      );

      sendSuccess(res, { saved: true });
    } catch (err) {
      next(err);
    }
  },

  // POST /auth/dev-register/passenger (solo NODE_ENV=development)
  devRegisterPassenger: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (process.env.NODE_ENV !== 'development') {
        sendError(res, 403, 'Not available in production', 'FORBIDDEN');
        return;
      }
      const schema = z.object({
        email:     z.string().email(),
        name:      z.string().min(2),
        phone:     z.string().optional(),
        stateCode: z.string().length(2).toUpperCase().optional(),
      });
      const body = schema.parse(req.body);
      const result = await authService.devRegisterPassenger(body);
      sendCreated(res, result);
    } catch (err) {
      handleAuthError(err, res, next);
    }
  },

  // POST /auth/dev-register/driver (solo NODE_ENV=development)
  devRegisterDriver: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (process.env.NODE_ENV !== 'development') {
        sendError(res, 403, 'Not available in production', 'FORBIDDEN');
        return;
      }
      const schema = z.object({
        email: z.string().email(),
        name: z.string().min(2),
        phone: z.string().min(10),
        stateCode: z.string().length(2).toUpperCase(),
        referralCode: z.string().optional(),
      });
      const body = schema.parse(req.body);
      const result = await authService.devRegisterDriver(body);
      sendCreated(res, result);
    } catch (err) {
      handleAuthError(err, res, next);
    }
  },

  // POST /auth/admin-login — login del panel admin con email + contraseña + TOTP (si habilitado)
  adminLogin: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, totpCode } = z.object({
        email:    z.string().email(),
        password: z.string().min(1),
        totpCode: z.string().optional(),
      }).parse(req.body);

      const ip = req.ip ?? '0.0.0.0';

      const lockState = await isLocked(ip, email);
      if (lockState.locked) {
        const minutes = Math.ceil(lockState.ttl / 60);
        logger.warn('Admin login blocked — account locked', { ip, email });
        res.status(429).json({
          success: false,
          code:    'ACCOUNT_LOCKED',
          message: `Too many failed attempts. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
          retryAfter: lockState.ttl,
        });
        return;
      }

      const bcrypt = await import('bcryptjs');
      const adminRow = await queryOne<{ dashboard_password_hash: string | null }>(
        `SELECT dashboard_password_hash FROM users WHERE email = $1 AND role = 'admin'`,
        [email]
      );
      // Verificar contra hash bcrypt guardado en BD, o contra env var como respaldo
      let passwordMatch = false;
      if (adminRow?.dashboard_password_hash) {
        passwordMatch = await bcrypt.compare(password, adminRow.dashboard_password_hash);
      } else {
        const adminPassword = process.env.ADMIN_PANEL_PASSWORD;
        const hash = (s: string) => Buffer.from(crypto.createHash('sha256').update(s).digest('hex'));
        passwordMatch = adminPassword
          ? crypto.timingSafeEqual(hash(password), hash(adminPassword))
          : false;
      }
      if (!passwordMatch) {
        logger.warn('Admin login failed — wrong password', { ip });
        await recordFailure(ip, email);
        sendError(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
        return;
      }

      const result = await authService.devLogin(email);
      if (result.user.role !== 'admin') {
        sendError(res, 403, 'Access denied — admins only', 'FORBIDDEN');
        return;
      }

      // Verificar estado 2FA del admin
      const admin2faRow = await queryOne<{ totp_secret: string; totp_enabled: boolean }>(
        'SELECT totp_secret, totp_enabled FROM users WHERE id = $1',
        [result.user.id]
      );

      // TEMP: 2FA deshabilitado — configurar desde el dashboard antes de re-habilitar

      // Login exitoso — limpiar contadores de fallo
      await clearFailures(ip, email);

      await auditRepository.log({
        event:    'admin_login',
        actorId:  result.user.id,
        metadata: { totp: 'verified' },
        ipAddress: req.ip,
      });

      sendSuccess(res, result);
    } catch (err) {
      handleAuthError(err, res, next);
    }
  },

  // GET /auth/admin/2fa/setup — genera secreto TOTP y QR para escanear
  adminSetup2FA: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.userId;
      const secret = speakeasy.generateSecret({
        name: `VeronaRide Admin (${req.user!.email})`,
        length: 20,
      });
      // Guardar secreto temporalmente (aún no activado)
      await query('UPDATE users SET totp_secret = $1, totp_enabled = false WHERE id = $2', [secret.base32, adminId]);
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
      sendSuccess(res, { qrCode: qrCodeUrl, secret: secret.base32 });
    } catch (err) {
      next(err);
    }
  },

  // POST /auth/admin/2fa/verify — verifica el primer código y activa el 2FA
  adminVerify2FA: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code } = z.object({ code: z.string().length(6) }).parse(req.body);
      const adminId = req.user!.userId;
      const row = await queryOne<{ totp_secret: string }>(
        'SELECT totp_secret FROM users WHERE id = $1',
        [adminId]
      );
      if (!row?.totp_secret) {
        sendError(res, 400, 'Run setup first', 'TOTP_NOT_SETUP');
        return;
      }
      const valid = speakeasy.totp.verify({
        secret: row.totp_secret,
        encoding: 'base32',
        token: code,
        window: 1,
      });
      if (!valid) {
        sendError(res, 401, 'Invalid code — try again', 'INVALID_TOTP');
        return;
      }
      await query('UPDATE users SET totp_enabled = true WHERE id = $1', [adminId]);
      await auditRepository.log({ event: 'admin_2fa_enabled', actorId: adminId, ipAddress: req.ip });

      // Emitir tokens completos para que el admin entre directo al dashboard
      const fullSession = await authService.devLogin(req.user!.email);
      sendSuccess(res, { enabled: true, ...fullSession });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /auth/admin/2fa — desactiva el 2FA
  adminDisable2FA: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.userId;
      await query('UPDATE users SET totp_secret = NULL, totp_enabled = false WHERE id = $1', [adminId]);
      await auditRepository.log({ event: 'admin_2fa_disabled', actorId: adminId, ipAddress: req.ip });
      sendSuccess(res, { disabled: true });
    } catch (err) {
      next(err);
    }
  },

  // POST /auth/dev-login (solo NODE_ENV=development)
  devLogin: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (process.env.NODE_ENV !== 'development') {
        sendError(res, 403, 'Not available in production', 'FORBIDDEN');
        return;
      }
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      const result = await authService.devLogin(email);
      sendSuccess(res, result);
    } catch (err) {
      handleAuthError(err, res, next);
    }
  },
};

// Mapeo de errores del servicio a respuestas HTTP
function handleAuthError(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof Error) {
    switch (err.message) {
      case 'ALREADY_REGISTERED':
        sendError(res, 409, 'An account with this email or phone already exists', 'ALREADY_REGISTERED');
        return;
      case 'USER_NOT_FOUND':
        sendError(res, 404, 'No account found with those details. Please register first.', 'USER_NOT_FOUND');
        return;
      case 'ACCOUNT_DISABLED':
        sendError(res, 403, 'Your account has been deactivated. Please contact support.', 'ACCOUNT_DISABLED');
        return;
      case 'EMAIL_NOT_VERIFIED':
        sendError(res, 403, 'Please verify your email address before logging in.', 'EMAIL_NOT_VERIFIED');
        return;
      case 'INVALID_REFRESH_TOKEN':
      case 'REFRESH_TOKEN_REUSED':
        sendError(res, 401, 'Session expired. Please log in again.', err.message);
        return;
    }
  }
  next(err);
}
