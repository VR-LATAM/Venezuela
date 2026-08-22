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
import { rideController }            from '../controllers/rideController';
import { packageSecurityController } from '../controllers/packageSecurityController';
import { requireAuth, requireRole }  from '../middleware/auth';
import { userLimiter }               from '../middleware/rateLimiter';
import multer from 'multer';
import { uploadCustodyPhoto }        from '../services/storageService';
import { Request, Response }         from 'express';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

// Seguimiento público — debe ir ANTES de router.use(requireAuth) para no requerir JWT
router.get('/track/:token', rideController.trackByToken);

// Todas las rutas siguientes requieren JWT válido
router.use(requireAuth, userLimiter);

// Estimación de tarifa (passenger y driver pueden calcular)
router.post('/estimate', rideController.estimate);

// Geocodificar dirección (para pickup personalizado en delivery)
router.get('/geocode', rideController.geocodeAddress);

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
router.post('/:rideId/arrived',             requireRole('driver'),    rideController.driverArrived);
router.post('/:rideId/start',               requireRole('driver'),    rideController.startRide);
router.post('/:rideId/complete',            requireRole('driver'),    rideController.completeRide);
router.get ('/:rideId/stops',               rideController.getStops);
router.post('/:rideId/stops/:stopId/arrive', requireRole('driver'),   rideController.markStopArrived);

// Negociación de precio para Carga
router.post('/:rideId/counter-offer',       requireRole('driver'),    rideController.counterOffer);
router.post('/:rideId/respond-counter',     requireRole('passenger'), rideController.respondCounter);

/* ── Subir foto de custodia ── */
router.post('/:rideId/custody/upload-photo', requireRole('driver'), (req: Request, res: Response): void => {
  upload.single('photo')(req, res, async (err) => {
    if (err || !req.file) { res.status(400).json({ error: 'Foto requerida' }); return; }
    try {
      const { folder, angle } = req.body as { folder: string; angle: string };
      const url = await uploadCustodyPhoto(req.file.buffer, req.file.mimetype, req.params['rideId']!, folder, angle);
      res.json({ url });
    } catch (e: any) {
      res.status(500).json({ error: e.message ?? 'Error al subir foto' });
    }
  });
});

/* ── Custodia de paquetes (Encomienda / Carga) ── */
router.get ('/:rideId/custody',                    packageSecurityController.getCustody);
router.post('/:rideId/custody/pickup-photo',       requireRole('driver'), packageSecurityController.savePickupPhoto);
router.post('/:rideId/custody/verify-pickup',      requireRole('driver'), packageSecurityController.verifyPickupPin);
router.post('/:rideId/custody/delivery-photo',     requireRole('driver'), packageSecurityController.saveDeliveryPhoto);
router.post('/:rideId/custody/verify-delivery',    requireRole('driver'), packageSecurityController.verifyDeliveryPin);
router.post('/:rideId/custody/recipient-not-home', requireRole('driver'), packageSecurityController.recipientNotHome);
router.post('/:rideId/custody/return-photo',       requireRole('driver'), packageSecurityController.saveReturnPhoto);
router.post('/:rideId/custody/verify-return',      requireRole('driver'), packageSecurityController.verifyReturnPin);

export default router;
