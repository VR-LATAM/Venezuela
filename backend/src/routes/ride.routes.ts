// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Rutas de viajes
// POST /ride/estimate          — tarifa estimada (cualquier usuario autenticado)
// POST /ride/request           — solicitar viaje (solo pasajeros)
// GET  /ride/active            — viaje activo del usuario
// GET  /ride/history           — historial
// GET  /ride/:rideId           — detalle del viaje
// POST /ride/:rideId/cancel    — cancelar viaje
// POST /ride/:rideId/arrived   — conductor llegó (solo conductores)
// POST /ride/:rideId/start     — iniciar viaje (solo conductores)
// POST /ride/:rideId/complete  — completar viaje (solo conductores)
// POST /ride/:rideId/rate      — calificar viaje
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { rideController } from '../controllers/rideController';
import { requireAuth, requireRole } from '../middleware/auth';
import { userLimiter } from '../middleware/rateLimiter';

const router = Router();

// Seguimiento público — debe ir ANTES de router.use(requireAuth) para no requerir JWT
router.get('/track/:token', rideController.trackByToken);

// Todas las rutas siguientes requieren JWT válido
router.use(requireAuth, userLimiter);

// Estimación de tarifa (passenger y driver pueden calcular)
router.post('/estimate', rideController.estimate);

// Solicitar viaje — solo pasajeros
router.post('/request', requireRole('passenger'), rideController.requestRide);

// Viaje activo y historial
router.get('/active',  rideController.getActive);
router.get('/history', rideController.getHistory);

// Endpoints por rideId
router.get ('/:rideId',            rideController.getById);
router.post('/:rideId/cancel',     rideController.cancelRide);
router.post('/:rideId/rate',       rideController.rateRide);
router.post('/:rideId/tip',        requireRole('passenger'), rideController.addTip);
router.post('/:rideId/notes',      requireRole('driver'),    rideController.addDriverNotes);
router.get ('/:rideId/receipt',    rideController.getReceipt);
router.post('/:rideId/share',      requireRole('passenger'), rideController.createShareToken);

// Solo conductores pueden avanzar el estado del viaje
router.post('/:rideId/arrived',             requireRole('driver'), rideController.driverArrived);
router.post('/:rideId/start',               requireRole('driver'), rideController.startRide);
router.post('/:rideId/complete',            requireRole('driver'), rideController.completeRide);
router.get ('/:rideId/stops',               rideController.getStops);
router.post('/:rideId/stops/:stopId/arrive', requireRole('driver'), rideController.markStopArrived);

export default router;
