// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Repositorio de pagos — métodos de pago y retiros
// Tablas: passenger_payment_methods, driver_withdrawals
// ═══════════════════════════════════════════════════════════════

import { db } from '../config/database';

export interface PaymentMethod {
  id:                       string;
  passenger_id:             string;
  stripe_payment_method_id: string;
  brand:                    string;
  last4:                    string;
  exp_month:                number;
  exp_year:                 number;
  is_default:               boolean;
  created_at:               Date;
}

export interface DriverWithdrawal {
  id:                 string;
  driver_id:          string;
  amount:             number;
  status:             'pending' | 'processing' | 'completed' | 'failed';
  stripe_transfer_id: string | null;
  failure_reason:     string | null;
  requested_at:       Date;
  completed_at:       Date | null;
}

export const paymentRepository = {

  // ─────────────────────────────────────────────────────────────
  // MÉTODOS DE PAGO DE PASAJEROS
  // ─────────────────────────────────────────────────────────────

  // Guarda los datos de un nuevo método de pago después de confirmar el SetupIntent
  addPaymentMethod: async (params: {
    passengerId:           string;
    stripePaymentMethodId: string;
    brand:                 string;
    last4:                 string;
    expMonth:              number;
    expYear:               number;
    setAsDefault:          boolean;
  }): Promise<PaymentMethod> => {
    // Si se marca como default, quitar el default anterior
    if (params.setAsDefault) {
      await db.query(
        `UPDATE passenger_payment_methods SET is_default = false WHERE passenger_id = $1`,
        [params.passengerId]
      );
    }

    const { rows } = await db.query<PaymentMethod>(
      `INSERT INTO passenger_payment_methods
         (passenger_id, stripe_payment_method_id, brand, last4, exp_month, exp_year, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        params.passengerId,
        params.stripePaymentMethodId,
        params.brand,
        params.last4,
        params.expMonth,
        params.expYear,
        params.setAsDefault,
      ]
    );
    return rows[0];
  },

  // Lista los métodos de pago de un pasajero (default primero)
  listByPassenger: async (passengerId: string): Promise<PaymentMethod[]> => {
    const { rows } = await db.query<PaymentMethod>(
      `SELECT * FROM passenger_payment_methods
       WHERE passenger_id = $1
       ORDER BY is_default DESC, created_at ASC`,
      [passengerId]
    );
    return rows;
  },

  // Busca un método de pago por ID y pasajero (para validar propiedad)
  findById: async (id: string, passengerId: string): Promise<PaymentMethod | null> => {
    const { rows } = await db.query<PaymentMethod>(
      `SELECT * FROM passenger_payment_methods WHERE id = $1 AND passenger_id = $2`,
      [id, passengerId]
    );
    return rows[0] ?? null;
  },

  // Obtiene el método de pago por defecto del pasajero
  getDefault: async (passengerId: string): Promise<PaymentMethod | null> => {
    const { rows } = await db.query<PaymentMethod>(
      `SELECT * FROM passenger_payment_methods WHERE passenger_id = $1 AND is_default = true LIMIT 1`,
      [passengerId]
    );
    return rows[0] ?? null;
  },

  // Elimina un método de pago de la BD
  remove: async (id: string, passengerId: string): Promise<boolean> => {
    const { rowCount } = await db.query(
      `DELETE FROM passenger_payment_methods WHERE id = $1 AND passenger_id = $2`,
      [id, passengerId]
    );
    return (rowCount ?? 0) > 0;
  },

  // Cambia el método de pago por defecto del pasajero
  setDefault: async (id: string, passengerId: string): Promise<boolean> => {
    await db.query(
      `UPDATE passenger_payment_methods SET is_default = false WHERE passenger_id = $1`,
      [passengerId]
    );
    const { rowCount } = await db.query(
      `UPDATE passenger_payment_methods SET is_default = true WHERE id = $1 AND passenger_id = $2`,
      [id, passengerId]
    );
    return (rowCount ?? 0) > 0;
  },

  // Actualiza el stripe_customer_id del pasajero
  setStripeCustomerId: async (passengerId: string, stripeCustomerId: string): Promise<void> => {
    await db.query(
      `UPDATE passengers SET stripe_customer_id = $1 WHERE id = $2`,
      [stripeCustomerId, passengerId]
    );
  },

  // Obtiene el stripe_customer_id del pasajero
  getStripeCustomerId: async (passengerId: string): Promise<string | null> => {
    const { rows } = await db.query<{ stripe_customer_id: string | null }>(
      `SELECT stripe_customer_id FROM passengers WHERE id = $1`,
      [passengerId]
    );
    return rows[0]?.stripe_customer_id ?? null;
  },

  // ─────────────────────────────────────────────────────────────
  // STRIPE CONNECT DE CONDUCTORES
  // ─────────────────────────────────────────────────────────────

  setDriverStripeAccount: async (driverId: string, stripeAccountId: string): Promise<void> => {
    await db.query(
      `UPDATE drivers SET stripe_account_id = $1 WHERE id = $2`,
      [stripeAccountId, driverId]
    );
  },

  setDriverStripeVerified: async (driverId: string, verified: boolean): Promise<void> => {
    await db.query(
      `UPDATE drivers SET stripe_account_verified = $1 WHERE id = $2`,
      [verified, driverId]
    );
  },

  getDriverStripeInfo: async (driverId: string): Promise<{
    stripe_account_id:       string | null;
    stripe_account_verified: boolean;
    available_balance:       number;
  } | null> => {
    const { rows } = await db.query<{
      stripe_account_id:       string | null;
      stripe_account_verified: boolean;
      available_balance:       number;
    }>(
      `SELECT stripe_account_id, stripe_account_verified, available_balance FROM drivers WHERE id = $1`,
      [driverId]
    );
    return rows[0] ?? null;
  },

  // ─────────────────────────────────────────────────────────────
  // RETIROS DE CONDUCTORES
  // ─────────────────────────────────────────────────────────────

  createWithdrawal: async (params: {
    driverId:     string;
    amount:       number;
    stripeTransferId?: string;
  }): Promise<DriverWithdrawal> => {
    const { rows } = await db.query<DriverWithdrawal>(
      `INSERT INTO driver_withdrawals (driver_id, amount, status, stripe_transfer_id)
       VALUES ($1, $2, 'pending', $3)
       RETURNING *`,
      [params.driverId, params.amount, params.stripeTransferId ?? null]
    );
    return rows[0];
  },

  updateWithdrawalStatus: async (
    withdrawalId: string,
    status:       'processing' | 'completed' | 'failed',
    opts?: { stripeTransferId?: string; failureReason?: string }
  ): Promise<void> => {
    const completedAt = status === 'completed' ? new Date() : null;
    await db.query(
      `UPDATE driver_withdrawals
       SET status = $1, stripe_transfer_id = COALESCE($2, stripe_transfer_id),
           failure_reason = $3, completed_at = $4
       WHERE id = $5`,
      [status, opts?.stripeTransferId ?? null, opts?.failureReason ?? null, completedAt, withdrawalId]
    );
  },

  listWithdrawalsByDriver: async (driverId: string, limit = 20): Promise<DriverWithdrawal[]> => {
    const { rows } = await db.query<DriverWithdrawal>(
      `SELECT * FROM driver_withdrawals WHERE driver_id = $1 ORDER BY requested_at DESC LIMIT $2`,
      [driverId, limit]
    );
    return rows;
  },

  // Descuenta el balance disponible del conductor cuando solicita retiro
  deductDriverBalance: async (driverId: string, amount: number): Promise<boolean> => {
    const { rowCount } = await db.query(
      `UPDATE drivers
       SET available_balance = available_balance - $1
       WHERE id = $2 AND available_balance >= $1`,
      [amount, driverId]
    );
    return (rowCount ?? 0) > 0;
  },

  // ─────────────────────────────────────────────────────────────
  // GANANCIAS — resumen para la pantalla del conductor
  // ─────────────────────────────────────────────────────────────
  getEarningsSummary: async (driverId: string): Promise<{
    today:        number;
    this_week:    number;
    this_month:   number;
    total_earned: number;
    available_balance: number;
  }> => {
    const { rows } = await db.query<{
      today:        string;
      this_week:    string;
      this_month:   string;
      total_earned: string;
      available_balance: string;
    }>(
      `SELECT
        COALESCE(SUM(net_amount) FILTER (WHERE created_at >= CURRENT_DATE), 0)                         AS today,
        COALESCE(SUM(net_amount) FILTER (WHERE created_at >= DATE_TRUNC('week',  NOW())), 0)            AS this_week,
        COALESCE(SUM(net_amount) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW())), 0)            AS this_month,
        (SELECT total_earned      FROM drivers WHERE id = $1)                                           AS total_earned,
        (SELECT available_balance FROM drivers WHERE id = $1)                                           AS available_balance
       FROM driver_earnings
       WHERE driver_id = $1`,
      [driverId]
    );
    const r = rows[0];
    return {
      today:             parseFloat(r.today),
      this_week:         parseFloat(r.this_week),
      this_month:        parseFloat(r.this_month),
      total_earned:      parseFloat(r.total_earned ?? '0'),
      available_balance: parseFloat(r.available_balance ?? '0'),
    };
  },

  getRecentEarnings: async (driverId: string, limit = 30): Promise<{
    id:          string;
    type:        string;
    gross_amount: number;
    net_amount:  number;
    description: string | null;
    created_at:  Date;
  }[]> => {
    const { rows } = await db.query(
      `SELECT id, type, gross_amount::float, net_amount::float, description, created_at
       FROM driver_earnings
       WHERE driver_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [driverId, limit]
    );
    return rows;
  },
};
