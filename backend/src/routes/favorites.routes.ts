// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { Router } from 'express';
import { favoritesController } from '../controllers/favoritesController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.use(requireAuth, requireRole('passenger'));

router.get   ('/destinations',              favoritesController.getDestinations);
router.post  ('/destinations',              favoritesController.upsertDestination);
router.delete('/destinations/:id',          favoritesController.deleteDestination);

router.get   ('/drivers',                   favoritesController.getFavoriteDrivers);
router.post  ('/drivers/:driverId',         favoritesController.addFavoriteDriver);
router.delete('/drivers/:driverId',         favoritesController.removeFavoriteDriver);

export default router;
