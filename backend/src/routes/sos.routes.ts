// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { sosController } from '../controllers/sosController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(requireAuth);

router.post('/',              asyncHandler(sosController.activate));
router.get ('/active',        requireRole('admin'), asyncHandler(sosController.listActive));
router.put ('/:id/resolve',   requireRole('admin'), asyncHandler(sosController.resolve));

export default router;
