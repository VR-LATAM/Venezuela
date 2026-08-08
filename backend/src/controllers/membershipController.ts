// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Controlador de membresías semanales de conductores
// ═══════════════════════════════════════════════════════════════

import { Request, Response } from 'express';
import { db } from '../config/database';
import { membershipRepository, currentPeriodStart, currentPeriodEnd } from '../repositories/membershipRepository';
import { sendSuccess, sendError, ApiErrors } from '../utils/response';

const PAYMENT_METHODS = ['zelle', 'wire', 'pago_movil', 'efectivo'] as const;
const VEHICLE_TYPES   = ['moto', 'sedan', 'suv'] as const;

export const membershipController = {

  /* GET /membership/status — estado actual del conductor */
  async getStatus(req: Request, res: Response) {
    const driverId = req.user!.userId;

    const [cached, current, history, plans] = await Promise.all([
      membershipRepository.getDriverMembershipStatus(driverId),
      membershipRepository.getCurrentMembership(driverId),
      membershipRepository.getHistory(driverId),
      membershipRepository.getAllPlans(),
    ]);

    const periodStart = currentPeriodStart();
    const periodEnd   = currentPeriodEnd(periodStart);

    const nextFriday = new Date(periodStart);
    nextFriday.setDate(periodStart.getDate() + 7);

    sendSuccess(res, {
      status:            cached.membership_status,
      expires:           cached.membership_expires,
      currentPeriod: {
        start: periodStart.toISOString().split('T')[0],
        end:   periodEnd.toISOString().split('T')[0],
      },
      nextPaymentDate:   nextFriday.toISOString().split('T')[0],
      currentMembership: current,
      history,
      plans:             plans.rows,
    });
  },

  /* POST /membership/initiate — conductor inicia trámite indicando su tipo de vehículo */
  async initiate(req: Request, res: Response) {
    const driverId    = req.user!.userId;
    const { vehicle_type } = req.body as { vehicle_type?: string };

    if (!vehicle_type || !VEHICLE_TYPES.includes(vehicle_type as any)) {
      return sendError(res, 422, 'vehicle_type debe ser moto, sedan o suv', 'VALIDATION_ERROR');
    }

    const { rows: planRows } = await db.query<{ price_usd: number }>(
      'SELECT price_usd FROM membership_plans WHERE vehicle_type = $1',
      [vehicle_type]
    );
    if (!planRows[0]) return sendError(res, 400, 'Tipo de vehículo sin plan de membresía', 'NO_PLAN');

    const membership = await membershipRepository.createForCurrentPeriod(
      driverId,
      vehicle_type,
      planRows[0].price_usd,
    );

    sendSuccess(res, { membership }, 201);
  },

  /* POST /membership/submit — conductor envía comprobante de pago */
  async submitPayment(req: Request, res: Response) {
    const driverId  = req.user!.userId;
    const { membership_id, payment_method, payment_reference } = req.body as {
      membership_id:     string;
      payment_method:    string;
      payment_reference: string;
    };

    if (!membership_id || !payment_method || !payment_reference?.trim()) {
      return sendError(res, 422, 'membership_id, payment_method y payment_reference son requeridos', 'VALIDATION_ERROR');
    }
    if (!PAYMENT_METHODS.includes(payment_method as any)) {
      return sendError(res, 422, 'Método de pago inválido', 'VALIDATION_ERROR');
    }

    const membership = await membershipRepository.submitPayment(
      membership_id,
      driverId,
      payment_method,
      payment_reference.trim(),
    );

    if (!membership) {
      return sendError(res, 404, 'Membresía no encontrada o ya fue procesada', 'NOT_FOUND');
    }

    sendSuccess(res, { membership });
  },

  /* ─── Admin ────────────────────────────────────────────────── */

  /* GET /admin/memberships/pending */
  async listPending(_req: Request, res: Response) {
    const pending = await membershipRepository.listPending();
    sendSuccess(res, { memberships: pending, total: pending.length });
  },

  /* POST /admin/memberships/:id/approve */
  async approve(req: Request, res: Response) {
    const adminId = req.user!.userId;
    const { id }  = req.params;

    const membership = await membershipRepository.approve(id, adminId);
    if (!membership) return sendError(res, 404, 'Membresía no encontrada o ya procesada', 'NOT_FOUND');

    sendSuccess(res, { membership });
  },

  /* POST /admin/memberships/:id/reject */
  async reject(req: Request, res: Response) {
    const adminId = req.user!.userId;
    const { id }  = req.params;
    const { reason } = req.body as { reason?: string };

    if (!reason?.trim()) {
      return sendError(res, 422, 'El motivo de rechazo es requerido', 'VALIDATION_ERROR');
    }

    const membership = await membershipRepository.reject(id, adminId, reason.trim());
    if (!membership) return sendError(res, 404, 'Membresía no encontrada o ya procesada', 'NOT_FOUND');

    sendSuccess(res, { membership });
  },
};
