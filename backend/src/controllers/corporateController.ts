// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { Request, Response } from 'express';
import { corporateRepository } from '../repositories/corporateRepository';
import { vipRepository } from '../repositories/vipRepository';

// ── Cuentas corporativas (admin) ──────────────────────────────

export const listCorporateAccounts = async (_req: Request, res: Response) => {
  const accounts = await corporateRepository.findAll();
  res.json({ success: true, data: { accounts } });
};

export const createCorporateAccount = async (req: Request, res: Response) => {
  const account = await corporateRepository.create(req.body);
  res.status(201).json({ success: true, data: { account } });
};

export const updateCorporateAccount = async (req: Request, res: Response) => {
  const account = await corporateRepository.update(req.params.id, req.body);
  if (!account) { res.status(404).json({ success: false, message: 'Account not found' }); return; }
  res.json({ success: true, data: { account } });
};

// ── Empleados ─────────────────────────────────────────────────

export const listEmployees = async (req: Request, res: Response) => {
  const employees = await corporateRepository.findEmployees(req.params.id);
  res.json({ success: true, data: { employees } });
};

export const addEmployee = async (req: Request, res: Response) => {
  const { passenger_id, employee_code, department, spending_limit, can_use_vip } = req.body;
  const employee = await corporateRepository.addEmployee({
    corporate_id: req.params.id,
    passenger_id, employee_code, department, spending_limit, can_use_vip,
  });
  await corporateRepository.setPassengerTier(passenger_id, 'corporate_employee');
  res.status(201).json({ success: true, data: { employee } });
};

export const removeEmployee = async (req: Request, res: Response) => {
  await corporateRepository.removeEmployee(req.params.id, req.params.passengerId);
  await corporateRepository.setPassengerTier(req.params.passengerId, 'standard');
  res.json({ success: true });
};

// ── Facturación ───────────────────────────────────────────────

export const generateMonthlyInvoice = async (req: Request, res: Response) => {
  const { corporate_id } = req.params;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end   = new Date(now.getFullYear(), now.getMonth(), 1);

  const rides = await corporateRepository.getMonthlyRides(
    corporate_id,
    start.toISOString(),
    end.toISOString()
  );

  const total_amount = rides.reduce((sum: number, r: any) => sum + parseFloat(r.total_charged ?? 0), 0);
  const invoice_number = `CORP-${corporate_id.slice(0,8).toUpperCase()}-${start.getFullYear()}${String(start.getMonth()+1).padStart(2,'0')}`;
  const due_date = new Date(end.getTime() + 15 * 86400000).toISOString().split('T')[0];

  const invoice = await corporateRepository.createInvoice({
    corporate_id,
    invoice_number,
    billing_period_start: start.toISOString().split('T')[0],
    billing_period_end:   end.toISOString().split('T')[0],
    total_rides: rides.length,
    total_amount: parseFloat(total_amount.toFixed(2)),
    due_date,
  });

  res.json({ success: true, data: { invoice, rides } });
};

export const listInvoices = async (req: Request, res: Response) => {
  const invoices = await corporateRepository.getInvoices(req.params.corporate_id);
  res.json({ success: true, data: { invoices } });
};

export const markInvoicePaid = async (req: Request, res: Response) => {
  const invoice = await corporateRepository.markInvoicePaid(req.params.invoice_id);
  res.json({ success: true, data: { invoice } });
};

// ── Perfil corporativo del pasajero (mobile) ──────────────────

export const getMyCorpProfile = async (req: Request, res: Response) => {
  const passengerId = (req as any).user?.uid;
  const employee = await corporateRepository.findEmployeeByPassenger(passengerId);
  res.json({ success: true, data: { employee: employee ?? null } });
};

// ── VIP (admin) ───────────────────────────────────────────────

export const listVipPassengers = async (_req: Request, res: Response) => {
  const passengers = await vipRepository.findAll();
  res.json({ success: true, data: { passengers } });
};

export const createVipPassenger = async (req: Request, res: Response) => {
  const { passenger_id, preferred_driver_id, price_multiplier, priority_dispatch, dedicated_support, preferences } = req.body;
  const vip = await vipRepository.create({ passenger_id, preferred_driver_id, price_multiplier, priority_dispatch, dedicated_support, preferences });
  await corporateRepository.setPassengerTier(passenger_id, 'vip');
  res.status(201).json({ success: true, data: { vip } });
};

export const updateVipPassenger = async (req: Request, res: Response) => {
  const vip = await vipRepository.update(req.params.passenger_id, req.body);
  res.json({ success: true, data: { vip } });
};

export const removeVipPassenger = async (req: Request, res: Response) => {
  await vipRepository.remove(req.params.passenger_id);
  await corporateRepository.setPassengerTier(req.params.passenger_id, 'standard');
  res.json({ success: true });
};

export const setPreferredDriver = async (req: Request, res: Response) => {
  const vip = await vipRepository.setPreferredDriver(req.params.passenger_id, req.body.driver_id ?? null);
  res.json({ success: true, data: { vip } });
};

// ── Perfil VIP del pasajero (mobile) ─────────────────────────

export const getMyVipProfile = async (req: Request, res: Response) => {
  const passengerId = (req as any).user?.uid;
  const vip = await vipRepository.findByPassenger(passengerId);
  res.json({ success: true, data: { vip: vip ?? null } });
};
