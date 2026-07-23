// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Rutas de notificaciones — tokens FCM y campañas del admin
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { notificationController } from '../controllers/notificationController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

// Registro de token FCM (cualquier usuario autenticado)
router.post  ('/token', asyncHandler(notificationController.registerToken));
router.delete('/token', asyncHandler(notificationController.deleteToken));

// Campañas masivas (solo admin)
router.post('/campaign', requireRole('admin'), asyncHandler(notificationController.sendCampaign));

export default router;
