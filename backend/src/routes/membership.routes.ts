// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Rutas de membresías semanales de conductores
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { membershipController } from '../controllers/membershipController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth, requireRole('driver'));

router.get ('/status',         asyncHandler(membershipController.getStatus));
router.post('/initiate',       asyncHandler(membershipController.initiate));
router.post('/submit',         asyncHandler(membershipController.submitPayment));

export default router;
