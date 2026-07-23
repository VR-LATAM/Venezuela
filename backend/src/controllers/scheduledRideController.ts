// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Controlador de viajes programados
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { scheduledRideService } from '../services/scheduledRideService';
import { sendSuccess, sendCreated, sendError } from '../utils/response';

const SERVICE_TYPES = ['standard', 'executive', 'accessible', 'scheduled', 'hourly'] as const;

export const scheduledRideController = {

  // POST /scheduled — agendar un viaje
  book: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        serviceType:    z.enum(SERVICE_TYPES).default('scheduled'),
        pickupAddress:  z.string().min(5),
        pickupLat:      z.number().min(-90).max(90),
        pickupLng:      z.number().min(-180).max(180),
        dropoffAddress: z.string().min(5),
        dropoffLat:     z.number().min(-90).max(90).optional(),
        dropoffLng:     z.number().min(-180).max(180).optional(),
        scheduledAt:    z.string().datetime(), // ISO 8601
      });

      const body = schema.parse(req.body);
      const ride = await scheduledRideService.book({
        passengerId: req.user!.userId,
        ...body,
      });
      sendCreated(res, ride);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'SCHEDULED_TOO_SOON') {
          sendError(res, 422, 'Ride must be scheduled at least 30 minutes in advance', 'SCHEDULED_TOO_SOON');
          return;
        }
        if (err.message === 'GEOCODE_FAILED') {
          sendError(res, 422, 'Could not geocode the destination address', 'GEOCODE_FAILED');
          return;
        }
      }
      next(err);
    }
  },

  // GET /scheduled — listar viajes programados del pasajero
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rides = await scheduledRideService.list(req.user!.userId);
      sendSuccess(res, { rides });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /scheduled/:id — cancelar un viaje programado
  cancel: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cancelled = await scheduledRideService.cancel(req.params['id']!, req.user!.userId);
      if (!cancelled) {
        sendError(res, 404, 'Ride not found or cannot be cancelled', 'NOT_FOUND');
        return;
      }
      sendSuccess(res, { cancelled: true });
    } catch (err) {
      next(err);
    }
  },
};
