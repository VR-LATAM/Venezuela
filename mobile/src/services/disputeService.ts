// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { apiClient } from './apiClient';

export type DisputeReason =
  | 'overcharged' | 'wrong_route' | 'unsafe_driving' | 'driver_behavior'
  | 'vehicle_condition' | 'passenger_behavior' | 'no_show' | 'cancellation_fee' | 'other';

export interface Dispute {
  id: string;
  ride_id: string;
  reason: DisputeReason;
  description: string | null;
  status: 'open' | 'reviewing' | 'resolved' | 'closed';
  created_at: string;
}

export const disputeService = {
  open: async (params: {
    rideId: string;
    reason: DisputeReason;
    description?: string;
  }): Promise<Dispute> => {
    const r = await apiClient.post('/dispute/open', params);
    return r.data.data.dispute;
  },

  getMine: async (): Promise<Dispute[]> => {
    const r = await apiClient.get('/dispute/mine');
    return r.data.data.disputes;
  },
};
