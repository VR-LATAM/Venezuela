// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { referralController } from '../controllers/referralController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(requireAuth);

router.get('/me',          requireRole('driver'), asyncHandler(referralController.getMyReferrals));
router.get('/leaderboard', requireRole('driver'), asyncHandler(referralController.leaderboard));

export default router;
