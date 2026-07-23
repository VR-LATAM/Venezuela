// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { favoritesRepository } from '../repositories/favoritesRepository';
import { sendSuccess, sendCreated, sendError } from '../utils/response';

export const favoritesController = {

  // ── Destinations ────────────────────────────────────────────

  // GET /favorites/destinations
  getDestinations: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const destinations = await favoritesRepository.getDestinations(req.user!.userId);
      sendSuccess(res, { destinations });
    } catch (err) { next(err); }
  },

  // POST /favorites/destinations
  upsertDestination: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        name:    z.string().min(1).max(100),
        address: z.string().min(3),
        lat:     z.number().min(-90).max(90),
        lng:     z.number().min(-180).max(180),
        icon:    z.string().max(10).optional(),
      });
      const body = schema.parse(req.body);
      const dest = await favoritesRepository.upsertDestination(
        req.user!.userId, body.name, body.address, body.lat, body.lng, body.icon
      );
      sendCreated(res, { destination: dest });
    } catch (err) { next(err); }
  },

  // DELETE /favorites/destinations/:id
  deleteDestination: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await favoritesRepository.deleteDestination(req.user!.userId, req.params['id']!);
      sendSuccess(res, { deleted: true });
    } catch (err) { next(err); }
  },

  // ── Favorite Drivers ─────────────────────────────────────────

  // GET /favorites/drivers
  getFavoriteDrivers: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const drivers = await favoritesRepository.getFavoriteDrivers(req.user!.userId);
      sendSuccess(res, { drivers });
    } catch (err) { next(err); }
  },

  // POST /favorites/drivers/:driverId
  addFavoriteDriver: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({ note: z.string().max(500).optional() });
      const { note } = schema.parse(req.body);
      const fav = await favoritesRepository.addFavoriteDriver(req.user!.userId, req.params['driverId']!, note);
      sendCreated(res, { favorite: fav });
    } catch (err) { next(err); }
  },

  // DELETE /favorites/drivers/:driverId
  removeFavoriteDriver: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await favoritesRepository.removeFavoriteDriver(req.user!.userId, req.params['driverId']!);
      sendSuccess(res, { removed: true });
    } catch (err) { next(err); }
  },
};
