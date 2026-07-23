// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Rate limiting — protección contra abuso y ataques de fuerza bruta
// ═══════════════════════════════════════════════════════════════

import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { sendError } from '../utils/response';
import { Request, Response } from 'express';

const rateLimitResponse = (_req: Request, res: Response): void => {
  sendError(res, 429, 'Too many requests. Please try again in a few minutes.', 'RATE_LIMIT_EXCEEDED');
};

// Rate limiter general — 100 req/min por IP
export const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
});

// Rate limiter estricto para rutas de autenticación — 5 intentos/min por IP
// Previene ataques de fuerza bruta en login
export const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
  skipSuccessfulRequests: true, // Solo cuenta requests fallidos
});

// Rate limiter para endpoints de usuario autenticado — 30 req/min
export const userLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
  keyGenerator: (req: Request) => req.user?.userId ?? req.ip ?? 'unknown',
});
