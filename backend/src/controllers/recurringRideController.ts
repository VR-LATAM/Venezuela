// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Viajes recurrentes — pasajeros con citas fijas (diálisis, terapia, etc.)
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { recurringRideRepository } from '../repositories/recurringRideRepository';
import { sendSuccess, sendCreated, sendError, sendNoContent } from '../utils/response';

export const recurringRideController = {

  // GET /recurring-ride — listar viajes recurrentes del pasajero
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rides = await recurringRideRepository.getByPassenger(req.user!.userId);
      const formatted = rides.map(r => ({
        ...r,
        days_label: recurringRideRepository.formatDays(r.days_of_week),
      }));
      sendSuccess(res, { recurring_rides: formatted });
    } catch (err) { next(err); }
  },

  // POST /recurring-ride — crear viaje recurrente
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        nickname:       z.string().max(100).optional(),
        pickup_address: z.string().min(5),
        pickup_lat:     z.number(),
        pickup_lng:     z.number(),
        dropoff_address: z.string().min(5),
        dropoff_lat:    z.number(),
        dropoff_lng:    z.number(),
        service_type:   z.enum(['motorcycle', 'sedan', 'suv']).default('sedan'),
        days_of_week:   z.array(z.number().min(0).max(6)).min(1).max(7),
        time_of_day:    z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
        state_code:     z.string().length(2).default('TX'),
      });
      const body = schema.parse(req.body);

      const ride = await recurringRideRepository.create({
        passengerId:    req.user!.userId,
        nickname:       body.nickname,
        pickupAddress:  body.pickup_address,
        pickupLat:      body.pickup_lat,
        pickupLng:      body.pickup_lng,
        dropoffAddress: body.dropoff_address,
        dropoffLat:     body.dropoff_lat,
        dropoffLng:     body.dropoff_lng,
        serviceType:    body.service_type,
        daysOfWeek:     body.days_of_week,
        timeOfDay:      body.time_of_day,
        stateCode:      body.state_code,
      });

      sendCreated(res, {
        recurring_ride: {
          ...ride,
          days_label: recurringRideRepository.formatDays(ride.days_of_week),
        },
      });
    } catch (err) { next(err); }
  },

  // PATCH /recurring-ride/:id/toggle — activar/desactivar
  toggle: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { active } = z.object({ active: z.boolean() }).parse(req.body);
      const ride = await recurringRideRepository.getById(req.params['id']!, req.user!.userId);
      if (!ride) {
        sendError(res, 404, 'Recurring ride not found', 'NOT_FOUND');
        return;
      }
      await recurringRideRepository.toggleActive(req.params['id']!, req.user!.userId, active);
      sendSuccess(res, { id: req.params['id'], active });
    } catch (err) { next(err); }
  },

  // DELETE /recurring-ride/:id — eliminar
  delete: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ride = await recurringRideRepository.getById(req.params['id']!, req.user!.userId);
      if (!ride) {
        sendError(res, 404, 'Recurring ride not found', 'NOT_FOUND');
        return;
      }
      await recurringRideRepository.delete(req.params['id']!, req.user!.userId);
      sendNoContent(res);
    } catch (err) { next(err); }
  },
};
