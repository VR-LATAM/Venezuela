// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Repositorio de audit logs — registro de acciones sensibles
// ═══════════════════════════════════════════════════════════════

import { query } from '../config/database';
import { logger } from '../utils/logger';

export const auditRepository = {
  log: async (params: {
    event: string;
    actorId?: string | null;
    targetId?: string | null;
    targetType?: string | null;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
  }): Promise<void> => {
    try {
      await query(
        `INSERT INTO audit_logs (event, actor_id, target_id, target_type, metadata, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          params.event,
          params.actorId   ?? null,
          params.targetId  ?? null,
          params.targetType ?? null,
          JSON.stringify(params.metadata ?? {}),
          params.ipAddress ?? null,
        ]
      );
    } catch (err) {
      // El audit log nunca debe interrumpir el flujo principal
      logger.error('Failed to write audit log', { event: params.event, err });
    }
  },
};
