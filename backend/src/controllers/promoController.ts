// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { promoRepository } from '../repositories/promoRepository';
import { sendSuccess, sendCreated, sendError } from '../utils/response';

export const promoController = {

  // POST /promo/validate — validar código antes de confirmar viaje
  validate: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code } = z.object({ code: z.string().min(1).max(30) }).parse(req.body);
      const result = await promoRepository.validateForPassenger(code, req.user!.userId);
      if (!result.valid) {
        sendError(res, 422, result.reason ?? 'Invalid promo code', 'INVALID_PROMO');
        return;
      }
      sendSuccess(res, {
        valid: true,
        discount_percent: result.promo!.discount_percent,
        description: result.promo!.description,
      });
    } catch (err) { next(err); }
  },

  // ── Admin ────────────────────────────────────────────────────

  // GET /admin/promos
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const promos = await promoRepository.list();
      sendSuccess(res, { promos });
    } catch (err) { next(err); }
  },

  // POST /admin/promos
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        code:             z.string().min(3).max(30),
        description:      z.string().max(200).optional(),
        discount_percent: z.number().int().min(1).max(100),
        max_uses:         z.number().int().positive().optional(),
        expires_at:       z.string().datetime().optional(),
      });
      const data = schema.parse(req.body);
      const promo = await promoRepository.create(data);
      sendCreated(res, { promo });
    } catch (err) { next(err); }
  },

  // PATCH /admin/promos/:id/toggle
  toggle: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { is_active } = z.object({ is_active: z.boolean() }).parse(req.body);
      await promoRepository.toggleActive(req.params['id']!, is_active);
      sendSuccess(res, { updated: true });
    } catch (err) { next(err); }
  },
};
