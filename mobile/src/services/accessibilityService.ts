// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { apiClient } from './apiClient';

export interface AccessibilityProfile {
  wheelchair: boolean;
  walker: boolean;
  white_cane: boolean;
  service_animal: boolean;
  oxygen_support: boolean;
  hearing_impaired: boolean;
  visual_impaired: boolean;
  cognitive_support: boolean;
  extra_time_boarding: boolean;
  notes: string | null;
}

export const accessibilityService = {
  get: async (): Promise<AccessibilityProfile | null> => {
    const r = await apiClient.get('/accessibility/profile');
    return r.data.data.profile;
  },

  save: async (profile: Partial<AccessibilityProfile>): Promise<AccessibilityProfile> => {
    const r = await apiClient.put('/accessibility/profile', profile);
    return r.data.data.profile;
  },
};
