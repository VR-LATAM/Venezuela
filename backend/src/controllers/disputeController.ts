// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { disputeRepository } from '../repositories/disputeRepository';
import { notificationRepository } from '../repositories/notificationRepository';
import { fcmService } from '../services/fcmService';
import { sendSuccess, sendCreated, sendError } from '../utils/response';

const DISPUTE_REASONS = [
  'overcharged',
  'wrong_route',
  'unsafe_driving',
  'driver_behavior',
  'vehicle_condition',
  'passenger_behavior',
  'no_show',
  'cancellation_fee',
  'other',
] as const;

export const disputeController = {

  // POST /dispute — abrir disputa
  open: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        rideId:      z.string().uuid(),
        reason:      z.enum(DISPUTE_REASONS),
        description: z.string().max(1000).optional(),
      });
      const body = schema.parse(req.body);
      const dispute = await disputeRepository.create({
        rideId:       body.rideId,
        reporterId:   req.user!.userId,
        reporterRole: req.user!.role as 'passenger' | 'driver',
        reason:       body.reason,
        description:  body.description,
      });
      sendCreated(res, { dispute });
    } catch (err) { next(err); }
  },

  // GET /dispute/mine — disputas del usuario
  getMine: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const disputes = await disputeRepository.getByUser(req.user!.userId);
      sendSuccess(res, { disputes });
    } catch (err) { next(err); }
  },

  // GET /dispute/ride/:rideId — disputas de un viaje específico
  getByRide: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const disputes = await disputeRepository.getByRide(req.params['rideId']!);
      sendSuccess(res, { disputes });
    } catch (err) { next(err); }
  },

  // ── Admin ────────────────────────────────────────────────────

  // GET /admin/disputes — listar disputas abiertas
  listOpen: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const disputes = await disputeRepository.listOpen();
      sendSuccess(res, { disputes });
    } catch (err) { next(err); }
  },

  // PUT /admin/disputes/:id/resolve
  resolve: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { resolution } = z.object({ resolution: z.string().min(10).max(1000) }).parse(req.body);
      const dispute = await disputeRepository.resolve(req.params['id']!, req.user!.userId, resolution);
      if (!dispute) {
        sendError(res, 404, 'Dispute not found', 'NOT_FOUND');
        return;
      }

      // Notificar al usuario que reportó la disputa
      const token = await notificationRepository.getPrimaryToken(dispute.reporter_id);
      if (token) {
        fcmService.notifyDisputeResolved(token, resolution).catch(() => {});
      }

      sendSuccess(res, { dispute });
    } catch (err) { next(err); }
  },
};
