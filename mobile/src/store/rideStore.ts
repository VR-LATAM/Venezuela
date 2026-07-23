// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// RideStore — Zustand store para el estado del viaje en tiempo real
// Gestiona el ciclo de vida completo desde la app del pasajero y conductor
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { Ride, FareEstimate, NearbyDriver, ServiceType } from '@vride/shared';
import { rideMobileService } from '../services/rideService';

// Estado del ciclo de búsqueda/viaje del pasajero
export type RideSearchStatus =
  | 'idle'            // Sin viaje activo
  | 'requesting'      // Procesando solicitud
  | 'searching'       // Buscando conductor
  | 'driver_assigned' // Conductor asignado, en camino
  | 'driver_arrived'  // Conductor llegó al punto de recogida
  | 'in_progress'     // Viaje en curso
  | 'completed'       // Viaje completado — mostrar pantalla de calificación
  | 'no_driver_found' // Sin conductores disponibles
  | 'cancelled';      // Viaje cancelado

interface DriverLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  timestamp: number;
}

interface AssignedDriver {
  id: string;
  name: string;
  photo_url?: string;
  rating_avg: number;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  vehicle_plate?: string;
}

interface AssignedPassenger {
  id: string;
  name: string;
  photo_url?: string;
  patient_phone?: string | null;
}

interface IncomingRideRequest {
  rideId: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number;
  pickupLng: number;
  serviceType: string;
  distanceFromDriver: number;
  timeoutSeconds: number;
}

interface RideState {
  // ── Estado del pasajero ──
  searchStatus: RideSearchStatus;
  currentRide: Ride | null;
  fareEstimate: FareEstimate | null;
  selectedService: ServiceType;
  assignedDriver: AssignedDriver | null;
  driverLocation: DriverLocation | null;
  searchRadiusKm: number;
  totalCharged: number | null;

  // ── Estado del conductor ──
  isOnline: boolean;
  incomingRequest: IncomingRideRequest | null;
  activeRide: Ride | null;  // Viaje que el conductor tiene en curso
  assignedPassenger: AssignedPassenger | null;  // Pasajero del viaje activo
  completedRideId: string | null;       // Para calificar al pasajero tras completar
  driverEarnings: number | null;        // Ganancias del viaje completado

  // ── Acciones del pasajero ──
  setSelectedService: (s: ServiceType) => void;
  setFareEstimate: (e: FareEstimate | null) => void;
  setSearchStatus: (s: RideSearchStatus) => void;
  setCurrentRide: (r: Ride | null) => void;
  setAssignedDriver: (d: AssignedDriver | null) => void;
  updateDriverLocation: (loc: DriverLocation) => void;
  setSearchRadius: (km: number) => void;
  setTotalCharged: (amount: number) => void;
  resetPassengerState: () => void;

  // ── Acciones del conductor ──
  setOnline: (online: boolean) => void;
  setIncomingRequest: (req: IncomingRideRequest | null) => void;
  setActiveRide: (r: Ride | null) => void;
  setAssignedPassenger: (p: AssignedPassenger | null) => void;
  setCompletedRide: (rideId: string, earnings: number) => void;
  resetDriverRatingState: () => void;

  // ── Acciones compartidas ──
  cancelCurrentRide: (reason?: string) => Promise<number>;
  loadActiveRide: () => Promise<void>;
}

export const useRideStore = create<RideState>((set, get) => ({
  // Estado inicial
  searchStatus:    'idle',
  currentRide:     null,
  fareEstimate:    null,
  selectedService: 'standard',
  assignedDriver:  null,
  driverLocation:  null,
  searchRadiusKm:  10,
  totalCharged:    null,

  isOnline:          false,
  incomingRequest:   null,
  activeRide:        null,
  assignedPassenger: null,
  completedRideId:   null,
  driverEarnings:    null,

  // ── Acciones del pasajero ──
  setSelectedService:  (s) => set({ selectedService: s }),
  setFareEstimate:     (e) => set({ fareEstimate: e }),
  setSearchStatus:     (s) => set({ searchStatus: s }),
  setCurrentRide:      (r) => set({ currentRide: r }),
  setAssignedDriver:   (d) => set({ assignedDriver: d }),
  updateDriverLocation: (loc) => set({ driverLocation: loc }),
  setSearchRadius:     (km) => set({ searchRadiusKm: km }),
  setTotalCharged:     (amount) => set({ totalCharged: amount }),

  resetPassengerState: () => set({
    searchStatus:   'idle',
    currentRide:    null,
    fareEstimate:   null,
    assignedDriver: null,
    driverLocation: null,
    searchRadiusKm: 10,
    totalCharged:   null,
  }),

  // ── Acciones del conductor ──
  setOnline:            (online) => set({ isOnline: online }),
  setIncomingRequest:   (req)    => set({ incomingRequest: req }),
  setActiveRide:        (r)      => set({ activeRide: r, assignedPassenger: r ? get().assignedPassenger : null }),
  setAssignedPassenger: (p)      => set({ assignedPassenger: p }),
  setCompletedRide:     (rideId, earnings) => set({ completedRideId: rideId, driverEarnings: earnings }),
  resetDriverRatingState: () => set({ completedRideId: null, driverEarnings: null }),

  // ── Cancelar viaje activo ──
  cancelCurrentRide: async (reason?: string) => {
    const { currentRide, activeRide } = get();
    const rideId = currentRide?.id ?? activeRide?.id;
    if (!rideId) return 0;

    let fee = 0;
    try {
      const cancelled = await rideMobileService.cancelRide(rideId, reason);
      fee = Number(cancelled.cancellation_fee ?? 0);
    } catch {
      // Ignorar errores de red — el estado local se limpia de todas formas
    }

    set({
      searchStatus:   'cancelled',
      currentRide:    null,
      activeRide:     null,
      assignedDriver: null,
      driverLocation: null,
    });
    return fee;
  },

  // ── Cargar viaje activo (al abrir la app) ──
  loadActiveRide: async () => {
    try {
      const ride = await rideMobileService.getActiveRide();
      if (!ride) return;

      // Restaurar estado según el status del viaje en BD
      const statusMap: Record<string, RideSearchStatus> = {
        searching:       'searching',
        driver_assigned: 'driver_assigned',
        driver_arriving: 'driver_assigned',
        driver_arrived:  'driver_arrived',
        in_progress:     'in_progress',
      };

      set({
        currentRide:  ride,
        searchStatus: statusMap[ride.status] ?? 'idle',
      });
    } catch {
      // Sin viaje activo
    }
  },
}));

// Selectores para evitar re-renders innecesarios
export const useSearchStatus = () => useRideStore(s => s.searchStatus);
export const useCurrentRide  = () => useRideStore(s => s.currentRide);
export const useAssignedDriver = () => useRideStore(s => s.assignedDriver);
export const useDriverLocation = () => useRideStore(s => s.driverLocation);
export const useIsOnline = () => useRideStore(s => s.isOnline);
export const useIncomingRequest = () => useRideStore(s => s.incomingRequest);
export const useActiveRide = () => useRideStore(s => s.activeRide);
