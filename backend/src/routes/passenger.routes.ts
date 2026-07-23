// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Rutas de pasajeros — perfil y necesidades especiales
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { passengerController } from '../controllers/passengerController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.use(requireRole('passenger'));

router.get('/profile',              passengerController.getProfile);
router.patch('/special-needs',      passengerController.updateSpecialNeeds);
router.patch('/emergency-contact',  passengerController.updateEmergencyContact);

export default router;
