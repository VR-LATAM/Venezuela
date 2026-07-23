// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio de pasajero (móvil) — perfil y necesidades especiales
// ═══════════════════════════════════════════════════════════════

import { apiClient } from './apiClient';
import { Passenger, PassengerSpecialNeeds } from '@vride/shared';

export const passengerMobileService = {
  // Obtener perfil completo del pasajero autenticado
  getProfile: async (): Promise<Passenger> => {
    const response = await apiClient.get('/passenger/profile');
    return response.data.data as Passenger;
  },

  // Actualizar perfil de necesidades especiales (merge parcial)
  updateSpecialNeeds: async (data: Partial<PassengerSpecialNeeds>): Promise<Passenger> => {
    const response = await apiClient.patch('/passenger/special-needs', data);
    return response.data.data as Passenger;
  },
};
