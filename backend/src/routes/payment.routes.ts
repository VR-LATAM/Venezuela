// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Rutas de pagos — tarjetas de pasajeros, Connect y retiros de conductores
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireRole } from '../middleware/auth';
import { paymentController } from '../controllers/paymentController';
import { asyncHandler } from '../utils/asyncHandler';
import { sendError } from '../utils/response';

const router = Router();

// Rate limiter específico para el webhook de Stripe (más permisivo que auth, pero protege)
const webhookLimiter = rateLimit({
  windowMs: 60_000,
  max: 60, // Stripe raramente envía más de 60 eventos/min por endpoint
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => sendError(res, 429, 'Too many requests', 'RATE_LIMIT_EXCEEDED'),
});

// ─── Webhook de Stripe (raw body requerido — va ANTES de requireAuth) ─────────
// El cuerpo debe ser Buffer sin parsear para verificar la firma
router.post(
  '/webhook/stripe',
  webhookLimiter,
  express.raw({ type: 'application/json' }),
  asyncHandler(paymentController.stripeWebhook)
);

// ─── Todas las demás rutas requieren autenticación ─────────────────────────────
router.use(requireAuth);

// ─── Tarjetas de pasajeros ────────────────────────────────────────────────────
router.get   ('/cards',                requireRole('passenger'), asyncHandler(paymentController.listCards));
router.post  ('/cards/setup-intent',   requireRole('passenger'), asyncHandler(paymentController.createSetupIntent));
router.post  ('/cards/confirm-setup',  requireRole('passenger'), asyncHandler(paymentController.confirmSetup));
router.post  ('/cards',                requireRole('passenger'), asyncHandler(paymentController.addCard));
router.delete('/cards/:id',            requireRole('passenger'), asyncHandler(paymentController.deleteCard));
router.put   ('/cards/:id/default',    requireRole('passenger'), asyncHandler(paymentController.setDefaultCard));

// ─── Stripe Connect del conductor ─────────────────────────────────────────────
router.post  ('/driver/connect',       requireRole('driver'),    asyncHandler(paymentController.createConnectAccount));
router.get   ('/driver/status',        requireRole('driver'),    asyncHandler(paymentController.getDriverPaymentStatus));

// ─── Ganancias y retiros del conductor ───────────────────────────────────────
router.get   ('/driver/earnings',      requireRole('driver'),    asyncHandler(paymentController.getEarnings));
router.get   ('/driver/withdrawals',   requireRole('driver'),    asyncHandler(paymentController.listWithdrawals));
router.post  ('/driver/withdrawal',    requireRole('driver'),    asyncHandler(paymentController.requestWithdrawal));

export default router;
