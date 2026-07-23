// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Repositorio de notificaciones — tokens FCM y campañas
// Tablas: push_tokens, notification_campaigns
// ═══════════════════════════════════════════════════════════════

import { db } from '../config/database';

export interface PushToken {
  id:         string;
  user_id:    string;
  token:      string;
  platform:   'ios' | 'android';
  updated_at: Date;
}

export const notificationRepository = {

  // ─────────────────────────────────────────────────────────────
  // TOKENS FCM
  // ─────────────────────────────────────────────────────────────

  // Guarda o actualiza el token FCM de un usuario
  // Si ya existe un token para la plataforma, lo actualiza (UPSERT)
  upsertToken: async (userId: string, token: string, platform: 'ios' | 'android'): Promise<void> => {
    await db.query(
      `INSERT INTO push_tokens (user_id, token, platform, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, platform)
       DO UPDATE SET token = $2, updated_at = NOW()`,
      [userId, token, platform]
    );
  },

  // Elimina el token FCM al cerrar sesión
  deleteToken: async (userId: string, platform?: 'ios' | 'android'): Promise<void> => {
    if (platform) {
      await db.query(
        `DELETE FROM push_tokens WHERE user_id = $1 AND platform = $2`,
        [userId, platform]
      );
    } else {
      await db.query(`DELETE FROM push_tokens WHERE user_id = $1`, [userId]);
    }
  },

  // Obtiene todos los tokens de un usuario (puede tener iOS + Android)
  getTokensByUser: async (userId: string): Promise<string[]> => {
    const { rows } = await db.query<{ token: string }>(
      `SELECT token FROM push_tokens WHERE user_id = $1`,
      [userId]
    );
    return rows.map(r => r.token);
  },

  // Obtiene el primer token disponible de un usuario (para notificaciones únicas)
  getPrimaryToken: async (userId: string): Promise<string | null> => {
    const { rows } = await db.query<{ token: string }>(
      `SELECT token FROM push_tokens WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1`,
      [userId]
    );
    return rows[0]?.token ?? null;
  },

  // Obtiene tokens de todos los conductores de un estado (para campañas)
  getDriverTokensByState: async (stateCode: string): Promise<string[]> => {
    const { rows } = await db.query<{ token: string }>(
      `SELECT pt.token
       FROM push_tokens pt
       JOIN users u ON u.id = pt.user_id
       JOIN drivers d ON d.id = u.id
       WHERE d.state_code = $1 AND d.status = 'active'`,
      [stateCode]
    );
    return rows.map(r => r.token);
  },

  // Elimina tokens inválidos reportados por FCM
  removeInvalidTokens: async (tokens: string[]): Promise<void> => {
    if (tokens.length === 0) return;
    await db.query(
      `DELETE FROM push_tokens WHERE token = ANY($1::text[])`,
      [tokens]
    );
  },

  // ─────────────────────────────────────────────────────────────
  // CAMPAÑAS DE NOTIFICACIÓN (enviadas por el admin)
  // ─────────────────────────────────────────────────────────────

  createCampaign: async (params: {
    createdBy:  string;
    title:      string;
    body:       string;
    target:     string;
  }): Promise<string> => {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO notification_campaigns (created_by, title, body, target)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [params.createdBy, params.title, params.body, params.target]
    );
    return rows[0].id;
  },

  updateCampaignStatus: async (
    id:        string,
    status:    'sending' | 'sent' | 'failed',
    sentCount: number
  ): Promise<void> => {
    await db.query(
      `UPDATE notification_campaigns
       SET status = $1, sent_count = $2, sent_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE NULL END
       WHERE id = $3`,
      [status, sentCount, id]
    );
  },
};
