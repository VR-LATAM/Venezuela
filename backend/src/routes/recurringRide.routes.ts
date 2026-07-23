// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { Router } from 'express';
import { recurringRideController } from '../controllers/recurringRideController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.use(requireAuth, requireRole('passenger'));

router.get   ('/',          recurringRideController.list);
router.post  ('/',          recurringRideController.create);
router.patch ('/:id/toggle', recurringRideController.toggle);
router.delete('/:id',       recurringRideController.delete);

export default router;
