// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { Router } from 'express';
import { incidentController } from '../controllers/incidentController';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.post('/',                incidentController.report);
router.get ('/mine',            incidentController.getMine);
router.get ('/ride/:rideId',    incidentController.getByRide);

export default router;
