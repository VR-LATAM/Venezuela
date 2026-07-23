// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio de pagos (mobile) — tarjetas y ganancias
// ═══════════════════════════════════════════════════════════════

import { apiClient } from './apiClient';

export interface SavedCard {
  id:        string;
  brand:     string;    // 'visa', 'mastercard', etc.
  last4:     string;
  exp_month: number;
  exp_year:  number;
  is_default: boolean;
}

export interface EarningsSummary {
  today:             number;
  this_week:         number;
  this_month:        number;
  total_earned:      number;
  available_balance: number;
}

export interface EarningEntry {
  id:           string;
  type:         string;
  gross_amount: number;
  net_amount:   number;
  description:  string | null;
  created_at:   string;
}

export interface Withdrawal {
  id:                 string;
  amount:             number;
  status:             'pending' | 'processing' | 'completed' | 'failed';
  stripe_transfer_id: string | null;
  failure_reason:     string | null;
  requested_at:       string;
  completed_at:       string | null;
}

export const paymentService = {

  // ─────────────────────────────────────────────────────────────
  // TARJETAS DE PASAJEROS
  // ─────────────────────────────────────────────────────────────

  listCards: async (): Promise<SavedCard[]> => {
    const { data } = await apiClient.get<{ cards: SavedCard[] }>('/payment/cards');
    return data.cards;
  },

  // Obtiene el clientSecret del SetupIntent para usar con @stripe/stripe-react-native
  createSetupIntent: async (): Promise<{ clientSecret: string; setupIntentId: string }> => {
    const { data } = await apiClient.post<{ clientSecret: string; setupIntentId: string }>(
      '/payment/cards/setup-intent'
    );
    return data;
  },

  // Confirma un SetupIntent ya completado: el backend recupera el PM de Stripe y lo guarda en BD
  confirmSetup: async (setupIntentId: string): Promise<SavedCard> => {
    const { data } = await apiClient.post<{ card: SavedCard }>('/payment/cards/confirm-setup', {
      setupIntentId,
    });
    return data.card;
  },

  // Guarda el PaymentMethod ya confirmado en el backend
  addCard: async (paymentMethodId: string, setAsDefault = false): Promise<SavedCard> => {
    const { data } = await apiClient.post<{ card: SavedCard }>('/payment/cards', {
      paymentMethodId,
      setAsDefault,
    });
    return data.card;
  },

  deleteCard: async (cardId: string): Promise<void> => {
    await apiClient.delete(`/payment/cards/${cardId}`);
  },

  setDefaultCard: async (cardId: string): Promise<void> => {
    await apiClient.put(`/payment/cards/${cardId}/default`);
  },

  // ─────────────────────────────────────────────────────────────
  // STRIPE CONNECT DEL CONDUCTOR
  // ─────────────────────────────────────────────────────────────

  createConnectAccount: async (): Promise<{ onboardingUrl: string; stripeAccountId: string }> => {
    const { data } = await apiClient.post<{ onboardingUrl: string; stripeAccountId: string }>(
      '/payment/driver/connect'
    );
    return data;
  },

  getDriverPaymentStatus: async (): Promise<{
    hasConnectAccount:  boolean;
    accountVerified:    boolean;
    availableBalance:   number;
  }> => {
    const { data } = await apiClient.get<{
      hasConnectAccount:  boolean;
      accountVerified:    boolean;
      availableBalance:   number;
    }>('/payment/driver/status');
    return data;
  },

  // ─────────────────────────────────────────────────────────────
  // GANANCIAS Y RETIROS DEL CONDUCTOR
  // ─────────────────────────────────────────────────────────────

  getEarnings: async (): Promise<{ summary: EarningsSummary; recent: EarningEntry[] }> => {
    const { data } = await apiClient.get<{ summary: EarningsSummary; recent: EarningEntry[] }>(
      '/payment/driver/earnings'
    );
    return data;
  },

  requestWithdrawal: async (amount: number): Promise<{ withdrawal: Withdrawal; message: string }> => {
    const { data } = await apiClient.post<{ withdrawal: Withdrawal; message: string }>(
      '/payment/driver/withdrawal',
      { amount }
    );
    return data;
  },

  listWithdrawals: async (): Promise<Withdrawal[]> => {
    const { data } = await apiClient.get<{ withdrawals: Withdrawal[] }>('/payment/driver/withdrawals');
    return data.withdrawals;
  },
};
