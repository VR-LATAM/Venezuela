// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { query, queryOne } from '../config/database';

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_percent: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export const promoRepository = {

  findByCode: (code: string) =>
    queryOne<PromoCode>(
      'SELECT * FROM promo_codes WHERE code = UPPER($1)',
      [code]
    ),

  validateForPassenger: async (code: string, passengerId: string): Promise<{
    valid: boolean;
    reason?: string;
    promo?: PromoCode;
  }> => {
    const promo = await promoRepository.findByCode(code);
    if (!promo)            return { valid: false, reason: 'Code not found' };
    if (!promo.is_active)  return { valid: false, reason: 'Code is inactive' };
    if (promo.expires_at && new Date(promo.expires_at) < new Date())
                           return { valid: false, reason: 'Code has expired' };
    if (promo.max_uses !== null && promo.uses_count >= promo.max_uses)
                           return { valid: false, reason: 'Code has reached its usage limit' };

    const alreadyUsed = await queryOne<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM promo_code_uses WHERE promo_id = $1 AND passenger_id = $2) AS exists',
      [promo.id, passengerId]
    );
    if (alreadyUsed?.exists) return { valid: false, reason: 'You have already used this code' };

    return { valid: true, promo };
  },

  recordUse: (promoId: string, passengerId: string, rideId: string) =>
    query(
      `INSERT INTO promo_code_uses (promo_id, passenger_id, ride_id) VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [promoId, passengerId, rideId]
    ),

  incrementUseCount: (promoId: string) =>
    query('UPDATE promo_codes SET uses_count = uses_count + 1 WHERE id = $1', [promoId]),

  // Admin
  create: async (data: {
    code: string;
    description?: string;
    discount_percent: number;
    max_uses?: number;
    expires_at?: string;
  }): Promise<PromoCode> => {
    const row = await queryOne<PromoCode>(
      `INSERT INTO promo_codes (code, description, discount_percent, max_uses, expires_at)
       VALUES (UPPER($1), $2, $3, $4, $5) RETURNING *`,
      [data.code, data.description ?? null, data.discount_percent, data.max_uses ?? null, data.expires_at ?? null]
    );
    return row!;
  },

  toggleActive: (promoId: string, isActive: boolean) =>
    query('UPDATE promo_codes SET is_active = $2 WHERE id = $1', [promoId, isActive]),

  list: () =>
    query<PromoCode>('SELECT * FROM promo_codes ORDER BY created_at DESC'),
};
