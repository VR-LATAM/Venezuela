// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { Router } from 'express';
import { waitlistController } from '../controllers/waitlistController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.use(requireAuth, requireRole('passenger'));

router.post  ('/join',   waitlistController.join);
router.get   ('/status', waitlistController.status);
router.delete('/leave',  waitlistController.leave);

export default router;
