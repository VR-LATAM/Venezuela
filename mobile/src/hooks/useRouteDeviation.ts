// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Hook de desvío de ruta — detecta si el vehículo se aleja del destino
// Usa la distancia Haversine entre posición actual y destino
// Si la distancia al destino aumenta más de DEVIATION_THRESHOLD millas
// respecto al punto de inicio del viaje, emite alerta al pasajero
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

const DEVIATION_THRESHOLD_KM = 0.8; // umbral de desvío (800m)

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Coords { lat: number; lng: number; }

export function useRouteDeviation(
  active: boolean,
  currentLocation: Coords | null,
  dropoffCoords: Coords | null,
  pickupCoords: Coords | null,
  onDeviation?: () => void,
) {
  const [deviated, setDeviated]           = useState(false);
  const alertedRef                        = useRef(false);
  const baselineDistRef                   = useRef<number | null>(null);

  const check = useCallback(() => {
    if (!active || !currentLocation || !dropoffCoords || !pickupCoords) return;

    const distToDropoff = haversineKm(
      currentLocation.lat, currentLocation.lng,
      dropoffCoords.lat, dropoffCoords.lng,
    );

    // Establecer baseline al inicio del viaje
    if (baselineDistRef.current === null) {
      baselineDistRef.current = haversineKm(
        pickupCoords.lat, pickupCoords.lng,
        dropoffCoords.lat, dropoffCoords.lng,
      );
      return;
    }

    // Si la distancia al destino es mayor que la distancia inicial + umbral → desvío
    const excess = distToDropoff - (baselineDistRef.current + DEVIATION_THRESHOLD_KM);
    if (excess > 0 && !alertedRef.current) {
      alertedRef.current = true;
      setDeviated(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        '🚨 Route Deviation',
        'The driver appears to have deviated from the route. If you feel unsafe, press SOS.',
        [{ text: 'OK' }]
      );
      onDeviation?.();
    } else if (excess <= 0 && alertedRef.current) {
      // Recuperó la ruta
      alertedRef.current = false;
      setDeviated(false);
    }
  }, [active, currentLocation, dropoffCoords, pickupCoords, onDeviation]);

  useEffect(() => {
    if (!active) {
      setDeviated(false);
      alertedRef.current = false;
      baselineDistRef.current = null;
      return;
    }
    check();
  }, [active, check]);

  return { deviated };
}
