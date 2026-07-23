// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Hook de monitoreo de velocidad — alerta al conductor si supera el límite
// Usa el atributo speed de expo-location (m/s → mph)
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Alert, Platform } from 'react-native';

const SPEED_LIMIT_MPH        = 75;   // Umbral de alerta
const ALERT_COOLDOWN_MS      = 30000; // No repetir alerta por 30 segundos

export interface SpeedState {
  speedMph: number;
  isOverLimit: boolean;
}

export function useSpeedMonitor(active: boolean): SpeedState {
  const [speedMph, setSpeedMph]       = useState(0);
  const [isOverLimit, setIsOverLimit] = useState(false);
  const lastAlertRef  = useRef<number>(0);
  const watchRef      = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!active) {
      watchRef.current?.remove();
      watchRef.current = null;
      setSpeedMph(0);
      setIsOverLimit(false);
      return;
    }

    let mounted = true;

    const startWatch = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !mounted) return;

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 0,
        },
        location => {
          if (!mounted) return;
          const rawSpeed = location.coords.speed ?? 0;
          if (rawSpeed < 0) return;

          const mph = rawSpeed * 2.237; // m/s → mph
          setSpeedMph(Math.round(mph));

          const over = mph > SPEED_LIMIT_MPH;
          setIsOverLimit(over);

          if (over) {
            const now = Date.now();
            if (now - lastAlertRef.current > ALERT_COOLDOWN_MS) {
              lastAlertRef.current = now;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              Alert.alert(
                '⚠️ Speed Alert',
                `You are driving at ${Math.round(mph)} mph. Please slow down.`,
                [{ text: 'OK' }]
              );
            }
          }
        }
      );
    };

    startWatch();
    return () => {
      mounted = false;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [active]);

  return { speedMph, isOverLimit };
}
