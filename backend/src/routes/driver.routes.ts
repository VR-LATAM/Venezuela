// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Rutas de conductores (rol: driver)
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { driverController, upload } from '../controllers/driverController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/auth';
import { userLimiter } from '../middleware/rateLimiter';

const router = Router();

// Perfil público — accesible por cualquier usuario autenticado (pasajeros incluidos)
router.get('/public/:driverId', requireAuth, userLimiter, driverController.getPublicProfile);

// Las demás rutas requieren JWT de conductor
router.use(requireAuth, requireRole('driver'), userLimiter);

router.get('/profile',                         driverController.getProfile);
router.patch('/profile',                       driverController.updateProfile);
router.post('/documents/:docType',
  upload.single('file'),                       driverController.uploadDocument);
router.post('/submit-review',                  driverController.submitForReview);
router.patch('/online',                        driverController.updateOnlineStatus);
router.get('/acceptance-rate',                 driverController.getAcceptanceRate);
router.patch('/daily-goal',                    driverController.setDailyGoal);
router.get('/document-expiry',                 driverController.getDocumentExpiry);
router.get('/tax-report',                      driverController.getTaxReport);
router.post('/location',                       driverController.updateLocationHTTP);

export default router;
