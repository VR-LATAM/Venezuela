// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Middleware de validación con Zod
// validate(schema) verifica req.body, req.params o req.query
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response';

type ValidateTarget = 'body' | 'params' | 'query';

export function validate(schema: ZodSchema, target: ValidateTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      sendError(res, 422, errors, 'VALIDATION_ERROR');
      return;
    }

    // Reemplazar con datos limpios y parseados (Zod elimina campos extra)
    (req as unknown as Record<string, unknown>)[target] = result.data;
    next();
  };
}

function formatZodErrors(error: ZodError): string {
  return error.errors
    .map(e => `${e.path.join('.')}: ${e.message}`)
    .join(', ');
}
