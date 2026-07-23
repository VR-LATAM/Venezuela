// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Helpers para respuestas HTTP consistentes
// Todos los endpoints devuelven { success, data?, error?, code? }
// ═══════════════════════════════════════════════════════════════

import { Response } from 'express';
import { ApiResponse } from '@vride/shared';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const body: ApiResponse<T> = { success: true, data };
  res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, 201);
}

export function sendError(
  res: Response,
  statusCode: number,
  error: string,
  code?: string
): void {
  const body: ApiResponse = { success: false, error, code };
  res.status(statusCode).json(body);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}

// Errores comunes reutilizables
export const ApiErrors = {
  UNAUTHORIZED:     (res: Response) => sendError(res, 401, 'Unauthorized', 'UNAUTHORIZED'),
  FORBIDDEN:        (res: Response) => sendError(res, 403, 'Access denied', 'FORBIDDEN'),
  NOT_FOUND:        (res: Response, msg = 'Resource not found') => sendError(res, 404, msg, 'NOT_FOUND'),
  CONFLICT:         (res: Response, msg: string) => sendError(res, 409, msg, 'CONFLICT'),
  VALIDATION_ERROR: (res: Response, msg: string) => sendError(res, 422, msg, 'VALIDATION_ERROR'),
  INTERNAL:         (res: Response) => sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR'),
} as const;
