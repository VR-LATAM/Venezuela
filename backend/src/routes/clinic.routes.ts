// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { Router } from 'express';
import { clinicController } from '../controllers/clinicController';
import { requireClinicAuth } from '../middleware/clinicAuth';

const router = Router();

// Pública — login del portal web
router.post('/auth/login', clinicController.login);

// Protegidas — JWT Bearer o X-Clinic-Key
router.use(requireClinicAuth);
router.get ('/me',                    clinicController.me);
router.get ('/stats',                 clinicController.stats);
router.post('/request',               clinicController.createRequest);
router.get ('/requests',              clinicController.getRequests);
router.patch('/requests/:id/cancel',  clinicController.cancelRequest);

export default router;
