// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Repositorio de membresías semanales de conductores
// ═══════════════════════════════════════════════════════════════

import { db } from '../config/database';

export interface DriverMembership {
  id:                string;
  driver_id:         string;
  vehicle_type:      string;
  amount_usd:        number;
  period_start:      string;
  period_end:        string;
  status:            string;
  payment_method:    string | null;
  payment_reference: string | null;
  submitted_at:      string | null;
  approved_by:       string | null;
  approved_at:       string | null;
  rejection_reason:  string | null;
  created_at:        string;
}

/* Devuelve el sábado más reciente (inicio del período actual) */
export function currentPeriodStart(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Dom ... 6=Sáb
  const daysSinceSaturday = (day + 1) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - daysSinceSaturday);
  start.setHours(0, 0, 1, 0); // 00:00:01
  return start;
}

export function currentPeriodEnd(start: Date): Date {
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // viernes siguiente
  end.setHours(23, 59, 59, 0); // 23:59:59
  return end;
}

export const membershipRepository = {

  getPlan(vehicleType: string) {
    return db.query<{ price_usd: number }>(
      'SELECT price_usd FROM membership_plans WHERE vehicle_type = $1',
      [vehicleType]
    );
  },

  getAllPlans() {
    return db.query<{ vehicle_type: string; price_usd: number }>(
      'SELECT vehicle_type, price_usd FROM membership_plans ORDER BY price_usd'
    );
  },

  /* Membresía activa del conductor en el período actual */
  async getCurrentMembership(driverId: string): Promise<DriverMembership | null> {
    const start = currentPeriodStart();
    const { rows } = await db.query<DriverMembership>(
      `SELECT * FROM driver_memberships
       WHERE driver_id = $1 AND period_start = $2
       LIMIT 1`,
      [driverId, start.toISOString().split('T')[0]]
    );
    return rows[0] ?? null;
  },

  /* Estado cacheado del conductor */
  async getDriverMembershipStatus(driverId: string): Promise<{ membership_status: string; membership_expires: string | null }> {
    const { rows } = await db.query<{ membership_status: string; membership_expires: string | null }>(
      'SELECT membership_status, membership_expires FROM drivers WHERE id = $1',
      [driverId]
    );
    return rows[0] ?? { membership_status: 'inactive', membership_expires: null };
  },

  /* Historial de membresías del conductor (últimas 12) */
  async getHistory(driverId: string): Promise<DriverMembership[]> {
    const { rows } = await db.query<DriverMembership>(
      `SELECT * FROM driver_memberships
       WHERE driver_id = $1
       ORDER BY period_start DESC
       LIMIT 12`,
      [driverId]
    );
    return rows;
  },

  /* Crear registro de membresía para el período actual */
  async createForCurrentPeriod(
    driverId: string,
    vehicleType: string,
    amountUsd: number,
  ): Promise<DriverMembership> {
    const start = currentPeriodStart();
    const end   = currentPeriodEnd(start);
    const { rows } = await db.query<DriverMembership>(
      `INSERT INTO driver_memberships
         (driver_id, vehicle_type, amount_usd, period_start, period_end, status)
       VALUES ($1, $2, $3, $4, $5, 'pending_payment')
       ON CONFLICT (driver_id, period_start) DO UPDATE
         SET vehicle_type = EXCLUDED.vehicle_type,
             amount_usd   = EXCLUDED.amount_usd
       RETURNING *`,
      [driverId, vehicleType, amountUsd, start.toISOString().split('T')[0], end.toISOString().split('T')[0]]
    );
    return rows[0];
  },

  /* Conductor envía comprobante de pago */
  async submitPayment(
    membershipId: string,
    driverId:     string,
    method:       string,
    reference:    string,
  ): Promise<DriverMembership | null> {
    const { rows } = await db.query<DriverMembership>(
      `UPDATE driver_memberships
       SET status            = 'pending_approval',
           payment_method    = $3,
           payment_reference = $4,
           submitted_at      = now()
       WHERE id = $1 AND driver_id = $2
         AND status IN ('pending_payment', 'rejected')
       RETURNING *`,
      [membershipId, driverId, method, reference]
    );
    if (rows[0]) {
      await db.query(
        `UPDATE drivers SET membership_status = 'pending_approval' WHERE id = $1`,
        [driverId]
      );
    }
    return rows[0] ?? null;
  },

  /* Admin aprueba membresía */
  async approve(membershipId: string, adminId: string): Promise<DriverMembership | null> {
    const { rows } = await db.query<DriverMembership>(
      `UPDATE driver_memberships
       SET status      = 'active',
           approved_by = $2,
           approved_at = now()
       WHERE id = $1 AND status = 'pending_approval'
       RETURNING *`,
      [membershipId, adminId]
    );
    if (rows[0]) {
      await db.query(
        `UPDATE drivers
         SET membership_status  = 'active',
             membership_expires = $2
         WHERE id = $1`,
        [rows[0].driver_id, rows[0].period_end]
      );
    }
    return rows[0] ?? null;
  },

  /* Admin rechaza membresía */
  async reject(membershipId: string, adminId: string, reason: string): Promise<DriverMembership | null> {
    const { rows } = await db.query<DriverMembership>(
      `UPDATE driver_memberships
       SET status           = 'rejected',
           approved_by      = $2,
           approved_at      = now(),
           rejection_reason = $3
       WHERE id = $1 AND status = 'pending_approval'
       RETURNING *`,
      [membershipId, adminId, reason]
    );
    if (rows[0]) {
      await db.query(
        `UPDATE drivers SET membership_status = 'inactive' WHERE id = $1`,
        [rows[0].driver_id]
      );
    }
    return rows[0] ?? null;
  },

  /* Pendientes de aprobación para el admin */
  async listPending(): Promise<Array<DriverMembership & { driver_name: string; driver_phone: string }>> {
    const { rows } = await db.query<DriverMembership & { driver_name: string; driver_phone: string }>(
      `SELECT dm.*,
              u.name   AS driver_name,
              u.phone  AS driver_phone
       FROM driver_memberships dm
       JOIN users u ON u.id = dm.driver_id
       WHERE dm.status = 'pending_approval'
       ORDER BY dm.submitted_at ASC`
    );
    return rows;
  },

  /* Penalidad por rechazo: incrementa contador semanal y devuelve el total */
  async incrementRejectionCounter(driverId: string): Promise<{ consecutive_rejections: number }> {
    const { rows } = await db.query<{ consecutive_rejections: number }>(
      `UPDATE drivers
       SET consecutive_rejections = consecutive_rejections + 1
       WHERE id = $1
       RETURNING consecutive_rejections`,
      [driverId]
    );
    return rows[0] ?? { consecutive_rejections: 0 };
  },

  /* Resetea el contador de rechazos de todos los conductores activos cada semana */
  async resetWeeklyRejectionCounters(): Promise<void> {
    await db.query(
      `UPDATE drivers
       SET consecutive_rejections = 0
       WHERE status = 'active'
         AND membership_status NOT IN ('suspended_penalty')`
    );
  },

  /* Suspensión por penalidad: guarda crédito de días y fecha de reactivación */
  async applySuspensionPenalty(
    driverId:           string,
    creditDays:         number,
    reactivationDate:   string,
  ): Promise<void> {
    await db.query(
      `UPDATE drivers
       SET membership_status             = 'suspended_penalty',
           suspension_credit_days        = $2,
           suspension_reactivation_date  = $3,
           consecutive_rejections        = 0,
           is_online                     = false
       WHERE id = $1`,
      [driverId, creditDays, reactivationDate]
    );
  },

  /* Cron diario: reactiva conductores cuya fecha de reactivación es hoy */
  async reactivatePenaltySuspended(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const periodEnd = currentPeriodEnd(currentPeriodStart()).toISOString().split('T')[0];
    const { rowCount } = await db.query(
      `UPDATE drivers
       SET membership_status             = 'active',
           membership_expires            = $2,
           suspension_credit_days        = 0,
           suspension_reactivation_date  = NULL
       WHERE membership_status = 'suspended_penalty'
         AND suspension_reactivation_date <= $1`,
      [today, periodEnd]
    );
    return rowCount ?? 0;
  },

  /* Cron: marcar expiradas y suspender conductores */
  async expireAndSuspend(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    /* Marcar membresías cuyo período ya terminó y no fueron aprobadas */
    await db.query(
      `UPDATE driver_memberships
       SET status = 'expired'
       WHERE period_end < $1
         AND status IN ('pending_payment', 'rejected')`,
      [today]
    );

    /* Suspender conductores cuya membresía venció */
    const { rowCount } = await db.query(
      `UPDATE drivers
       SET membership_status = 'suspended'
       WHERE membership_status IN ('active', 'pending_approval', 'inactive')
         AND (membership_expires IS NULL OR membership_expires < $1)
         AND status = 'active'`,
      [today]
    );
    return rowCount ?? 0;
  },
};
