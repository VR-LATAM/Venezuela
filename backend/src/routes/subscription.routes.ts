// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { Router } from 'express';
import { subscriptionController } from '../controllers/subscriptionController';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get   ('/status',    subscriptionController.getStatus);
router.post  ('/subscribe', subscriptionController.subscribe);
router.delete('/cancel',    subscriptionController.cancel);

export default router;
