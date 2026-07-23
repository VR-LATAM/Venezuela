// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Middleware de autenticación y autorización
// requireAuth: verifica JWT propio (Bearer token)
// requireRole: verifica que el usuario tenga el rol requerido
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { ApiErrors } from '../utils/response';
import { UserRole } from '@vride/shared';

// Verifica el JWT Bearer token en el header Authorization
// Agrega req.user con userId, role y email si es válido
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    ApiErrors.UNAUTHORIZED(res);
    return;
  }

  const token = authHeader.slice(7); // Remover "Bearer "

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    // Token inválido, expirado o con firma incorrecta
    ApiErrors.UNAUTHORIZED(res);
  }
}

// Verifica que el usuario autenticado tenga uno de los roles permitidos
// Usar después de requireAuth: router.get('/ruta', requireAuth, requireRole('admin'), handler)
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ApiErrors.UNAUTHORIZED(res);
      return;
    }

    if (!roles.includes(req.user.role)) {
      ApiErrors.FORBIDDEN(res);
      return;
    }

    next();
  };
}
