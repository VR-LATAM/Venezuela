// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Middleware de auditoría — registra automáticamente eventos clave
// Aplicar a rutas sensibles: login, registro, pagos, SOS, viajes
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { auditRepository } from '../repositories/auditRepository';

type AuditEvent =
  | 'passenger_login'
  | 'driver_login'
  | 'passenger_registered'
  | 'driver_registered'
  | 'ride_requested'
  | 'ride_completed'
  | 'ride_cancelled'
  | 'payment_processed'
  | 'sos_activated'
  | 'dispute_created'
  | 'profile_updated'
  | 'password_reset'
  | 'driver_status_changed';

export function auditLog(event: AuditEvent) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Capturar la respuesta sin bloquear el request
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Solo registrar si la respuesta fue exitosa (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const actorId = req.user?.userId ?? body?.data?.user?.id ?? null;
        auditRepository.log({
          event,
          actorId,
          targetId:   req.params?.id ?? null,
          targetType: event.split('_')[0],
          metadata: {
            method: req.method,
            path:   req.path,
            status: res.statusCode,
          },
          ipAddress: req.ip,
        });
      }
      return originalJson(body);
    };
    next();
  };
}
