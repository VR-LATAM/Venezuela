// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Router raíz — monta todos los sub-routers bajo /api/v1
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import authRoutes    from './auth.routes';
import driverRoutes  from './driver.routes';
import adminRoutes   from './admin.routes';
import rideRoutes    from './ride.routes';
import paymentRoutes      from './payment.routes';
import notificationRoutes from './notification.routes';
import scheduledRoutes    from './scheduled.routes';
import analyticsRoutes    from './analytics.routes';
import sosRoutes          from './sos.routes';
import referralRoutes     from './referral.routes';
import passengerRoutes    from './passenger.routes';
import userRoutes         from './user.routes';
import trainingRoutes       from './training.routes';
import favoritesRoutes      from './favorites.routes';
import promoRoutes          from './promo.routes';
import disputeRoutes        from './dispute.routes';
import accessibilityRoutes  from './accessibility.routes';
import subscriptionRoutes   from './subscription.routes';
import clinicRoutes         from './clinic.routes';
import recurringRideRoutes  from './recurringRide.routes';
import incidentRoutes       from './incident.routes';
import waitlistRoutes       from './waitlist.routes';
import corporateRoutes      from './corporate.routes';
import exchangeRateRoutes   from './exchangeRate.routes';
import membershipRoutes     from './membership.routes';

const router = Router();

router.use('/auth',          authRoutes);
router.use('/driver',        driverRoutes);
router.use('/admin',         adminRoutes);
router.use('/ride',          rideRoutes);
router.use('/payment',       paymentRoutes);
router.use('/notification',  notificationRoutes);
router.use('/scheduled',     scheduledRoutes);
router.use('/analytics',     analyticsRoutes);
router.use('/sos',           sosRoutes);
router.use('/referral',      referralRoutes);
router.use('/passenger',     passengerRoutes);
router.use('/user',          userRoutes);
router.use('/training',      trainingRoutes);
router.use('/favorites',     favoritesRoutes);
router.use('/promo',         promoRoutes);
router.use('/dispute',       disputeRoutes);
router.use('/accessibility',   accessibilityRoutes);
router.use('/subscription',   subscriptionRoutes);
router.use('/clinic',         clinicRoutes);
router.use('/recurring-ride', recurringRideRoutes);
router.use('/incident',       incidentRoutes);
router.use('/waitlist',       waitlistRoutes);
router.use('/corporate',      corporateRoutes);
router.use('/exchange-rate',  exchangeRateRoutes);
router.use('/membership',    membershipRoutes);

// Healthcheck — para Railway y load balancers
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'veronaride-api', timestamp: new Date().toISOString() });
});

export default router;
