// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Controlador de pagos — métodos de pago, Stripe Connect y retiros
// ═══════════════════════════════════════════════════════════════

import { Request, Response } from 'express';
import { z } from 'zod';
import { stripeService } from '../services/stripeService';
import { paymentRepository } from '../repositories/paymentRepository';
import { logger } from '../utils/logger';

export const paymentController = {

  // ─────────────────────────────────────────────────────────────
  // PASAJEROS — Gestión de tarjetas
  // ─────────────────────────────────────────────────────────────

  // GET /payment/cards
  // Devuelve los métodos de pago guardados del pasajero
  listCards: async (req: Request, res: Response): Promise<void> => {
    const passengerId = req.user!.userId;
    const cards = await paymentRepository.listByPassenger(passengerId);
    res.json({ cards });
  },

  // POST /payment/cards/setup-intent
  // Crea un SetupIntent para agregar una tarjeta sin cobrar
  // El cliente confirma el intent con @stripe/stripe-react-native
  createSetupIntent: async (req: Request, res: Response): Promise<void> => {
    const passengerId = req.user!.userId;

    // Obtener o crear el Customer de Stripe del pasajero
    let stripeCustomerId = await paymentRepository.getStripeCustomerId(passengerId);

    if (!stripeCustomerId) {
      stripeCustomerId = await stripeService.createPassengerCustomer({
        email:  req.user!.email,
        name:   req.user!.name ?? '',
        userId: passengerId,
      });
      await paymentRepository.setStripeCustomerId(passengerId, stripeCustomerId);
    }

    const { clientSecret, setupIntentId } = await stripeService.createSetupIntent(stripeCustomerId);

    res.json({ clientSecret, setupIntentId });
  },

  // POST /payment/cards
  // Guarda un PaymentMethod ya confirmado desde el cliente móvil
  addCard: async (req: Request, res: Response): Promise<void> => {
    const schema = z.object({
      paymentMethodId: z.string().min(1),
      setAsDefault:    z.boolean().optional().default(false),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid data', details: parsed.error.flatten() });
      return;
    }

    const { paymentMethodId, setAsDefault } = parsed.data;
    const passengerId = req.user!.userId;

    // Verificar que el pasajero tiene Customer de Stripe
    const stripeCustomerId = await paymentRepository.getStripeCustomerId(passengerId);
    if (!stripeCustomerId) {
      res.status(400).json({ error: 'Passenger has no Stripe account. Create a SetupIntent first.' });
      return;
    }

    // Obtener detalles de la tarjeta directamente desde Stripe
    const details = await stripeService.getPaymentMethodDetails(paymentMethodId);

    // Determinar si será el primer método (auto-default)
    const existing = await paymentRepository.listByPassenger(passengerId);
    const isFirst = existing.length === 0;

    const card = await paymentRepository.addPaymentMethod({
      passengerId,
      stripePaymentMethodId: paymentMethodId,
      brand:                 details.brand,
      last4:                 details.last4,
      expMonth:              details.exp_month,
      expYear:               details.exp_year,
      setAsDefault:          setAsDefault || isFirst,
    });

    res.status(201).json({ card });
  },

  // POST /payment/cards/confirm-setup
  // Llamado inmediatamente después de que el PaymentSheet confirma la tarjeta.
  // Recupera el PaymentMethod del SetupIntent en Stripe y lo guarda en la BD.
  confirmSetup: async (req: Request, res: Response): Promise<void> => {
    const schema = z.object({ setupIntentId: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'setupIntentId is required.' });
      return;
    }

    const { setupIntentId } = parsed.data;
    const passengerId = req.user!.userId;

    // Obtener el paymentMethodId desde Stripe (el que el usuario acaba de confirmar)
    const paymentMethodId = await stripeService.retrieveSetupIntentPaymentMethod(setupIntentId);
    if (!paymentMethodId) {
      res.status(400).json({ error: 'The SetupIntent does not have a confirmed payment method.' });
      return;
    }

    // Verificar que el pasajero tiene Customer de Stripe
    const stripeCustomerId = await paymentRepository.getStripeCustomerId(passengerId);
    if (!stripeCustomerId) {
      res.status(400).json({ error: 'Passenger has no Stripe account.' });
      return;
    }

    // Evitar guardar duplicados (mismo PM)
    const existing = await paymentRepository.listByPassenger(passengerId);
    const alreadySaved = existing.find(c => c.stripe_payment_method_id === paymentMethodId);
    if (alreadySaved) {
      res.json({ card: alreadySaved });
      return;
    }

    const details = await stripeService.getPaymentMethodDetails(paymentMethodId);
    const isFirst = existing.length === 0;

    const card = await paymentRepository.addPaymentMethod({
      passengerId,
      stripePaymentMethodId: paymentMethodId,
      brand:        details.brand,
      last4:        details.last4,
      expMonth:     details.exp_month,
      expYear:      details.exp_year,
      setAsDefault: isFirst,
    });

    res.status(201).json({ card });
  },

  // DELETE /payment/cards/:id
  // Elimina un método de pago del pasajero
  deleteCard: async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const passengerId = req.user!.userId;

    const card = await paymentRepository.findById(id, passengerId);
    if (!card) {
      res.status(404).json({ error: 'Payment method not found.' });
      return;
    }

    // No permitir borrar la última tarjeta — el pasajero quedaría sin forma de pago
    const allCards = await paymentRepository.listByPassenger(passengerId);
    if (allCards.length <= 1) {
      res.status(400).json({
        error: 'Cannot delete your only payment method. Please add another card first.',
        code: 'LAST_PAYMENT_METHOD',
      });
      return;
    }

    // Desvincular de Stripe (no se puede cobrar con él después)
    await stripeService.detachPaymentMethod(card.stripe_payment_method_id);
    await paymentRepository.remove(id, passengerId);

    res.json({ success: true });
  },

  // PUT /payment/cards/:id/default
  // Cambia el método de pago por defecto
  setDefaultCard: async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const passengerId = req.user!.userId;

    const updated = await paymentRepository.setDefault(id, passengerId);
    if (!updated) {
      res.status(404).json({ error: 'Payment method not found.' });
      return;
    }
    res.json({ success: true });
  },

  // ─────────────────────────────────────────────────────────────
  // CONDUCTORES — Stripe Connect
  // ─────────────────────────────────────────────────────────────

  // POST /payment/driver/connect
  // Crea o devuelve la cuenta Express de Stripe del conductor
  createConnectAccount: async (req: Request, res: Response): Promise<void> => {
    const driverId = req.user!.userId;
    const stripeInfo = await paymentRepository.getDriverStripeInfo(driverId);

    if (!stripeInfo) {
      res.status(404).json({ error: 'Driver not found.' });
      return;
    }

    let accountId = stripeInfo.stripe_account_id;

    // Si ya tiene cuenta, solo generar nuevo onboarding link
    if (!accountId) {
      accountId = await stripeService.createDriverConnectAccount({
        email:    req.user!.email,
        name:     req.user!.name ?? '',
        driverId: driverId,
      });
      await paymentRepository.setDriverStripeAccount(driverId, accountId);
    }

    const onboardingUrl = await stripeService.createConnectOnboardingLink({
      stripeAccountId: accountId,
      returnUrl:  process.env.STRIPE_CONNECT_RETURN_URL  ?? 'veronaride://driver/earnings',
      refreshUrl: process.env.STRIPE_CONNECT_REFRESH_URL ?? 'veronaride://driver/earnings',
    });

    res.json({ onboardingUrl, stripeAccountId: accountId });
  },

  // GET /payment/driver/status
  // Devuelve el estado de la cuenta Connect y el balance disponible
  getDriverPaymentStatus: async (req: Request, res: Response): Promise<void> => {
    const driverId = req.user!.userId;
    const info = await paymentRepository.getDriverStripeInfo(driverId);

    if (!info) {
      res.status(404).json({ error: 'Driver not found.' });
      return;
    }

    // Si tiene cuenta pero no está marcada como verificada, volver a verificar con Stripe
    if (info.stripe_account_id && !info.stripe_account_verified) {
      const verified = await stripeService.isConnectAccountVerified(info.stripe_account_id);
      if (verified) {
        await paymentRepository.setDriverStripeVerified(driverId, true);
        info.stripe_account_verified = true;
      }
    }

    res.json({
      hasConnectAccount:    !!info.stripe_account_id,
      accountVerified:      info.stripe_account_verified,
      availableBalance:     info.available_balance,
    });
  },

  // ─────────────────────────────────────────────────────────────
  // CONDUCTORES — Ganancias y retiros
  // ─────────────────────────────────────────────────────────────

  // GET /payment/driver/earnings
  // Resumen de ganancias: hoy / semana / mes + historial reciente
  getEarnings: async (req: Request, res: Response): Promise<void> => {
    const driverId = req.user!.userId;
    const [summary, recent] = await Promise.all([
      paymentRepository.getEarningsSummary(driverId),
      paymentRepository.getRecentEarnings(driverId),
    ]);
    res.json({ summary, recent });
  },

  // POST /payment/driver/withdrawal
  // Solicita un retiro del balance disponible
  requestWithdrawal: async (req: Request, res: Response): Promise<void> => {
    const schema = z.object({
      amount: z.number().positive().max(50000), // máximo $50,000 por retiro
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid amount.', details: parsed.error.flatten() });
      return;
    }

    const { amount } = parsed.data;
    const driverId = req.user!.userId;

    const info = await paymentRepository.getDriverStripeInfo(driverId);
    if (!info) {
      res.status(404).json({ error: 'Driver not found.' });
      return;
    }

    if (!info.stripe_account_id || !info.stripe_account_verified) {
      res.status(400).json({ error: 'Set up your payment account before requesting a withdrawal.' });
      return;
    }

    if (info.available_balance < amount) {
      res.status(400).json({
        error: `Insufficient balance. Available: $${info.available_balance.toFixed(2)}`,
      });
      return;
    }

    // Descontar balance inmediatamente para evitar doble retiro
    const deducted = await paymentRepository.deductDriverBalance(driverId, amount);
    if (!deducted) {
      res.status(409).json({ error: 'Insufficient balance to process the withdrawal.' });
      return;
    }

    // Crear registro de retiro en BD
    const withdrawal = await paymentRepository.createWithdrawal({ driverId, amount });

    // Ejecutar payout en Stripe (puede tardar 1-3 días hábiles en llegar al banco)
    try {
      const payoutId = await stripeService.createPayout({
        stripeAccountId: info.stripe_account_id,
        amountCents:     Math.round(amount * 100),
        driverId,
      });
      await paymentRepository.updateWithdrawalStatus(withdrawal.id, 'processing', {
        stripeTransferId: payoutId,
      });
      res.status(201).json({
        withdrawal: { ...withdrawal, status: 'processing', stripe_transfer_id: payoutId },
        message:    'Withdrawal requested. Funds will arrive within 1-3 business days.',
      });
    } catch (err: unknown) {
      // Si Stripe falla, devolver el balance y marcar como failed
      await paymentRepository.deductDriverBalance(driverId, -amount); // revertir descuento
      const reason = err instanceof Error ? err.message : 'Unknown error';
      await paymentRepository.updateWithdrawalStatus(withdrawal.id, 'failed', {
        failureReason: reason,
      });
      res.status(502).json({ error: 'Could not process the withdrawal. Please try again.' });
    }
  },

  // GET /payment/driver/withdrawals
  // Historial de retiros del conductor
  listWithdrawals: async (req: Request, res: Response): Promise<void> => {
    const driverId = req.user!.userId;
    const withdrawals = await paymentRepository.listWithdrawalsByDriver(driverId);
    res.json({ withdrawals });
  },

  // ─────────────────────────────────────────────────────────────
  // WEBHOOK de Stripe — solo para eventos de Connect accounts
  // POST /payment/webhook/stripe
  // ─────────────────────────────────────────────────────────────
  stripeWebhook: async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['stripe-signature'] as string;
    const secret    = process.env.STRIPE_WEBHOOK_SECRET!;

    // Rechazar webhooks si el secret es el placeholder de desarrollo
    if (!secret || secret === 'whsec_placeholder_not_configured') {
      logger.error('STRIPE_WEBHOOK_SECRET not configured — rejecting webhook');
      res.status(503).json({ error: 'Webhook verification not configured' });
      return;
    }

    let event;
    try {
      event = stripeService.constructWebhookEvent(req.body as Buffer, signature, secret);
    } catch {
      logger.warn('Stripe webhook: invalid signature', { ip: req.ip });
      res.status(400).json({ error: 'Invalid signature.' });
      return;
    }

    // Idempotencia: ignorar eventos ya procesados (Stripe puede entregar el mismo evento 2x)
    const { redis } = await import('../config/redis');
    const idempotencyKey = `stripe:webhook:${event.id}`;
    const alreadyProcessed = await redis.set(idempotencyKey, '1', 'EX', 86400, 'NX');
    if (!alreadyProcessed) {
      res.json({ received: true });
      return;
    }

    // Actualizar estado de verificación de la cuenta Connect del conductor
    if (event.type === 'account.updated') {
      const account = event.data.object as { id: string; charges_enabled: boolean; payouts_enabled: boolean; details_submitted: boolean };
      const isVerified = account.charges_enabled && account.payouts_enabled && account.details_submitted;

      // Buscar el conductor por stripe_account_id y actualizar
      const { rows } = await (await import('../config/database')).db.query<{ id: string }>(
        `SELECT id FROM drivers WHERE stripe_account_id = $1`,
        [account.id]
      );
      if (rows[0]) {
        await paymentRepository.setDriverStripeVerified(rows[0].id, isVerified);
      }
    }

    res.json({ received: true });
  },
};
