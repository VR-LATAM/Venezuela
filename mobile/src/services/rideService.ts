// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio de viajes (móvil) — llamadas REST al API
// ═══════════════════════════════════════════════════════════════

import { apiClient } from './apiClient';
import { Ride, FareEstimate, ServiceType } from '@vride/shared';

export interface RideStop {
  address: string;
  lat: number;
  lng: number;
}

export interface RequestRideParams {
  pickupAddress:        string;
  pickupLat:            number;
  pickupLng:            number;
  dropoffAddress:       string;
  dropoffLat:           number;
  dropoffLng:           number;
  serviceType:          ServiceType;
  stateCode:            string;
  promoCode?:           string;
  stops?:               RideStop[];
  estimatedWaitMinutes?: number;
  hourlyPackageHours?:   number;
  // Encomienda / Delivery
  packageDescription?: string;
  packageSize?:        'small' | 'medium' | 'large';
  senderName?:         string;
  senderPhone?:        string;
  recipientName?:      string;
  recipientPhone?:     string;
  deliveryVehicle?:    'motorcycle' | 'sedan' | 'suv' | 'pickup' | 'plataforma';
  // Carga
  cargaVehicle?:       '350' | 'npr';
  offeredPrice?:       number;
}

export const rideMobileService = {
  // Estimar tarifa antes de solicitar
  estimateFare: async (params: {
    pickupLat:             number;
    pickupLng:             number;
    dropoffLat:            number;
    dropoffLng:            number;
    serviceType:           ServiceType;
    stateCode:             string;
    estimatedWaitMinutes?: number;
    hourlyPackageHours?:   number;
    packageSize?:          'small' | 'medium' | 'large';
    deliveryVehicle?:      'motorcycle' | 'sedan' | 'suv' | 'pickup' | 'plataforma';
    cargaVehicle?:         '350' | 'npr';
  }): Promise<FareEstimate> => {
    const r = await apiClient.post('/ride/estimate', params);
    return r.data.data as FareEstimate;
  },

  // Solicitar viaje
  requestRide: async (params: RequestRideParams): Promise<Ride> => {
    const r = await apiClient.post('/ride/request', params);
    return r.data.data as Ride;
  },

  // Viaje activo del usuario autenticado
  getActiveRide: async (): Promise<Ride | null> => {
    const r = await apiClient.get('/ride/active');
    return r.data.data as Ride | null;
  },

  // Cancelar viaje
  cancelRide: async (rideId: string, reason?: string): Promise<Ride> => {
    const r = await apiClient.post(`/ride/${rideId}/cancel`, { reason });
    return r.data.data as Ride;
  },

  // Conductor: marcar llegada al punto de recogida
  markArrived: async (rideId: string): Promise<Ride> => {
    const r = await apiClient.post(`/ride/${rideId}/arrived`);
    return r.data.data as Ride;
  },

  // Conductor: iniciar viaje
  startRide: async (rideId: string): Promise<Ride> => {
    const r = await apiClient.post(`/ride/${rideId}/start`);
    return r.data.data as Ride;
  },

  // Conductor: finalizar viaje
  completeRide: async (rideId: string): Promise<Ride> => {
    const r = await apiClient.post(`/ride/${rideId}/complete`);
    return r.data.data as Ride;
  },

  // Calificar viaje (pasajero o conductor)
  rateRide: async (rideId: string, score: number, comment?: string): Promise<void> => {
    await apiClient.post(`/ride/${rideId}/rate`, { score, comment });
  },

  // Historial de viajes
  getHistory: async (limit = 20, offset = 0): Promise<Ride[]> => {
    const r = await apiClient.get('/ride/history', { params: { limit, offset } });
    return r.data.data as Ride[];
  },

  // Paradas intermedias
  getStops: async (rideId: string) => {
    const r = await apiClient.get(`/ride/${rideId}/stops`);
    return r.data.data.stops as Array<{
      id: string; order_index: number; address: string;
      lat: number; lng: number; arrived_at: string | null;
    }>;
  },

  markStopArrived: async (rideId: string, stopId: string): Promise<void> => {
    await apiClient.post(`/ride/${rideId}/stops/${stopId}/arrive`);
  },

  // Notas del conductor post-viaje
  addDriverNotes: async (rideId: string, notes: string): Promise<void> => {
    await apiClient.post(`/ride/${rideId}/notes`, { notes });
  },

  // Geocodificar dirección personalizada (para pickup en delivery)
  geocodeAddress: async (address: string): Promise<{ lat: number; lng: number } | null> => {
    const r = await apiClient.get('/ride/geocode', { params: { address } });
    return r.data.data as { lat: number; lng: number } | null;
  },

  // Contra-oferta de precio (conductor, solo carga)
  counterOffer: async (rideId: string, counterPrice: number, counterReason: string): Promise<void> => {
    await apiClient.post(`/ride/${rideId}/counter-offer`, { counterPrice, counterReason });
  },

  // Respuesta del pasajero a la contra-oferta
  respondCounter: async (rideId: string, accept: boolean): Promise<void> => {
    await apiClient.post(`/ride/${rideId}/respond-counter`, { accept });
  },

  // Perfil público de un conductor (para mostrar al pasajero)
  getDriverPublicProfile: async (driverId: string): Promise<{
    id: string; name: string; photo_url?: string; rating_avg: number;
    vehicle_brand?: string; vehicle_model?: string; vehicle_color?: string; vehicle_plate?: string;
  }> => {
    const r = await apiClient.get(`/driver/public/${driverId}`);
    return r.data.data;
  },

  // SOS
  activateSOS: async (params: {
    rideId?: string; lat?: number; lng?: number; addressAtTrigger?: string;
  }): Promise<{ sosEventId: string }> => {
    const r = await apiClient.post('/sos', params);
    return r.data.data;
  },
};
