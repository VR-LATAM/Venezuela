// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Controlador de pasajeros — perfil y necesidades especiales
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { passengerRepository } from '../repositories/passengerRepository';
import { sendSuccess, sendError } from '../utils/response';

const SPECIAL_NEEDS_CATEGORIES = ['none', 'pregnant', 'wheelchair', 'visual_impairment',
  'hearing_impairment', 'elderly', 'minor', 'medical'] as const;

const specialNeedsSchema = z.object({
  category: z.enum(SPECIAL_NEEDS_CATEGORIES).optional(),
  categories: z.array(z.enum(SPECIAL_NEEDS_CATEGORIES)).optional(),
  needs_physical_help:        z.boolean().optional(),
  uses_wheelchair:            z.boolean().optional(),
  uses_walker:                z.boolean().optional(),
  uses_cane:                  z.boolean().optional(),
  needs_ramp:                 z.boolean().optional(),
  traveling_with_companion:   z.boolean().optional(),
  guide_dog:                  z.boolean().optional(),
  communication_method: z.enum(['verbal', 'text', 'sign_language', 'lip_reading']).optional(),
  carries_medical_equipment:  z.boolean().optional(),
  medical_equipment_details:  z.string().max(200).optional(),
  needs_baby_seat:            z.boolean().optional(),
  can_travel_alone:           z.boolean().optional(),
  emergency_contact_name:     z.string().max(100).optional(),
  emergency_contact_phone:    z.string().max(20).optional(),
  special_instructions:       z.string().max(500).optional(),
});

export const passengerController = {
  // GET /passenger/profile
  getProfile: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const passenger = await passengerRepository.findById(req.user!.userId);
      if (!passenger) {
        sendError(res, 404, 'Passenger profile not found', 'NOT_FOUND');
        return;
      }

      // Contar viajes de la semana y del mes para el badge de pasajero frecuente
      const { queryOne } = await import('../config/database');
      const rideCounts = await queryOne<{ rides_this_week: string; rides_this_month: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE completed_at >= date_trunc('week', NOW()))::text  AS rides_this_week,
           COUNT(*) FILTER (WHERE completed_at >= date_trunc('month', NOW()))::text AS rides_this_month
         FROM rides
         WHERE passenger_id = $1 AND status = 'completed'`,
        [req.user!.userId]
      );

      sendSuccess(res, {
        ...passenger,
        rides_this_week:  parseInt(rideCounts?.rides_this_week  ?? '0'),
        rides_this_month: parseInt(rideCounts?.rides_this_month ?? '0'),
        is_frequent_passenger: (parseInt(rideCounts?.rides_this_week ?? '0') >= 25) ||
                               (parseInt(rideCounts?.rides_this_month ?? '0') >= 50),
      });
    } catch (err) {
      next(err);
    }
  },

  // PATCH /passenger/special-needs — actualizar necesidades especiales
  updateSpecialNeeds: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = specialNeedsSchema.parse(req.body);
      await passengerRepository.updateSpecialNeeds(req.user!.userId, body);
      const updated = await passengerRepository.findById(req.user!.userId);
      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  },

  // PATCH /passenger/emergency-contact — guardar contacto de emergencia
  updateEmergencyContact: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        name:  z.string().min(2).max(100),
        phone: z.string().max(20).optional(),
        email: z.string().email().optional(),
      });
      const { name, phone, email } = schema.parse(req.body);
      const { queryOne } = await import('../config/database');
      await queryOne(
        `UPDATE passengers SET
           emergency_contact_name  = $1,
           emergency_contact_phone = $2,
           emergency_contact_email = $3
         WHERE id = $4`,
        [name, phone ?? null, email ?? null, req.user!.userId]
      );
      sendSuccess(res, { saved: true });
    } catch (err) {
      next(err);
    }
  },
};
