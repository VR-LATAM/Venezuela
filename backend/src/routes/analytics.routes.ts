// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { analyticsController } from '../controllers/analyticsController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/demand',       asyncHandler(analyticsController.demandHeatmap));
router.get('/surge-status', asyncHandler(analyticsController.surgeStatus));
router.get('/kpis',         asyncHandler(analyticsController.kpis));

export default router;
