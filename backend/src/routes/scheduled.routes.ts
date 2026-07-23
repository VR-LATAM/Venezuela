// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Rutas de viajes programados (solo pasajeros)
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { scheduledRideController } from '../controllers/scheduledRideController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireRole('passenger'));

router.post  ('/',    asyncHandler(scheduledRideController.book));
router.get   ('/',    asyncHandler(scheduledRideController.list));
router.delete('/:id', asyncHandler(scheduledRideController.cancel));

export default router;
