// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  listCorporateAccounts, createCorporateAccount, updateCorporateAccount,
  listEmployees, addEmployee, removeEmployee,
  generateMonthlyInvoice, listInvoices, markInvoicePaid,
  getMyCorpProfile,
  listVipPassengers, createVipPassenger, updateVipPassenger,
  removeVipPassenger, setPreferredDriver, getMyVipProfile,
} from '../controllers/corporateController';

const router = Router();

// ── Rutas de pasajero (mobile) ────────────────────────────────
router.get('/my-corp-profile', requireAuth, requireRole('passenger'), getMyCorpProfile);
router.get('/my-vip-profile',  requireAuth, requireRole('passenger'), getMyVipProfile);

// ── Rutas admin — cuentas corporativas ───────────────────────
router.get('/',    requireAuth, requireRole('admin'), listCorporateAccounts);
router.post('/',   requireAuth, requireRole('admin'), createCorporateAccount);
router.patch('/:id', requireAuth, requireRole('admin'), updateCorporateAccount);

// Empleados
router.get('/:id/employees',                      requireAuth, requireRole('admin'), listEmployees);
router.post('/:id/employees',                     requireAuth, requireRole('admin'), addEmployee);
router.delete('/:id/employees/:passengerId',      requireAuth, requireRole('admin'), removeEmployee);

// Facturas
router.post('/:corporate_id/invoice/generate',   requireAuth, requireRole('admin'), generateMonthlyInvoice);
router.get('/:corporate_id/invoices',             requireAuth, requireRole('admin'), listInvoices);
router.patch('/invoices/:invoice_id/paid',        requireAuth, requireRole('admin'), markInvoicePaid);

// ── Rutas admin — VIP ─────────────────────────────────────────
router.get('/vip',                                requireAuth, requireRole('admin'), listVipPassengers);
router.post('/vip',                               requireAuth, requireRole('admin'), createVipPassenger);
router.patch('/vip/:passenger_id',                requireAuth, requireRole('admin'), updateVipPassenger);
router.delete('/vip/:passenger_id',               requireAuth, requireRole('admin'), removeVipPassenger);
router.patch('/vip/:passenger_id/preferred-driver', requireAuth, requireRole('admin'), setPreferredDriver);

export default router;
