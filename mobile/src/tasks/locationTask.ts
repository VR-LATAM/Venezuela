// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// Tarea de background — envía posición del conductor al backend via HTTP
// Funciona tanto en foreground como cuando la app está minimizada o el conductor recibe una llamada.
// Los sockets de Socket.io no operan en background; el backend recibe el HTTP y retransmite al pasajero.

import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import type { LocationObject } from 'expo-location';

export const DRIVER_LOCATION_TASK = 'DRIVER_BACKGROUND_LOCATION';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const MAX_RETRIES = 3;

async function sendLocation(token: string, payload: object): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${API_URL}/api/v1/driver/location`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        // Token expirado — limpiar para forzar re-login en foreground
        await SecureStore.deleteItemAsync('access_token');
        return false;
      }

      if (res.ok) return true;
    } catch {
      // Error de red — esperar antes de reintentar (exponential backoff)
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
  return false;
}

TaskManager.defineTask(DRIVER_LOCATION_TASK, async ({ data, error }: any) => {
  if (error) return;

  const locations: LocationObject[] = (data as any)?.locations ?? [];
  if (!locations.length) return;

  const loc = locations[locations.length - 1];
  const { latitude, longitude, heading, speed } = loc.coords;

  const token = await SecureStore.getItemAsync('access_token');
  if (!token) return;

  // heading -1 = "not available" en Android (conductor quieto) — zod backend rechaza min(0)
  const safeHeading = (heading != null && heading >= 0 && heading <= 360) ? heading : undefined;
  const safeSpeed   = (speed   != null && speed   >= 0)                  ? speed   : undefined;

  await sendLocation(token, {
    latitude,
    longitude,
    heading:   safeHeading,
    speed:     safeSpeed,
    timestamp: Date.now(),
  });
});
