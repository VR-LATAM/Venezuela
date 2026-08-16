// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio de autenticación — lógica de negocio de auth
// Capa entre controllers y repositories
// ═══════════════════════════════════════════════════════════════

import { verifyFirebaseToken } from '../config/firebase';
import { redis, REDIS_KEYS, REDIS_TTL } from '../config/redis';
import { userRepository } from '../repositories/userRepository';
import { passengerRepository } from '../repositories/passengerRepository';
import { driverRepository } from '../repositories/driverRepository';
import { paymentRepository } from '../repositories/paymentRepository';
import { stripeService } from './stripeService';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { withTransaction } from '../config/database';
import { logger } from '../utils/logger';
import { UserRole, User } from '@vride/shared';
import { v4 as uuidv4 } from 'uuid';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // segundos
}

export interface RegisterPassengerParams {
  firebaseToken: string;
  name: string;
  phone?: string;
  language?: string;
  stateCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactEmail?: string;
  passengerCategories?: string[];
  referralCode?: string;
}

export interface RegisterDriverParams {
  firebaseToken: string;
  name: string;
  phone: string;
  language?: string;
  stateCode: string;
  referralCode?: string; // Código del conductor que lo refirió
}

export const authService = {
  // ─────────────────────────────────────
  // REGISTRO DE PASAJERO
  // Verifica el Firebase token, crea el usuario y el pasajero en la BD
  // Devuelve tokens JWT para la sesión
  // ─────────────────────────────────────
  registerPassenger: async (params: RegisterPassengerParams): Promise<{
    user: User;
    tokens: AuthTokens;
  }> => {
    // 1. Verificar token de Firebase
    const decoded = await verifyFirebaseToken(params.firebaseToken);

    // 2. Verificar que no exista ya un usuario con este Firebase UID o email
    const exists = await userRepository.existsByFirebaseUidOrEmail(
      decoded.uid,
      decoded.email ?? ''
    );
    if (exists) {
      throw new Error('ALREADY_REGISTERED');
    }

    // 3. Crear usuario y pasajero en una transacción (todo o nada)
    const user = await withTransaction(async (client) => {
      // Insertar en tabla users
      const { rows: userRows } = await client.query(
        `INSERT INTO users (firebase_uid, email, name, phone, phone_verified, role, language, state_code)
         VALUES ($1, $2, $3, $4, $5, 'passenger', $6, $7)
         RETURNING *`,
        [
          decoded.uid,
          decoded.email ?? params.name.toLowerCase().replace(/\s/g, '.') + '@placeholder.com',
          params.name,
          params.phone ?? decoded.phone_number ?? null,
          decoded.phone_number ? true : false,
          params.language ?? 'es',
          params.stateCode ?? null,
        ]
      );
      const createdUser = userRows[0] as User;

      // Insertar en tabla passengers
      const initialSpecialNeeds = params.passengerCategories && params.passengerCategories.length > 0
        ? JSON.stringify({ categories: params.passengerCategories })
        : '{}';
      const passengerCode = generateOperativeCode('PSJ', params.name);
      await client.query(
        `INSERT INTO passengers
           (id, operative_code, emergency_contact_name, emergency_contact_phone, emergency_contact_email, special_needs)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          createdUser.id,
          passengerCode,
          params.emergencyContactName  ?? null,
          params.emergencyContactPhone ?? null,
          params.emergencyContactEmail ?? null,
          initialSpecialNeeds,
        ]
      );

      return createdUser;
    });

    // 4. Procesar código de referido (no bloquea si falla)
    if (params.referralCode) {
      const { passengerReferralService } = await import('./passengerReferralService');
      passengerReferralService.onPassengerRegistered(user.id, params.referralCode).catch(() => {});
    }

    // 5. Crear Customer de Stripe para cobros futuros (no bloquea el registro si falla)
    try {
      const stripeCustomerId = await stripeService.createPassengerCustomer({
        email:  decoded.email ?? '',
        name:   params.name,
        userId: user.id,
      });
      await paymentRepository.setStripeCustomerId(user.id, stripeCustomerId);
    } catch (err) {
      logger.warn('No se pudo crear Customer de Stripe para el pasajero', { userId: user.id, err });
    }

    // 5. Generar tokens JWT
    const tokens = generateTokenPair(user.id, 'passenger', user.email);

    // 5. Guardar refresh token en Redis (non-fatal — no bloquea el registro si Redis falla o cuelga)
    try {
      await Promise.race([
        redis.setex(REDIS_KEYS.refreshToken(user.id), REDIS_TTL.REFRESH_TOKEN, tokens.refreshToken),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 3000)),
      ]);
    } catch (redisErr) {
      logger.warn('Could not store refresh token in Redis during passenger registration', { userId: user.id });
    }

    return { user, tokens };
  },

  // ─────────────────────────────────────
  // REGISTRO DE CONDUCTOR
  // Crea el usuario y el perfil del conductor (estado: pending)
  // El conductor aún necesita subir documentos antes de poder operar
  // ─────────────────────────────────────
  registerDriver: async (params: RegisterDriverParams): Promise<{
    user: User;
    tokens: AuthTokens;
  }> => {
    // 1. Verificar token de Firebase
    const decoded = await verifyFirebaseToken(params.firebaseToken);

    // 2. Verificar que no exista
    const exists = await userRepository.existsByFirebaseUidOrEmail(
      decoded.uid,
      decoded.email ?? ''
    );
    if (exists) {
      throw new Error('ALREADY_REGISTERED');
    }

    // 3. Verificar código de referido si se proporcionó
    let referredById: string | undefined;
    if (params.referralCode) {
      const referrer = await driverRepository.findByReferralCode(params.referralCode);
      if (referrer) {
        referredById = referrer.id;
      }
      // Si el código no existe, continúar sin referido (no es error)
    }

    // 4. Generar código de referido único para este conductor
    const referralCode = generateReferralCode(params.name);

    // 5. Crear usuario y conductor en transacción
    const user = await withTransaction(async (client) => {
      const { rows: userRows } = await client.query(
        `INSERT INTO users (firebase_uid, email, name, phone, phone_verified, role, language, state_code)
         VALUES ($1, $2, $3, $4, true, 'driver', $5, $6)
         RETURNING *`,
        [
          decoded.uid,
          decoded.email ?? '',
          params.name,
          params.phone,
          params.language ?? 'es',
          params.stateCode,
        ]
      );
      const createdUser = userRows[0] as User;

      const driverCode = generateOperativeCode('DR', params.name);
      await client.query(
        `INSERT INTO drivers (id, state_code, referral_code, referred_by_id, operative_code)
         VALUES ($1, $2, $3, $4, $5)`,
        [createdUser.id, params.stateCode, referralCode, referredById ?? null, driverCode]
      );

      // Si fue referido, crear el registro en tabla referrals
      if (referredById) {
        await client.query(
          `INSERT INTO referrals (referrer_driver_id, referred_driver_id, status, rides_required)
           VALUES ($1, $2, 'pending', 12)
           ON CONFLICT (referrer_driver_id, referred_driver_id) DO NOTHING`,
          [referredById, createdUser.id]
        );
      }

      return createdUser;
    });

    // 6. Generar tokens JWT
    const tokens = generateTokenPair(user.id, 'driver', user.email);

    try {
      await Promise.race([
        redis.setex(REDIS_KEYS.refreshToken(user.id), REDIS_TTL.REFRESH_TOKEN, tokens.refreshToken),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 3000)),
      ]);
    } catch (redisErr) {
      logger.warn('Could not store refresh token in Redis during driver registration', { userId: user.id });
    }

    return { user, tokens };
  },

  // ─────────────────────────────────────
  // LOGIN
  // Verifica el Firebase token y devuelve tokens JWT si el usuario existe
  // ─────────────────────────────────────
  login: async (firebaseToken: string): Promise<{
    user: User;
    tokens: AuthTokens;
    role: UserRole;
  }> => {
    const decoded = await verifyFirebaseToken(firebaseToken);

    if (!decoded.email_verified) {
      throw new Error('EMAIL_NOT_VERIFIED');
    }

    const user = await userRepository.findByFirebaseUid(decoded.uid);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    if (!user.is_active) {
      throw new Error('ACCOUNT_DISABLED');
    }

    const tokens = generateTokenPair(user.id, user.role, user.email);

    try {
      await Promise.race([
        redis.setex(REDIS_KEYS.refreshToken(user.id), REDIS_TTL.REFRESH_TOKEN, tokens.refreshToken),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 3000)),
      ]);
    } catch (redisErr) {
      logger.warn('Could not store refresh token in Redis during login', { userId: user.id, redisErr });
    }

    return { user, tokens, role: user.role };
  },

  // ─────────────────────────────────────
  // DEV REGISTER PASSENGER (solo NODE_ENV=development)
  // Registro de pasajero sin Firebase — solo para probar localmente
  // ─────────────────────────────────────
  devRegisterPassenger: async (params: {
    email: string;
    name: string;
    phone?: string;
    stateCode?: string;
  }): Promise<{ user: User; tokens: AuthTokens; role: UserRole }> => {
    const exists = await userRepository.existsByFirebaseUidOrEmail(
      `dev_${params.email}`,
      params.email
    );
    if (exists) throw new Error('ALREADY_REGISTERED');

    const user = await withTransaction(async (client) => {
      const { rows: userRows } = await client.query(
        `INSERT INTO users (firebase_uid, email, name, phone, phone_verified, role, language, state_code)
         VALUES ($1, $2, $3, $4, true, 'passenger', 'en', $5)
         RETURNING *`,
        [`dev_${params.email}`, params.email, params.name, params.phone ?? null, params.stateCode ?? 'TX']
      );
      const createdUser = userRows[0] as User;

      await client.query(
        `INSERT INTO passengers (id) VALUES ($1)`,
        [createdUser.id]
      );

      return createdUser;
    });

    const tokens = generateTokenPair(user.id, 'passenger', user.email);
    await redis.setex(REDIS_KEYS.refreshToken(user.id), REDIS_TTL.REFRESH_TOKEN, tokens.refreshToken);
    return { user, tokens, role: 'passenger' };
  },

  // ─────────────────────────────────────
  // DEV REGISTER DRIVER (solo NODE_ENV=development)
  // Registro de conductor sin Firebase — solo para probar localmente
  // ─────────────────────────────────────
  devRegisterDriver: async (params: {
    email: string;
    name: string;
    phone: string;
    stateCode: string;
    referralCode?: string;
  }): Promise<{ user: User; tokens: AuthTokens; role: UserRole }> => {
    const exists = await userRepository.existsByFirebaseUidOrEmail(
      `dev_${params.email}`,
      params.email
    );
    if (exists) throw new Error('ALREADY_REGISTERED');

    let referredById: string | undefined;
    if (params.referralCode) {
      const referrer = await driverRepository.findByReferralCode(params.referralCode);
      if (referrer) referredById = referrer.id;
    }

    const referralCode = generateReferralCode(params.name);

    const user = await withTransaction(async (client) => {
      const { rows: userRows } = await client.query(
        `INSERT INTO users (firebase_uid, email, name, phone, phone_verified, role, language, state_code)
         VALUES ($1, $2, $3, $4, true, 'driver', 'en', $5)
         RETURNING *`,
        [`dev_${params.email}`, params.email, params.name, params.phone, params.stateCode]
      );
      const createdUser = userRows[0] as User;

      await client.query(
        `INSERT INTO drivers (id, state_code, referral_code, referred_by_id, status)
         VALUES ($1, $2, $3, $4, 'active')`,
        [createdUser.id, params.stateCode, referralCode, referredById ?? null]
      );

      if (referredById) {
        await client.query(
          `INSERT INTO referrals (referrer_driver_id, referred_driver_id, status, rides_required)
           VALUES ($1, $2, 'pending', 12)
           ON CONFLICT (referrer_driver_id, referred_driver_id) DO NOTHING`,
          [referredById, createdUser.id]
        );
      }

      return createdUser;
    });

    const tokens = generateTokenPair(user.id, 'driver', user.email);
    await redis.setex(REDIS_KEYS.refreshToken(user.id), REDIS_TTL.REFRESH_TOKEN, tokens.refreshToken);
    return { user, tokens, role: 'driver' };
  },

  // ─────────────────────────────────────
  // DEV LOGIN (solo NODE_ENV=development)
  // Login directo por email sin Firebase — solo para probar localmente
  // ─────────────────────────────────────
  devLogin: async (email: string): Promise<{
    user: User;
    tokens: AuthTokens;
    role: UserRole;
  }> => {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new Error('USER_NOT_FOUND');
    if (!user.is_active) throw new Error('ACCOUNT_DISABLED');

    const tokens = generateTokenPair(user.id, user.role, user.email);
    await redis.setex(
      REDIS_KEYS.refreshToken(user.id),
      REDIS_TTL.REFRESH_TOKEN,
      tokens.refreshToken
    );
    return { user, tokens, role: user.role };
  },

  // ─────────────────────────────────────
  // REFRESH TOKEN
  // Renueva el access token usando el refresh token
  // ─────────────────────────────────────
  refreshTokens: async (refreshToken: string): Promise<AuthTokens> => {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    // Verificar que el refresh token en Redis coincide (evita reuso después de logout)
    const storedToken = await redis.get(REDIS_KEYS.refreshToken(payload.userId));
    if (storedToken !== refreshToken) {
      // Posible robo de token — invalidar todas las sesiones del usuario inmediatamente
      await redis.del(REDIS_KEYS.refreshToken(payload.userId));
      logger.warn('Refresh token reuse detected — all sessions invalidated', { userId: payload.userId });
      throw new Error('REFRESH_TOKEN_REUSED');
    }

    const user = await userRepository.findById(payload.userId);
    if (!user || !user.is_active) {
      throw new Error('USER_NOT_FOUND');
    }

    const tokens = generateTokenPair(user.id, user.role, user.email);

    // Rotar el refresh token (nuevo token en Redis)
    await redis.setex(
      REDIS_KEYS.refreshToken(user.id),
      REDIS_TTL.REFRESH_TOKEN,
      tokens.refreshToken
    );

    return tokens;
  },

  // ─────────────────────────────────────
  // LOGOUT
  // Invalida el refresh token en Redis
  // ─────────────────────────────────────
  logout: async (userId: string): Promise<void> => {
    await redis.del(REDIS_KEYS.refreshToken(userId));
  },
};

// ─────────────────────────────────────
// Helpers privados
// ─────────────────────────────────────

function generateTokenPair(userId: string, role: UserRole, email: string): AuthTokens {
  return {
    accessToken: generateAccessToken({ userId, role, email }),
    refreshToken: generateRefreshToken({ userId, tokenVersion: 1 }),
    expiresIn: 900, // 15 minutos en segundos
  };
}

function generateReferralCode(name: string): string {
  const namePrefix = name.replace(/\s/g, '').toUpperCase().slice(0, 5);
  const suffix = uuidv4().replace(/-/g, '').toUpperCase().slice(0, 4);
  return `${namePrefix}${suffix}`;
}

function vehiclePrefix(services: string[]): string {
  if (services.includes('motorcycle')) return 'MT';
  if (services.includes('sedan'))      return 'SD';
  if (services.includes('suv'))        return 'SV';
  if (services.includes('van'))        return 'VN';
  if (services.includes('pickup'))     return 'PU';
  if (services.includes('350') || services.includes('npr')) return 'CG';
  return 'DR';
}

export function generateOperativeCode(prefix: string, fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const lastName = parts.length > 1 ? parts[1] : parts[0];
  const normalized = lastName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z]/g, '');
  const nameCode = normalized.substring(0, 2).toUpperCase().padEnd(2, 'X');
  const rand = Math.floor(100 + Math.random() * 900).toString();
  return `${prefix}-${nameCode}-${rand}`;
}
