// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { Router } from 'express';
import { accessibilityController } from '../controllers/accessibilityController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.use(requireAuth, requireRole('passenger'));

router.get('/profile', accessibilityController.get);
router.put('/profile', accessibilityController.upsert);

export default router;
