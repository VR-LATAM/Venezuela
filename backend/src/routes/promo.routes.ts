// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { Router } from 'express';
import { promoController } from '../controllers/promoController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Validar código (pasajero autenticado)
router.post('/validate', requireAuth, requireRole('passenger'), promoController.validate);

export default router;
