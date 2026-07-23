// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Suscripción mensual del pasajero — $29.99/mes, 15% descuento
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { subscriptionRepository } from '../repositories/subscriptionRepository';
import { sendSuccess, sendCreated, sendError } from '../utils/response';

export const subscriptionController = {

  // GET /subscription/status — estado actual de la suscripción
  getStatus: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sub = await subscriptionRepository.getByPassenger(req.user!.userId);
      sendSuccess(res, {
        subscribed:       !!sub && sub.status === 'active',
        subscription:     sub ?? null,
        plan_price_usd:   29.99,
        discount_percent: sub?.discount_percent ?? 15,
      });
    } catch (err) { next(err); }
  },

  // POST /subscription/subscribe — activar suscripción
  subscribe: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const existing = await subscriptionRepository.getByPassenger(req.user!.userId);
      if (existing?.status === 'active') {
        sendError(res, 409, 'You already have an active subscription', 'ALREADY_SUBSCRIBED');
        return;
      }

      // En produccion aqui iria la creacion del Stripe Subscription
      // Por ahora se activa directamente (Stripe se integrara cuando este en live mode)
      const periodStart = new Date().toISOString();
      const periodEnd   = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const sub = await subscriptionRepository.create({
        passengerId:  req.user!.userId,
        periodStart,
        periodEnd,
      });

      sendCreated(res, {
        subscribed:  true,
        subscription: sub,
        message:     'Subscription activated! You get 15% off all rides this month.',
      });
    } catch (err) { next(err); }
  },

  // DELETE /subscription/cancel — cancelar suscripción
  cancel: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sub = await subscriptionRepository.getByPassenger(req.user!.userId);
      if (!sub || sub.status !== 'active') {
        sendError(res, 404, 'No active subscription found', 'NOT_SUBSCRIBED');
        return;
      }
      await subscriptionRepository.cancel(req.user!.userId);
      sendSuccess(res, {
        cancelled: true,
        message:   'Your subscription has been cancelled. Benefits remain until the end of the current period.',
        period_end: sub.current_period_end,
      });
    } catch (err) { next(err); }
  },
};
