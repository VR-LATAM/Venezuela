// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Lista de espera — pasajero espera que haya conductores disponibles en su zona
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { waitlistRepository } from '../repositories/waitlistRepository';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';

export const waitlistController = {

  // POST /waitlist/join — unirse a la lista de espera
  join: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        pickup_lat:      z.number(),
        pickup_lng:      z.number(),
        pickup_address:  z.string().min(5),
        dropoff_address: z.string().min(5),
        service_type:    z.enum(['motorcycle', 'sedan', 'suv']).default('sedan'),
        state_code:      z.string().length(2).optional(),
      });
      const body = schema.parse(req.body);

      // Eliminar entrada previa del mismo pasajero si existe
      await waitlistRepository.remove(req.user!.userId);

      const entry = await waitlistRepository.add({
        passengerId:    req.user!.userId,
        pickupLat:      body.pickup_lat,
        pickupLng:      body.pickup_lng,
        pickupAddress:  body.pickup_address,
        dropoffAddress: body.dropoff_address,
        serviceType:    body.service_type,
        stateCode:      body.state_code,
      });

      sendCreated(res, {
        entry,
        message: "You're on the waitlist. We'll notify you when a driver becomes available nearby.",
        expires_at: entry.expires_at,
      });
    } catch (err) { next(err); }
  },

  // GET /waitlist/status — estado de la espera del pasajero
  status: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const entry = await waitlistRepository.getByPassenger(req.user!.userId);
      sendSuccess(res, {
        on_waitlist: !!entry,
        entry:       entry ?? null,
      });
    } catch (err) { next(err); }
  },

  // DELETE /waitlist/leave — salir de la lista de espera
  leave: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await waitlistRepository.remove(req.user!.userId);
      sendNoContent(res);
    } catch (err) { next(err); }
  },
};
