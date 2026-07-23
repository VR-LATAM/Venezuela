// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { queryOne, query as queryMany } from '../config/database';

export const corporateRepository = {

  // ── Cuentas corporativas ──────────────────────────────────────

  findById: (id: string) =>
    queryOne<any>(
      `SELECT * FROM corporate_accounts WHERE id = $1`,
      [id]
    ),

  findAll: () =>
    queryMany<any>(
      `SELECT ca.*,
              COUNT(ce.id) AS employee_count
       FROM corporate_accounts ca
       LEFT JOIN corporate_employees ce ON ce.corporate_id = ca.id AND ce.is_active = true
       GROUP BY ca.id
       ORDER BY ca.created_at DESC`
    ),

  create: (data: {
    company_name: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    billing_email?: string;
    tax_id?: string;
    address?: string;
    monthly_spending_limit?: number;
    notes?: string;
  }) =>
    queryOne<any>(
      `INSERT INTO corporate_accounts
         (company_name, contact_name, contact_email, contact_phone,
          billing_email, tax_id, address, monthly_spending_limit, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        data.company_name, data.contact_name ?? null, data.contact_email ?? null,
        data.contact_phone ?? null, data.billing_email ?? null, data.tax_id ?? null,
        data.address ?? null, data.monthly_spending_limit ?? null, data.notes ?? null,
      ]
    ),

  update: (id: string, data: Partial<{
    company_name: string; contact_name: string; contact_email: string;
    contact_phone: string; billing_email: string; tax_id: string;
    address: string; monthly_spending_limit: number; is_active: boolean; notes: string;
  }>) => {
    const fields = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k], i) => `${k} = $${i + 2}`)
      .join(', ');
    const values = Object.values(data).filter(v => v !== undefined);
    return queryOne<any>(
      `UPDATE corporate_accounts SET ${fields}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
  },

  // ── Empleados ─────────────────────────────────────────────────

  findEmployees: (corporateId: string) =>
    queryMany<any>(
      `SELECT ce.*, u.full_name, u.email, u.phone
       FROM corporate_employees ce
       JOIN passengers p ON p.id = ce.passenger_id
       JOIN users u ON u.id = p.id
       WHERE ce.corporate_id = $1
       ORDER BY ce.created_at DESC`,
      [corporateId]
    ),

  findEmployeeByPassenger: (passengerId: string) =>
    queryOne<any>(
      `SELECT ce.*, ca.company_name, ca.monthly_spending_limit AS company_limit
       FROM corporate_employees ce
       JOIN corporate_accounts ca ON ca.id = ce.corporate_id
       WHERE ce.passenger_id = $1 AND ce.is_active = true AND ca.is_active = true`,
      [passengerId]
    ),

  addEmployee: (data: {
    corporate_id: string;
    passenger_id: string;
    employee_code?: string;
    department?: string;
    spending_limit?: number;
    can_use_vip?: boolean;
  }) =>
    queryOne<any>(
      `INSERT INTO corporate_employees
         (corporate_id, passenger_id, employee_code, department, spending_limit, can_use_vip, approved_at)
       VALUES ($1,$2,$3,$4,$5,$6, NOW())
       ON CONFLICT (corporate_id, passenger_id) DO UPDATE
         SET is_active = true, approved_at = NOW()
       RETURNING *`,
      [
        data.corporate_id, data.passenger_id, data.employee_code ?? null,
        data.department ?? null, data.spending_limit ?? null, data.can_use_vip ?? false,
      ]
    ),

  removeEmployee: (corporateId: string, passengerId: string) =>
    queryOne<any>(
      `UPDATE corporate_employees SET is_active = false
       WHERE corporate_id = $1 AND passenger_id = $2 RETURNING id`,
      [corporateId, passengerId]
    ),

  updateEmployeeSpending: (corporateId: string, passengerId: string, amount: number) =>
    queryOne<any>(
      `UPDATE corporate_employees
       SET spent_this_month = spent_this_month + $3
       WHERE corporate_id = $1 AND passenger_id = $2 RETURNING spent_this_month`,
      [corporateId, passengerId, amount]
    ),

  resetMonthlySpending: (corporateId: string) =>
    queryOne<any>(
      `UPDATE corporate_employees SET spent_this_month = 0
       WHERE corporate_id = $1`,
      [corporateId]
    ),

  // ── Facturas ──────────────────────────────────────────────────

  getMonthlyRides: (corporateId: string, start: string, end: string) =>
    queryMany<any>(
      `SELECT r.*, u.full_name AS passenger_name, ce.employee_code, ce.department
       FROM rides r
       JOIN passengers p ON p.id = r.passenger_id
       JOIN users u ON u.id = p.id
       JOIN corporate_employees ce ON ce.passenger_id = r.passenger_id AND ce.corporate_id = $1
       WHERE r.corporate_account_id = $1
         AND r.created_at >= $2 AND r.created_at < $3
         AND r.status = 'completed'
       ORDER BY r.created_at ASC`,
      [corporateId, start, end]
    ),

  createInvoice: (data: {
    corporate_id: string;
    invoice_number: string;
    billing_period_start: string;
    billing_period_end: string;
    total_rides: number;
    total_amount: number;
    due_date: string;
  }) =>
    queryOne<any>(
      `INSERT INTO corporate_invoices
         (corporate_id, invoice_number, billing_period_start, billing_period_end,
          total_rides, total_amount, status, due_date)
       VALUES ($1,$2,$3,$4,$5,$6,'sent',$7)
       RETURNING *`,
      [
        data.corporate_id, data.invoice_number, data.billing_period_start,
        data.billing_period_end, data.total_rides, data.total_amount, data.due_date,
      ]
    ),

  getInvoices: (corporateId: string) =>
    queryMany<any>(
      `SELECT * FROM corporate_invoices WHERE corporate_id = $1 ORDER BY billing_period_start DESC`,
      [corporateId]
    ),

  markInvoicePaid: (invoiceId: string) =>
    queryOne<any>(
      `UPDATE corporate_invoices SET status = 'paid', paid_at = NOW() WHERE id = $1 RETURNING *`,
      [invoiceId]
    ),

  // Actualizar passenger_tier en passengers
  setPassengerTier: (passengerId: string, tier: 'standard' | 'vip' | 'corporate_employee') =>
    queryOne<any>(
      `UPDATE passengers SET passenger_tier = $2 WHERE id = $1 RETURNING id`,
      [passengerId, tier]
    ),
};
