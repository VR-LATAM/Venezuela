// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { Router } from 'express';
import { disputeController } from '../controllers/disputeController';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.post('/open',           disputeController.open);
router.get ('/mine',           disputeController.getMine);
router.get ('/ride/:rideId',   disputeController.getByRide);

export default router;
