// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { apiClient } from './apiClient';

export const promoService = {
  validate: async (code: string): Promise<{
    valid: boolean;
    discount_percent: number;
    description: string | null;
  }> => {
    const r = await apiClient.post('/promo/validate', { code });
    return r.data.data;
  },
};
