// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio de Stripe — pagos de pasajeros y Connect de conductores
// Pasajeros: Customer + PaymentMethods + PaymentIntents (ride charges)
// Conductores: Express accounts + Transfers (payout automático 87%)
// ═══════════════════════════════════════════════════════════════

import Stripe from 'stripe';

/* En Venezuela Stripe no se usa — la instancia solo se crea si la clave existe */
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      typescript: true,
    })
  : null as unknown as Stripe;

export const stripeService = {

  // ─────────────────────────────────────────────────────────────
  // PASAJEROS — Customer
  // ─────────────────────────────────────────────────────────────

  // Crea un Customer de Stripe para el pasajero al registrarse
  createPassengerCustomer: async (params: {
    email:  string;
    name:   string;
    userId: string;
  }): Promise<string> => {
    const customer = await stripe.customers.create({
      email: params.email,
      name:  params.name,
      metadata: { vride_user_id: params.userId },
    });
    return customer.id;
  },

  // ─────────────────────────────────────────────────────────────
  // PASAJEROS — SetupIntent (agregar tarjeta sin cobrar)
  // El cliente confirma el SetupIntent en la app con CardField
  // ─────────────────────────────────────────────────────────────
  createSetupIntent: async (stripeCustomerId: string): Promise<{
    clientSecret: string;
    setupIntentId: string;
  }> => {
    const intent = await stripe.setupIntents.create({
      customer:             stripeCustomerId,
      payment_method_types: ['card'],
      usage:                'off_session', // para cobros automáticos post-viaje
    });
    return {
      clientSecret:  intent.client_secret!,
      setupIntentId: intent.id,
    };
  },

  // Obtiene datos de un PaymentMethod (brand, last4, exp_month, exp_year)
  getPaymentMethodDetails: async (paymentMethodId: string): Promise<{
    brand:     string;
    last4:     string;
    exp_month: number;
    exp_year:  number;
  }> => {
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    const card = pm.card!;
    return {
      brand:     card.brand,
      last4:     card.last4,
      exp_month: card.exp_month,
      exp_year:  card.exp_year,
    };
  },

  // Desvincula un PaymentMethod del Customer (no borra el PM en Stripe, solo lo desasocia)
  detachPaymentMethod: async (paymentMethodId: string): Promise<void> => {
    await stripe.paymentMethods.detach(paymentMethodId);
  },

  // Lista los PaymentMethods de un Customer desde Stripe (fuente de verdad)
  listCustomerPaymentMethods: async (stripeCustomerId: string): Promise<Stripe.PaymentMethod[]> => {
    const list = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type:     'card',
    });
    return list.data;
  },

  // ─────────────────────────────────────────────────────────────
  // COBROS — PaymentIntent (cobrar al final del viaje)
  // Crea y confirma el PaymentIntent en el servidor (off_session)
  // ─────────────────────────────────────────────────────────────
  chargeRide: async (params: {
    stripeCustomerId:  string;
    paymentMethodId:   string;
    amountCents:       number; // monto en centavos USD
    rideId:            string;
    passengerName:     string;
  }): Promise<{ paymentIntentId: string; status: string }> => {
    const intent = await stripe.paymentIntents.create({
      amount:               params.amountCents,
      currency:             'usd',
      customer:             params.stripeCustomerId,
      payment_method:       params.paymentMethodId,
      off_session:          true,
      confirm:              true,
      description:          `Verona Ride — Viaje ${params.rideId}`,
      metadata: {
        ride_id:        params.rideId,
        passenger_name: params.passengerName,
      },
    });
    return {
      paymentIntentId: intent.id,
      status:          intent.status,
    };
  },

  // ─────────────────────────────────────────────────────────────
  // HOLD — autorización pre-viaje (capture_method: manual)
  // Bloquea el monto en la tarjeta sin cobrar. Si falla, el viaje no se crea.
  // ─────────────────────────────────────────────────────────────
  holdRide: async (params: {
    stripeCustomerId: string;
    paymentMethodId:  string;
    amountCents:      number;
    rideId:           string;
    passengerName:    string;
  }): Promise<{ paymentIntentId: string; status: string }> => {
    const intent = await stripe.paymentIntents.create({
      amount:               params.amountCents,
      currency:             'usd',
      customer:             params.stripeCustomerId,
      payment_method:       params.paymentMethodId,
      capture_method:       'manual',   // hold — no cobra hasta captureRide()
      off_session:          true,
      confirm:              true,
      description:          `Verona Ride hold — Viaje ${params.rideId}`,
      metadata: {
        ride_id:        params.rideId,
        passenger_name: params.passengerName,
        type:           'hold',
      },
    });
    return { paymentIntentId: intent.id, status: intent.status };
  },

  // Captura el monto real al completar el viaje (puede ser <= al hold)
  captureRide: async (params: {
    paymentIntentId: string;
    amountCents:     number; // monto real del viaje
  }): Promise<{ status: string }> => {
    const intent = await stripe.paymentIntents.capture(params.paymentIntentId, {
      amount_to_capture: params.amountCents,
    });
    return { status: intent.status };
  },

  // Libera el hold si el viaje se cancela
  releaseHold: async (paymentIntentId: string): Promise<void> => {
    await stripe.paymentIntents.cancel(paymentIntentId);
  },

  // ─────────────────────────────────────────────────────────────
  // CONDUCTORES — Stripe Connect Express
  // Permite a los conductores recibir pagos directamente
  // ─────────────────────────────────────────────────────────────

  // Crea una cuenta Express para el conductor
  createDriverConnectAccount: async (params: {
    email:    string;
    name:     string;
    driverId: string;
  }): Promise<string> => {
    const account = await stripe.accounts.create({
      type:          'express',
      country:       'US',
      email:         params.email,
      business_type: 'individual',
      capabilities:  {
        card_payments: { requested: true },
        transfers:     { requested: true },
      },
      metadata: { vride_driver_id: params.driverId },
    });
    return account.id;
  },

  // Genera el link de onboarding de Stripe para que el conductor complete su cuenta
  createConnectOnboardingLink: async (params: {
    stripeAccountId: string;
    returnUrl:       string;   // app deep link o URL de retorno
    refreshUrl:      string;
  }): Promise<string> => {
    const link = await stripe.accountLinks.create({
      account:     params.stripeAccountId,
      refresh_url: params.refreshUrl,
      return_url:  params.returnUrl,
      type:        'account_onboarding',
    });
    return link.url;
  },

  // Verifica si la cuenta Connect está habilitada para recibir pagos
  isConnectAccountVerified: async (stripeAccountId: string): Promise<boolean> => {
    const account = await stripe.accounts.retrieve(stripeAccountId);
    return (
      account.charges_enabled === true &&
      account.payouts_enabled === true &&
      account.details_submitted === true
    );
  },

  // ─────────────────────────────────────────────────────────────
  // TRANSFERENCIA — pago automático al conductor al completar viaje
  // Envía el 87% de la tarifa a la cuenta Connect del conductor
  // ─────────────────────────────────────────────────────────────
  transferToDriver: async (params: {
    stripeAccountId: string;   // cuenta Express del conductor
    amountCents:     number;   // 87% en centavos
    rideId:          string;
    driverId:        string;
  }): Promise<string> => {
    const transfer = await stripe.transfers.create({
      amount:             params.amountCents,
      currency:           'usd',
      destination:        params.stripeAccountId,
      transfer_group:     `ride_${params.rideId}`,
      metadata: {
        ride_id:   params.rideId,
        driver_id: params.driverId,
      },
    });
    return transfer.id;
  },

  // ─────────────────────────────────────────────────────────────
  // RETIRO MANUAL — el conductor solicita mover su balance
  // Usa Payouts (solo si el conductor tiene fondos en Stripe Connect)
  // ─────────────────────────────────────────────────────────────
  createPayout: async (params: {
    stripeAccountId: string;
    amountCents:     number;
    driverId:        string;
  }): Promise<string> => {
    const payout = await stripe.payouts.create(
      {
        amount:   params.amountCents,
        currency: 'usd',
        metadata: { vride_driver_id: params.driverId },
      },
      { stripeAccount: params.stripeAccountId } // ejecutar en nombre de la cuenta Connect
    );
    return payout.id;
  },

  // Recupera el PaymentMethod ID de un SetupIntent ya confirmado
  // Usado justo después de que el cliente confirma la tarjeta con PaymentSheet
  retrieveSetupIntentPaymentMethod: async (setupIntentId: string): Promise<string | null> => {
    const si = await stripe.setupIntents.retrieve(setupIntentId);
    if (!si.payment_method || typeof si.payment_method !== 'string') return null;
    return si.payment_method;
  },

  // Construye el evento de webhook verificando la firma de Stripe
  constructWebhookEvent: (
    payload:   Buffer,
    signature: string,
    secret:    string
  ): Stripe.Event => {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  },
};
