// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// Autenticación para endpoints de clínicas
// Acepta: JWT Bearer (portal web) o X-Clinic-Key header (integración API)

import { Request, Response, NextFunction } from 'express';
import { clinicRepository } from '../repositories/clinicRepository';
import { verifyClinicToken } from '../utils/jwt';
import { sendError } from '../utils/response';

export async function requireClinicAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  // 1. JWT Bearer (portal web)
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = verifyClinicToken(token);
      const clinic  = await clinicRepository.findById(payload.clinicId);
      if (!clinic || !clinic.is_active) {
        sendError(res, 403, 'Clinic account is inactive', 'FORBIDDEN');
        return;
      }
      (req as any).clinic = clinic;
      next();
      return;
    } catch {
      sendError(res, 401, 'Invalid or expired clinic token', 'UNAUTHORIZED');
      return;
    }
  }

  // 2. API Key (integración directa)
  const apiKey = req.headers['x-clinic-key'] as string | undefined;
  if (!apiKey) {
    sendError(res, 401, 'Missing authentication (Bearer token or X-Clinic-Key)', 'UNAUTHORIZED');
    return;
  }
  const clinic = await clinicRepository.findByApiKey(apiKey);
  if (!clinic) {
    sendError(res, 403, 'Invalid clinic API key', 'FORBIDDEN');
    return;
  }
  (req as any).clinic = clinic;
  next();
}
