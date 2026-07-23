// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Helpers JWT — generación y verificación de tokens propios
// El backend usa sus propios JWT después de verificar Firebase
// ═══════════════════════════════════════════════════════════════

import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRole } from '@vride/shared';

export interface JwtPayload {
  userId: string;
  role: UserRole;
  email: string;
  mfaSetupRequired?: boolean; // true = token solo válido para configurar 2FA
}

// Token temporal de 10 minutos — solo para el flujo de setup de 2FA
export function generateMfaSetupToken(payload: Omit<JwtPayload, 'mfaSetupRequired'>): string {
  return jwt.sign(
    { ...payload, mfaSetupRequired: true },
    env.JWT_SECRET,
    { expiresIn: '10m', issuer: 'vride-api', audience: 'vride-app' } as jwt.SignOptions
  );
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number; // Permite invalidar todos los refresh tokens del usuario
}

// Generar access token (24h)
export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: 'vride-api',
    audience: 'vride-app',
  } as jwt.SignOptions);
}

// Generar refresh token (30 días)
export function generateRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: 'vride-api',
    audience: 'vride-app',
  } as jwt.SignOptions);
}

// Verificar access token — lanza error si es inválido o expirado
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET, {
    issuer: 'vride-api',
    audience: 'vride-app',
  }) as JwtPayload;
}

// Verificar refresh token
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: 'vride-api',
    audience: 'vride-app',
  }) as RefreshTokenPayload;
}

// ── Clínicas ──────────────────────────────────────────────────────────────────

export interface ClinicJwtPayload {
  clinicId:   string;
  clinicName: string;
  email:      string;
}

export function generateClinicToken(payload: ClinicJwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '7d',
    issuer: 'vride-api',
    audience: 'vride-clinic',
  } as jwt.SignOptions);
}

export function verifyClinicToken(token: string): ClinicJwtPayload {
  return jwt.verify(token, env.JWT_SECRET, {
    issuer: 'vride-api',
    audience: 'vride-clinic',
  }) as ClinicJwtPayload;
}
