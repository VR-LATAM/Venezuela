// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Cuentas de clínicas — portal web y solicitudes de transporte NEMT
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { clinicRepository } from '../repositories/clinicRepository';
import { generateClinicToken } from '../utils/jwt';
import { sendSuccess, sendCreated, sendError } from '../utils/response';

export const clinicController = {

  // ── Auth pública ─────────────────────────────────────────────

  // POST /clinic/auth/login
  login: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = z.object({
        email:    z.string().email(),
        password: z.string().min(1),
      }).parse(req.body);

      const clinic = await clinicRepository.findByEmail(email);
      if (!clinic || !clinic.password_hash) {
        sendError(res, 401, 'Invalid credentials', 'UNAUTHORIZED');
        return;
      }
      if (!clinic.is_active) {
        sendError(res, 403, 'Account is inactive. Contact VeronaRide support.', 'FORBIDDEN');
        return;
      }

      const valid = await bcrypt.compare(password, clinic.password_hash);
      if (!valid) {
        sendError(res, 401, 'Invalid credentials', 'UNAUTHORIZED');
        return;
      }

      const token = generateClinicToken({
        clinicId:   clinic.id,
        clinicName: clinic.name,
        email:      clinic.contact_email!,
      });

      sendSuccess(res, {
        token,
        clinic: {
          id:            clinic.id,
          name:          clinic.name,
          contact_name:  clinic.contact_name,
          contact_email: clinic.contact_email,
          plan:          clinic.plan,
        },
      });
    } catch (err) { next(err); }
  },

  // ── Rutas protegidas (clinic JWT o API key) ───────────────────

  // GET /clinic/me
  me: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clinic = (req as any).clinic;
      sendSuccess(res, { clinic });
    } catch (err) { next(err); }
  },

  // GET /clinic/stats
  stats: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clinic = (req as any).clinic;
      const stats  = await clinicRepository.getStats(clinic.id);
      sendSuccess(res, { stats });
    } catch (err) { next(err); }
  },

  // POST /clinic/request
  createRequest: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        patient_name:    z.string().min(2).max(200),
        patient_phone:   z.string().max(20).optional(),
        pickup_address:  z.string().min(5),
        dropoff_address: z.string().min(5),
        scheduled_at:    z.string().datetime(),
        service_type:    z.enum(['accessible', 'standard', 'medical', 'dialysis']).default('accessible'),
        notes:           z.string().max(500).optional(),
        diagnosis_code:  z.string().max(20).optional(),
        passenger_id:    z.string().uuid().optional(),
      });
      const body   = schema.parse(req.body);
      const clinic = (req as any).clinic;

      const request = await clinicRepository.createRideRequest({
        clinicId:       clinic.id,
        patientName:    body.patient_name,
        patientPhone:   body.patient_phone,
        pickupAddress:  body.pickup_address,
        dropoffAddress: body.dropoff_address,
        scheduledAt:    body.scheduled_at,
        serviceType:    body.service_type,
        notes:          body.notes,
        diagnosisCode:  body.diagnosis_code,
        passengerId:    body.passenger_id,
      });

      sendCreated(res, { request });
    } catch (err) { next(err); }
  },

  // GET /clinic/requests
  getRequests: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clinic   = (req as any).clinic;
      const requests = await clinicRepository.getRequests(clinic.id);
      sendSuccess(res, { requests });
    } catch (err) { next(err); }
  },

  // PATCH /clinic/requests/:id/cancel
  cancelRequest: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clinic = (req as any).clinic;
      await clinicRepository.cancelRequest(req.params['id']!, clinic.id);
      sendSuccess(res, { cancelled: true });
    } catch (err) { next(err); }
  },

  // ── Admin ────────────────────────────────────────────────────

  // GET /admin/clinics
  listAll: async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clinics = await clinicRepository.listAll();
      sendSuccess(res, { clinics });
    } catch (err) { next(err); }
  },

  // GET /admin/clinics/all-requests
  allRequests: async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const requests = await clinicRepository.listAllRequests();
      sendSuccess(res, { requests });
    } catch (err) { next(err); }
  },

  // POST /admin/clinics
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        name:          z.string().min(2).max(200),
        address:       z.string().optional(),
        contact_name:  z.string().max(100).optional(),
        contact_email: z.string().email().optional(),
        contact_phone: z.string().max(20).optional(),
        billing_code:  z.string().max(50).optional(),
        plan:          z.enum(['basic', 'professional', 'enterprise']).default('basic'),
        password:      z.string().min(8),
      });
      const body        = schema.parse(req.body);
      const passwordHash = await bcrypt.hash(body.password, 12);

      const clinic = await clinicRepository.create({
        name:          body.name,
        address:       body.address,
        contactName:   body.contact_name,
        contactEmail:  body.contact_email,
        contactPhone:  body.contact_phone,
        billingCode:   body.billing_code,
        plan:          body.plan,
        passwordHash,
      });
      sendCreated(res, { clinic });
    } catch (err) { next(err); }
  },

  // PATCH /admin/clinics/:id/reset-password
  resetPassword: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { password } = z.object({ password: z.string().min(8) }).parse(req.body);
      const hash         = await bcrypt.hash(password, 12);
      await clinicRepository.setPassword(req.params['id']!, hash);
      sendSuccess(res, { updated: true });
    } catch (err) { next(err); }
  },

  // PATCH /admin/clinics/:id/toggle
  toggleActive: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { is_active } = z.object({ is_active: z.boolean() }).parse(req.body);
      const clinic        = await clinicRepository.toggleActive(req.params['id']!, is_active);
      sendSuccess(res, { clinic });
    } catch (err) { next(err); }
  },

  // GET /admin/clinics/pending-requests
  pendingRequests: async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const requests = await clinicRepository.listPendingRequests();
      sendSuccess(res, { requests });
    } catch (err) { next(err); }
  },

  // PATCH /admin/clinics/requests/:id/link
  linkRide: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ride_id } = z.object({ ride_id: z.string().uuid() }).parse(req.body);
      await clinicRepository.linkRide(req.params['id']!, ride_id);
      sendSuccess(res, { linked: true });
    } catch (err) { next(err); }
  },
};
