// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Rutas de administración (rol: admin)
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { promoController } from '../controllers/promoController';
import { disputeController } from '../controllers/disputeController';
import { clinicController } from '../controllers/clinicController';
import { incidentController } from '../controllers/incidentController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren JWT de admin
router.use(requireAuth, requireRole('admin'));

// Gestión de conductores
router.get('/drivers/online-map',                   adminController.onlineDriversMap);
router.get('/drivers',                              adminController.listDrivers);
router.get('/drivers/pending-review',               adminController.pendingReview);
router.get('/drivers/:driverId',                    adminController.getDriver);
router.get('/drivers/:driverId/training',           adminController.getDriverTraining);
router.post('/drivers/:driverId/approve',           adminController.approveDriver);
router.post('/drivers/:driverId/reject',            adminController.rejectDriver);
router.post('/drivers/:driverId/suspend',           adminController.suspendDriver);
router.post('/drivers/:driverId/reactivate',        adminController.reactivateDriver);

// Viajes, finanzas, tarifas, pasajeros
router.get('/rides',                                adminController.listRides);
router.get('/finance',                              adminController.financeSummary);
router.get('/fares',                                adminController.listFares);
router.put('/fares/:stateCode',                     adminController.updateFare);
router.get('/passengers',                           adminController.listPassengers);

// Códigos de descuento
router.get ('/promos',                              promoController.list);
router.post('/promos',                              promoController.create);
router.patch('/promos/:id/toggle',                  promoController.toggle);

// Disputas
router.get('/disputes',                             disputeController.listOpen);
router.put('/disputes/:id/resolve',                 disputeController.resolve);

// Incidentes
router.get('/incidents',                            incidentController.listOpen);
router.put('/incidents/:id/resolve',                incidentController.resolve);

// Clínicas
router.get  ('/clinics',                            clinicController.listAll);
router.post ('/clinics',                            clinicController.create);
router.get  ('/clinics/all-requests',               clinicController.allRequests);
router.get  ('/clinics/pending-requests',           clinicController.pendingRequests);
router.patch('/clinics/:id/reset-password',         clinicController.resetPassword);
router.patch('/clinics/:id/toggle',                 clinicController.toggleActive);
router.patch('/clinics/requests/:id/link',          clinicController.linkRide);

export default router;
