// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Incidentes durante el viaje — reporte y gestión admin
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { incidentRepository, INCIDENT_TYPES } from '../repositories/incidentRepository';
import { sendSuccess, sendCreated, sendError } from '../utils/response';

export const incidentController = {

  // POST /incident — reportar un incidente
  report: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        ride_id:       z.string().uuid(),
        incident_type: z.enum(INCIDENT_TYPES),
        description:   z.string().max(1000).optional(),
        lat:           z.number().optional(),
        lng:           z.number().optional(),
      });
      const body = schema.parse(req.body);

      const incident = await incidentRepository.create({
        rideId:       body.ride_id,
        reporterId:   req.user!.userId,
        reporterRole: req.user!.role,
        incidentType: body.incident_type,
        description:  body.description,
        lat:          body.lat,
        lng:          body.lng,
      });

      sendCreated(res, { incident });
    } catch (err) { next(err); }
  },

  // GET /incident/mine — incidentes reportados por el usuario
  getMine: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const incidents = await incidentRepository.getByUser(req.user!.userId);
      sendSuccess(res, { incidents });
    } catch (err) { next(err); }
  },

  // GET /incident/ride/:rideId — incidentes de un viaje
  getByRide: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const incidents = await incidentRepository.getByRide(req.params['rideId']!);
      sendSuccess(res, { incidents });
    } catch (err) { next(err); }
  },

  // ── Admin ────────────────────────────────────────────────────

  // GET /admin/incidents — listar incidentes abiertos
  listOpen: async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const incidents = await incidentRepository.listOpen();
      sendSuccess(res, { incidents });
    } catch (err) { next(err); }
  },

  // PUT /admin/incidents/:id/resolve
  resolve: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { notes } = z.object({ notes: z.string().min(5).max(1000) }).parse(req.body);
      await incidentRepository.resolve(req.params['id']!, notes);
      sendSuccess(res, { resolved: true, id: req.params['id'] });
    } catch (err) { next(err); }
  },
};
