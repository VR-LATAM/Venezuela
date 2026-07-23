// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { accessibilityRepository } from '../repositories/accessibilityRepository';
import { sendSuccess } from '../utils/response';

const profileSchema = z.object({
  wheelchair:          z.boolean().optional(),
  walker:              z.boolean().optional(),
  white_cane:          z.boolean().optional(),
  service_animal:      z.boolean().optional(),
  oxygen_support:      z.boolean().optional(),
  hearing_impaired:    z.boolean().optional(),
  visual_impaired:     z.boolean().optional(),
  cognitive_support:   z.boolean().optional(),
  extra_time_boarding: z.boolean().optional(),
  notes:               z.string().max(500).optional(),
});

export const accessibilityController = {

  // GET /accessibility/profile
  get: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await accessibilityRepository.get(req.user!.userId);
      sendSuccess(res, { profile: profile ?? null });
    } catch (err) { next(err); }
  },

  // PUT /accessibility/profile
  upsert: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = profileSchema.parse(req.body);
      const profile = await accessibilityRepository.upsert(req.user!.userId, data);
      sendSuccess(res, { profile });
    } catch (err) { next(err); }
  },
};
