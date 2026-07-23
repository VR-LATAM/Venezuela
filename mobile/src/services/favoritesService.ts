// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { apiClient } from './apiClient';

export interface FavoriteDestination {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  icon: string;
  use_count: number;
}

export interface FavoriteDriver {
  id: string;
  driver_id: string;
  driver_name: string;
  driver_photo: string | null;
  driver_rating: number;
  driver_vehicle: string;
  note: string | null;
}

export const favoritesService = {
  getDestinations: async (): Promise<FavoriteDestination[]> => {
    const r = await apiClient.get('/favorites/destinations');
    return r.data.data.destinations;
  },

  upsertDestination: async (params: {
    name: string; address: string; lat: number; lng: number; icon?: string;
  }): Promise<FavoriteDestination> => {
    const r = await apiClient.post('/favorites/destinations', params);
    return r.data.data.destination;
  },

  deleteDestination: async (id: string): Promise<void> => {
    await apiClient.delete(`/favorites/destinations/${id}`);
  },

  getFavoriteDrivers: async (): Promise<FavoriteDriver[]> => {
    const r = await apiClient.get('/favorites/drivers');
    return r.data.data.drivers;
  },

  addFavoriteDriver: async (driverId: string, note?: string): Promise<void> => {
    await apiClient.post(`/favorites/drivers/${driverId}`, { note });
  },

  removeFavoriteDriver: async (driverId: string): Promise<void> => {
    await apiClient.delete(`/favorites/drivers/${driverId}`);
  },
};
