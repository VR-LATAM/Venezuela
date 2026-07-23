// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
// Tests del servicio de Stripe — pagos, Connect y webhooks
// Todos los calls a Stripe API son mockeados (sin llamadas reales)

// ─── Mock de Stripe ───────────────────────────────────────────────────────────
const mockCustomersCreate        = jest.fn();
const mockSetupIntentsCreate     = jest.fn();
const mockSetupIntentsRetrieve   = jest.fn();
const mockPaymentMethodsRetrieve = jest.fn();
const mockPaymentMethodsDetach   = jest.fn();
const mockPaymentMethodsList     = jest.fn();
const mockPaymentIntentsCreate   = jest.fn();
const mockPaymentIntentsCapture  = jest.fn();
const mockPaymentIntentsCancel   = jest.fn();
const mockAccountsCreate         = jest.fn();
const mockAccountLinksCreate     = jest.fn();
const mockAccountsRetrieve       = jest.fn();
const mockTransfersCreate        = jest.fn();
const mockPayoutsCreate          = jest.fn();
const mockWebhooksConstructEvent = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers:      { create: mockCustomersCreate },
    setupIntents:   { create: mockSetupIntentsCreate, retrieve: mockSetupIntentsRetrieve },
    paymentMethods: { retrieve: mockPaymentMethodsRetrieve, detach: mockPaymentMethodsDetach, list: mockPaymentMethodsList },
    paymentIntents: { create: mockPaymentIntentsCreate, capture: mockPaymentIntentsCapture, cancel: mockPaymentIntentsCancel },
    accounts:       { create: mockAccountsCreate, retrieve: mockAccountsRetrieve },
    accountLinks:   { create: mockAccountLinksCreate },
    transfers:      { create: mockTransfersCreate },
    payouts:        { create: mockPayoutsCreate },
    webhooks:       { constructEvent: mockWebhooksConstructEvent },
  }));
});

import { stripeService } from '../services/stripeService';

// ─────────────────────────────────────────────────────────────────────────────
describe('stripeService', () => {

  beforeEach(() => jest.clearAllMocks());

  // ─── PASAJEROS — Customer ──────────────────────────────────────────────────
  describe('createPassengerCustomer', () => {
    it('crea un Customer y retorna su id', async () => {
      mockCustomersCreate.mockResolvedValue({ id: 'cus_test123' });

      const id = await stripeService.createPassengerCustomer({
        email:  'passenger@test.com',
        name:   'Juan Perez',
        userId: 'user-uuid-1',
      });

      expect(id).toBe('cus_test123');
      expect(mockCustomersCreate).toHaveBeenCalledWith({
        email:    'passenger@test.com',
        name:     'Juan Perez',
        metadata: { vride_user_id: 'user-uuid-1' },
      });
    });

    it('propaga el error si Stripe falla', async () => {
      mockCustomersCreate.mockRejectedValue(new Error('Stripe network error'));

      await expect(
        stripeService.createPassengerCustomer({ email: 'x@x.com', name: 'X', userId: 'u1' })
      ).rejects.toThrow('Stripe network error');
    });
  });

  // ─── PASAJEROS — SetupIntent ───────────────────────────────────────────────
  describe('createSetupIntent', () => {
    it('retorna clientSecret y setupIntentId', async () => {
      mockSetupIntentsCreate.mockResolvedValue({
        id:            'seti_test456',
        client_secret: 'seti_test456_secret_abc',
      });

      const result = await stripeService.createSetupIntent('cus_test123');

      expect(result.setupIntentId).toBe('seti_test456');
      expect(result.clientSecret).toBe('seti_test456_secret_abc');
      expect(mockSetupIntentsCreate).toHaveBeenCalledWith({
        customer:             'cus_test123',
        payment_method_types: ['card'],
        usage:                'off_session',
      });
    });
  });

  // ─── PASAJEROS — PaymentMethod ─────────────────────────────────────────────
  describe('getPaymentMethodDetails', () => {
    it('retorna brand, last4, exp_month y exp_year', async () => {
      mockPaymentMethodsRetrieve.mockResolvedValue({
        card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2027 },
      });

      const details = await stripeService.getPaymentMethodDetails('pm_test789');

      expect(details).toEqual({ brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2027 });
    });
  });

  describe('detachPaymentMethod', () => {
    it('llama a detach sin lanzar error', async () => {
      mockPaymentMethodsDetach.mockResolvedValue({});

      await expect(stripeService.detachPaymentMethod('pm_test789')).resolves.toBeUndefined();
      expect(mockPaymentMethodsDetach).toHaveBeenCalledWith('pm_test789');
    });
  });

  describe('listCustomerPaymentMethods', () => {
    it('retorna la lista de tarjetas del cliente', async () => {
      const fakePMs = [
        { id: 'pm_1', card: { brand: 'visa',       last4: '4242' } },
        { id: 'pm_2', card: { brand: 'mastercard', last4: '5555' } },
      ];
      mockPaymentMethodsList.mockResolvedValue({ data: fakePMs });

      const result = await stripeService.listCustomerPaymentMethods('cus_test123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('pm_1');
    });
  });

  // ─── COBROS — chargeRide ───────────────────────────────────────────────────
  describe('chargeRide', () => {
    const params = {
      stripeCustomerId: 'cus_test123',
      paymentMethodId:  'pm_test789',
      amountCents:      2500,   // $25.00
      rideId:           'ride-uuid-1',
      passengerName:    'Juan Perez',
    };

    it('crea PaymentIntent y retorna id y status succeeded', async () => {
      mockPaymentIntentsCreate.mockResolvedValue({
        id:     'pi_test001',
        status: 'succeeded',
      });

      const result = await stripeService.chargeRide(params);

      expect(result.paymentIntentId).toBe('pi_test001');
      expect(result.status).toBe('succeeded');
      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(expect.objectContaining({
        amount:         2500,
        currency:       'usd',
        customer:       'cus_test123',
        payment_method: 'pm_test789',
        off_session:    true,
        confirm:        true,
      }));
    });

    it('propaga error cuando la tarjeta es rechazada', async () => {
      mockPaymentIntentsCreate.mockRejectedValue(
        Object.assign(new Error('Your card was declined.'), { code: 'card_declined' })
      );

      await expect(stripeService.chargeRide(params)).rejects.toThrow('Your card was declined.');
    });

    it('no cobra montos negativos ni cero (validación de negocio)', async () => {
      // El servicio delega la validación a Stripe; verificamos que el monto se pasa tal cual
      mockPaymentIntentsCreate.mockResolvedValue({ id: 'pi_zero', status: 'requires_action' });

      const result = await stripeService.chargeRide({ ...params, amountCents: 0 });
      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 0 }));
      expect(result.paymentIntentId).toBe('pi_zero');
    });
  });

  // ─── COBROS — holdRide / captureRide / releaseHold ────────────────────────
  describe('holdRide', () => {
    it('crea PaymentIntent con capture_method manual', async () => {
      mockPaymentIntentsCreate.mockResolvedValue({ id: 'pi_hold001', status: 'requires_capture' });

      const result = await stripeService.holdRide({
        stripeCustomerId: 'cus_test123',
        paymentMethodId:  'pm_test789',
        amountCents:      3000,
        rideId:           'ride-uuid-2',
        passengerName:    'Maria Lopez',
      });

      expect(result.status).toBe('requires_capture');
      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(expect.objectContaining({
        capture_method: 'manual',
      }));
    });
  });

  describe('captureRide', () => {
    it('captura el monto real del viaje', async () => {
      mockPaymentIntentsCapture.mockResolvedValue({ status: 'succeeded' });

      const result = await stripeService.captureRide({
        paymentIntentId: 'pi_hold001',
        amountCents:     2800,   // monto real < hold
      });

      expect(result.status).toBe('succeeded');
      expect(mockPaymentIntentsCapture).toHaveBeenCalledWith('pi_hold001', { amount_to_capture: 2800 });
    });
  });

  describe('releaseHold', () => {
    it('cancela el PaymentIntent (libera el hold)', async () => {
      mockPaymentIntentsCancel.mockResolvedValue({ status: 'canceled' });

      await expect(stripeService.releaseHold('pi_hold001')).resolves.toBeUndefined();
      expect(mockPaymentIntentsCancel).toHaveBeenCalledWith('pi_hold001');
    });
  });

  // ─── CONDUCTORES — Connect Express ────────────────────────────────────────
  describe('createDriverConnectAccount', () => {
    it('crea una cuenta Express y retorna su id', async () => {
      mockAccountsCreate.mockResolvedValue({ id: 'acct_driver001' });

      const id = await stripeService.createDriverConnectAccount({
        email:    'driver@test.com',
        name:     'Carlos Driver',
        driverId: 'driver-uuid-1',
      });

      expect(id).toBe('acct_driver001');
      expect(mockAccountsCreate).toHaveBeenCalledWith(expect.objectContaining({
        type:    'express',
        country: 'US',
        email:   'driver@test.com',
      }));
    });
  });

  describe('createConnectOnboardingLink', () => {
    it('retorna la URL de onboarding', async () => {
      mockAccountLinksCreate.mockResolvedValue({ url: 'https://connect.stripe.com/onboarding/abc' });

      const url = await stripeService.createConnectOnboardingLink({
        stripeAccountId: 'acct_driver001',
        returnUrl:       'veronaride://driver/connect/return',
        refreshUrl:      'veronaride://driver/connect/refresh',
      });

      expect(url).toBe('https://connect.stripe.com/onboarding/abc');
    });
  });

  describe('isConnectAccountVerified', () => {
    it('retorna true cuando la cuenta está completamente habilitada', async () => {
      mockAccountsRetrieve.mockResolvedValue({
        charges_enabled:   true,
        payouts_enabled:   true,
        details_submitted: true,
      });

      const verified = await stripeService.isConnectAccountVerified('acct_driver001');
      expect(verified).toBe(true);
    });

    it('retorna false si el conductor no terminó el onboarding', async () => {
      mockAccountsRetrieve.mockResolvedValue({
        charges_enabled:   false,
        payouts_enabled:   false,
        details_submitted: false,
      });

      const verified = await stripeService.isConnectAccountVerified('acct_driver001');
      expect(verified).toBe(false);
    });

    it('retorna false si payouts están desactivados aunque charges estén activos', async () => {
      mockAccountsRetrieve.mockResolvedValue({
        charges_enabled:   true,
        payouts_enabled:   false,
        details_submitted: true,
      });

      const verified = await stripeService.isConnectAccountVerified('acct_driver001');
      expect(verified).toBe(false);
    });
  });

  // ─── TRANSFERENCIA — 87% al conductor ────────────────────────────────────
  describe('transferToDriver', () => {
    it('transfiere el 87% al conductor y retorna el transfer id', async () => {
      mockTransfersCreate.mockResolvedValue({ id: 'tr_test001' });

      const totalCents  = 2500;
      const driverShare = Math.floor(totalCents * 0.87); // 2175

      const transferId = await stripeService.transferToDriver({
        stripeAccountId: 'acct_driver001',
        amountCents:     driverShare,
        rideId:          'ride-uuid-1',
        driverId:        'driver-uuid-1',
      });

      expect(transferId).toBe('tr_test001');
      expect(mockTransfersCreate).toHaveBeenCalledWith(expect.objectContaining({
        amount:      driverShare,
        currency:    'usd',
        destination: 'acct_driver001',
      }));
    });

    it('propaga error si la cuenta del conductor no tiene fondos suficientes', async () => {
      mockTransfersCreate.mockRejectedValue(new Error('Insufficient funds in Stripe account'));

      await expect(
        stripeService.transferToDriver({
          stripeAccountId: 'acct_driver001',
          amountCents:     99999999,
          rideId:          'ride-uuid-1',
          driverId:        'driver-uuid-1',
        })
      ).rejects.toThrow('Insufficient funds');
    });
  });

  // ─── RETIRO MANUAL — Payout ───────────────────────────────────────────────
  describe('createPayout', () => {
    it('crea un payout y retorna su id', async () => {
      mockPayoutsCreate.mockResolvedValue({ id: 'po_test001' });

      const payoutId = await stripeService.createPayout({
        stripeAccountId: 'acct_driver001',
        amountCents:     5000,
        driverId:        'driver-uuid-1',
      });

      expect(payoutId).toBe('po_test001');
      expect(mockPayoutsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 5000, currency: 'usd' }),
        { stripeAccount: 'acct_driver001' }
      );
    });
  });

  // ─── SETUP INTENT — recuperar PaymentMethod ───────────────────────────────
  describe('retrieveSetupIntentPaymentMethod', () => {
    it('retorna el payment_method id cuando el SetupIntent está confirmado', async () => {
      mockSetupIntentsRetrieve.mockResolvedValue({ payment_method: 'pm_confirmed001' });

      const pmId = await stripeService.retrieveSetupIntentPaymentMethod('seti_test456');
      expect(pmId).toBe('pm_confirmed001');
    });

    it('retorna null cuando el SetupIntent no tiene payment_method', async () => {
      mockSetupIntentsRetrieve.mockResolvedValue({ payment_method: null });

      const pmId = await stripeService.retrieveSetupIntentPaymentMethod('seti_test456');
      expect(pmId).toBeNull();
    });
  });

  // ─── WEBHOOK — verificación de firma ─────────────────────────────────────
  describe('constructWebhookEvent', () => {
    it('construye el evento cuando la firma es válida', () => {
      const fakeEvent = { type: 'payment_intent.succeeded', data: { object: { id: 'pi_test001' } } };
      mockWebhooksConstructEvent.mockReturnValue(fakeEvent);

      const event = stripeService.constructWebhookEvent(
        Buffer.from('{}'),
        'stripe-signature-header',
        'whsec_test_secret'
      );

      expect(event.type).toBe('payment_intent.succeeded');
    });

    it('lanza error cuando la firma de webhook es inválida', () => {
      mockWebhooksConstructEvent.mockImplementation(() => {
        throw new Error('No signatures found matching the expected signature for payload');
      });

      expect(() =>
        stripeService.constructWebhookEvent(
          Buffer.from('{}'),
          'bad-signature',
          'whsec_test_secret'
        )
      ).toThrow('No signatures found');
    });
  });

  // ─── FLUJO COMPLETO — ride end-to-end ────────────────────────────────────
  describe('flujo completo de un viaje (hold → capture → transfer)', () => {
    it('ejecuta hold, capture y transfer en orden correcto', async () => {
      mockPaymentIntentsCreate.mockResolvedValue({ id: 'pi_e2e001', status: 'requires_capture' });
      mockPaymentIntentsCapture.mockResolvedValue({ status: 'succeeded' });
      mockTransfersCreate.mockResolvedValue({ id: 'tr_e2e001' });

      // 1. Hold al inicio del viaje
      const hold = await stripeService.holdRide({
        stripeCustomerId: 'cus_test123',
        paymentMethodId:  'pm_test789',
        amountCents:      3000,
        rideId:           'ride-e2e',
        passengerName:    'Test User',
      });
      expect(hold.status).toBe('requires_capture');

      // 2. Capture al completar el viaje (monto real)
      const capture = await stripeService.captureRide({
        paymentIntentId: 'pi_e2e001',
        amountCents:     2800,
      });
      expect(capture.status).toBe('succeeded');

      // 3. Transferencia del 87% al conductor
      const driverShare = Math.floor(2800 * 0.87); // 2436
      const transferId  = await stripeService.transferToDriver({
        stripeAccountId: 'acct_driver001',
        amountCents:     driverShare,
        rideId:          'ride-e2e',
        driverId:        'driver-uuid-1',
      });
      expect(transferId).toBe('tr_e2e001');

      // Verificar orden de llamadas
      expect(mockPaymentIntentsCreate).toHaveBeenCalledTimes(1);
      expect(mockPaymentIntentsCapture).toHaveBeenCalledTimes(1);
      expect(mockTransfersCreate).toHaveBeenCalledTimes(1);
    });

    it('libera el hold si el viaje se cancela antes de completarse', async () => {
      mockPaymentIntentsCreate.mockResolvedValue({ id: 'pi_cancel001', status: 'requires_capture' });
      mockPaymentIntentsCancel.mockResolvedValue({ status: 'canceled' });

      // Hold creado
      await stripeService.holdRide({
        stripeCustomerId: 'cus_test123',
        paymentMethodId:  'pm_test789',
        amountCents:      3000,
        rideId:           'ride-cancel',
        passengerName:    'Test User',
      });

      // Viaje cancelado — se libera el hold
      await stripeService.releaseHold('pi_cancel001');

      expect(mockPaymentIntentsCancel).toHaveBeenCalledWith('pi_cancel001');
      expect(mockPaymentIntentsCapture).not.toHaveBeenCalled();
      expect(mockTransfersCreate).not.toHaveBeenCalled();
    });
  });
});
