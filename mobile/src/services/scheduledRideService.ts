// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { apiClient } from './apiClient';

export interface ScheduledRide {
  id:             string;
  service_type:   string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_at:   string;
  status:         'pending' | 'dispatching' | 'assigned' | 'cancelled' | 'completed';
  ride_id:        string | null;
  created_at:     string;
}

export const scheduledRideService = {
  book: async (params: {
    serviceType:    string;
    pickupAddress:  string;
    pickupLat:      number;
    pickupLng:      number;
    dropoffAddress: string;
    scheduledAt:    string;
  }): Promise<ScheduledRide> => {
    const { data } = await apiClient.post<ScheduledRide>('/scheduled', params);
    return data;
  },

  list: async (): Promise<ScheduledRide[]> => {
    const { data } = await apiClient.get<{ success: boolean; data: { rides: ScheduledRide[] } }>('/scheduled');
    return data.data.rides;
  },

  cancel: async (id: string): Promise<void> => {
    await apiClient.delete(`/scheduled/${id}`);
  },
};
