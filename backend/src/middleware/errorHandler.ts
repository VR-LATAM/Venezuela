// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Manejador global de errores no capturados
// Último middleware en la cadena de Express
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

// Errores de PostgreSQL más comunes
const PG_ERROR_CODES: Record<string, { status: number; message: string }> = {
  '23505': { status: 409, message: 'A record with those details already exists' },  // unique_violation
  '23503': { status: 409, message: 'Reference to a record that does not exist' },   // foreign_key_violation
  '23502': { status: 422, message: 'A required field is missing' },                 // not_null_violation
};

interface PostgresError extends Error {
  code?: string;
}

export function errorHandler(
  err: PostgresError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Error de PostgreSQL conocido — loguear internamente, nunca exponer el código PG
  if (err.code && PG_ERROR_CODES[err.code]) {
    const { status, message } = PG_ERROR_CODES[err.code];
    logger.warn('Database constraint error', { pgCode: err.code, path: req.path });
    sendError(res, status, message, 'DATABASE_CONSTRAINT');
    return;
  }

  // Error no esperado — loguear para investigación
  logger.error('Error no manejado:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR');
}

// Manejador para rutas no encontradas (404)
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, `Route not found: ${req.method} ${req.path}`, 'NOT_FOUND');
}
