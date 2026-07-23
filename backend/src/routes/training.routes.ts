// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Rutas de entrenamiento de conductores
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { trainingController } from '../controllers/trainingController';
import { requireAuth, requireRole } from '../middleware/auth';
import { userLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(requireAuth, requireRole('driver'), userLimiter);

router.get('/modules',                          trainingController.getModules);
router.get('/modules/:id',                      trainingController.getModule);
router.post('/modules/:id/start-reading',       trainingController.startReading);
router.get('/modules/:id/quiz',                 trainingController.getQuiz);
router.post('/modules/:id/submit-quiz',         trainingController.submitQuiz);
router.get('/status',                           trainingController.getStatus);
router.get('/certifications',                   trainingController.getCertifications);

export default router;
