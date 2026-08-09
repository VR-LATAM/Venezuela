// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Manejador global de errores no capturados
// Último middleware en la cadena de Express
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

// Errores de PostgreSQL más comunes
const PG_ERROR_CODES: Record<string, { status: number; message: string }> = {
  '23505': { status: 409, message: 'A record with those details already exists' },  // unique_violation
  '23503': { status: 409, message: 'Reference to a record that does not exist' },   // foreign_key_violation
  '23502': { status: 422, message: 'A required field is missing' },                 // not_null_violation
  '42703': { status: 500, message: 'Database column error — contact support' },     // undefined_column
  '42P01': { status: 500, message: 'Database table error — contact support' },      // undefined_table
};

interface PostgresError extends Error {
  code?: string;
}

export function errorHandler(
  err: PostgresError | ZodError | Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Error de validación Zod — datos inválidos del cliente
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    const detail = firstIssue ? `${firstIssue.path.join('.')}: ${firstIssue.message}` : err.message;
    logger.warn('Zod validation error', { path: req.path, detail });
    sendError(res, 422, detail, 'VALIDATION_ERROR');
    return;
  }

  // Error de PostgreSQL conocido — loguear internamente, nunca exponer el código PG
  const pgErr = err as PostgresError;
  if (pgErr.code && PG_ERROR_CODES[pgErr.code]) {
    const { status, message } = PG_ERROR_CODES[pgErr.code];
    logger.error('Database error', { pgCode: pgErr.code, message: pgErr.message, path: req.path });
    sendError(res, status, message, 'DATABASE_CONSTRAINT');
    return;
  }

  // Error no esperado — loguear para investigación
  logger.error('Error no manejado:', {
    name:    err.name,
    message: err.message,
    stack:   err.stack,
    path:    req.path,
    method:  req.method,
  });

  sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR');
}

// Manejador para rutas no encontradas (404)
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, `Route not found: ${req.method} ${req.path}`, 'NOT_FOUND');
}
