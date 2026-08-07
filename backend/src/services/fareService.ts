// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio de tarifas — cálculo de precios y geocodificación
// Usa Google Maps Distance Matrix API con fallback Haversine
// Aplica surge pricing según hora del día y config del estado
// ═══════════════════════════════════════════════════════════════

import axios from 'axios';
import { queryOne } from '../config/database';
import { redis, REDIS_KEYS, REDIS_TTL } from '../config/redis';
import { env } from '../config/env';
import { FareEstimate, ServiceType, USState } from '@vride/shared';
import { logger } from '../utils/logger';
import { convertToVES } from './exchangeRateService';

// Multiplicadores de servicio — fallback si la BD no los tiene
const SERVICE_MULTIPLIERS: Record<ServiceType, number> = {
  motorcycle:      0.75,
  sedan:           1.0,
  suv:             1.3,
  scheduled:       1.0,
  hourly:          1.0,
  wait_and_return: 1.0,
};

// ─────────────────────────────────────
// Obtener configuración del estado (con caché Redis de 1h)
// ─────────────────────────────────────
export async function getStateConfig(stateCode: string): Promise<USState | null> {
  // Caché desactivado temporalmente — siempre lee de BD
  const state = await queryOne<USState>(
    'SELECT * FROM us_states WHERE code = $1',
    [stateCode]
  );
  return state;
}

// ─────────────────────────────────────
// Detectar si es hora pico (surge pricing)
// Pico: 12-2pm y 6-9pm (hora local del estado)
// ─────────────────────────────────────
export function isSurgeHour(): boolean {
  const hour = new Date().getHours();
  return (hour >= 12 && hour < 14) || (hour >= 18 && hour < 21);
}

// ─────────────────────────────────────
// Geocodificar dirección a coordenadas via Google Maps
// ─────────────────────────────────────
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await axios.get<{
      status: string;
      results: Array<{
        geometry: { location: { lat: number; lng: number } };
      }>;
    }>(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: { address, key: env.GOOGLE_MAPS_API_KEY },
        timeout: 5000,
      }
    );

    if (response.data.status === 'OK' && response.data.results[0]) {
      const { lat, lng } = response.data.results[0].geometry.location;
      return { lat, lng };
    }
    return null;
  } catch (err) {
    logger.warn('Geocoding falló, sin coordenadas de destino:', err);
    return null;
  }
}

// ─────────────────────────────────────
// Calcular distancia y tiempo via Google Maps Distance Matrix API
// Fallback: fórmula Haversine para distancia recta * 1.3 (factor de ruta)
// ─────────────────────────────────────
export async function getDistanceAndDuration(
  pickupLat: number, pickupLng: number,
  dropoffLat: number, dropoffLng: number
): Promise<{ distanceMiles: number; durationMinutes: number }> {
  try {
    const response = await axios.get<{
      status: string;
      rows: Array<{
        elements: Array<{
          status: string;
          distance: { value: number };
          duration: { value: number };
        }>;
      }>;
    }>(
      'https://maps.googleapis.com/maps/api/distancematrix/json',
      {
        params: {
          origins: `${pickupLat},${pickupLng}`,
          destinations: `${dropoffLat},${dropoffLng}`,
          mode: 'driving',
          key: env.GOOGLE_MAPS_API_KEY,
        },
        timeout: 5000,
      }
    );

    const element = response.data.rows[0]?.elements[0];
    if (response.data.status === 'OK' && element?.status === 'OK') {
      return {
        distanceMiles:   element.distance.value / 1609.34, // metros → millas
        durationMinutes: Math.ceil(element.duration.value / 60),
      };
    }
  } catch (err) {
    logger.warn('Distance Matrix falló, usando Haversine:', err);
  }

  // Fallback: Haversine × 1.2 — velocidad promedio 35 mph (incluye autopistas Houston)
  const distMiles = haversineMiles(pickupLat, pickupLng, dropoffLat, dropoffLng) * 1.2;
  const durationMin = Math.ceil((distMiles / 35) * 60);
  return { distanceMiles: distMiles, durationMinutes: durationMin };
}

// ─────────────────────────────────────
// Calcular estimación de tarifa completa
// Usada antes de que el pasajero confirme el viaje
// ─────────────────────────────────────
export async function calculateFareEstimate(params: {
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  serviceType: ServiceType;
  stateCode: string;
  driverEtaMinutes?: number;
  estimatedWaitMinutes?: number;
  hourlyPackageHours?: number;
}): Promise<FareEstimate> {
  // Configuración del estado (tarifas configurables por admin)
  const stateConfig = await getStateConfig(params.stateCode);

  // pg devuelve columnas NUMERIC como strings — convertir siempre a número
  // price_per_km almacena la tarifa por MILLA (mercado EE.UU.)
  const baseFare       = +(stateConfig?.base_fare            ?? 1.50);
  const pricePerMile   = +(stateConfig?.price_per_mile        ?? 0.82);
  const pricePerMin    = +(stateConfig?.price_per_minute     ?? 0.19);
  const minFare        = +(stateConfig?.min_fare             ?? 5.00);
  const motorcycleMultiplier = +(stateConfig?.motorcycle_multiplier ?? 0.75);
  const suvMultiplier        = +(stateConfig?.suv_multiplier        ?? 1.30);

  // Multiplicador de servicio según tipo de vehículo
  const serviceMultiplier =
    params.serviceType === 'motorcycle' ? motorcycleMultiplier :
    params.serviceType === 'suv'        ? suvMultiplier        :
    1.0;

  // Surge pricing (hora pico)
  const surgeMultiplier = isSurgeHour() ? +(stateConfig?.surge_multiplier ?? 1.5) : 1.0;

  // Distancia y tiempo real via Google Maps / Haversine (en millas)
  const { distanceMiles, durationMinutes } = await getDistanceAndDuration(
    params.pickupLat, params.pickupLng,
    params.dropoffLat, params.dropoffLng
  );

  // Hourly Ride — precio fijo por paquete de horas (2h/4h/8h)
  if (params.serviceType === 'hourly') {
    const hours = params.hourlyPackageHours ?? 2;
    const hourlyPrice =
      hours >= 8 ? +(stateConfig?.hourly_8h_price ?? 140.00) :
      hours >= 4 ? +(stateConfig?.hourly_4h_price ?? 80.00)  :
                   +(stateConfig?.hourly_2h_price ?? 45.00);
    const { ves, rate } = await convertToVES(hourlyPrice);
    return {
      service_type:         params.serviceType,
      base_fare:            0,
      distance_fare:        0,
      time_fare:            0,
      surge_multiplier:     1.0,
      service_multiplier:   1.0,
      subtotal:             hourlyPrice,
      total:                hourlyPrice,
      total_ves:            ves,
      exchange_rate_ves:    rate,
      distance_miles:       Math.round(distanceMiles * 100) / 100,
      duration_minutes:     durationMinutes,
      driver_eta_minutes:   params.driverEtaMinutes,
      hourly_package_hours: hours,
    };
  }

  // Wait & Return — ida + espera estimada + vuelta
  if (params.serviceType === 'wait_and_return') {
    const waitPerMin      = +(stateConfig?.wait_per_minute_rate ?? 0.30);
    const estimatedWait   = params.estimatedWaitMinutes ?? 60;
    const waitFare        = estimatedWait * waitPerMin;

    // Tarifas de ida
    const safeDistMiles   = isFinite(distanceMiles)   ? distanceMiles   : 0;
    const safeDurationMin = isFinite(durationMinutes) ? durationMinutes : 0;
    const oneLegFare = Math.max(
      (baseFare + safeDistMiles * pricePerMile + safeDurationMin * pricePerMin) * surgeMultiplier,
      minFare
    );
    const total = Math.round((oneLegFare * 2 + waitFare) * 100) / 100;
    const { ves, rate } = await convertToVES(total);

    return {
      service_type:          params.serviceType,
      base_fare:             Math.round(baseFare * 2 * 100) / 100,
      distance_fare:         Math.round(safeDistMiles * pricePerMile * 2 * 100) / 100,
      time_fare:             Math.round(safeDurationMin * pricePerMin * 2 * 100) / 100,
      surge_multiplier:      surgeMultiplier,
      service_multiplier:    1.0,
      subtotal:              total,
      total,
      total_ves:             ves,
      exchange_rate_ves:     rate,
      distance_miles:        Math.round(safeDistMiles * 100) / 100,
      duration_minutes:      safeDurationMin,
      driver_eta_minutes:    params.driverEtaMinutes,
      wait_fare_estimate:    Math.round(waitFare * 100) / 100,
      wait_per_minute_rate:  waitPerMin,
    };
  }

  // Proteger contra NaN
  const safeDistMiles   = isFinite(distanceMiles)   ? distanceMiles   : 0;
  const safeDurationMin = isFinite(durationMinutes) ? durationMinutes : 0;

  // Tarifa desglosada en millas
  const distanceFare = safeDistMiles   * pricePerMile;
  const timeFare     = safeDurationMin * pricePerMin;
  const rawSubtotal  = (baseFare + distanceFare + timeFare) * serviceMultiplier * surgeMultiplier;
  const subtotal     = Math.max(rawSubtotal, minFare);
  const total        = Math.round(subtotal * 100) / 100;
  const { ves, rate } = await convertToVES(total);

  return {
    service_type:       params.serviceType,
    base_fare:          baseFare,
    distance_fare:      Math.round(distanceFare * 100) / 100,
    time_fare:          Math.round(timeFare * 100) / 100,
    surge_multiplier:   surgeMultiplier,
    service_multiplier: serviceMultiplier,
    subtotal:           total,
    total,
    total_ves:          ves,
    exchange_rate_ves:  rate,
    distance_miles:     Math.round(safeDistMiles * 100) / 100,
    duration_minutes:   safeDurationMin,
    driver_eta_minutes: params.driverEtaMinutes,
  };
}

// ─────────────────────────────────────
// Fórmula Haversine — distancia en MILLAS entre dos puntos GPS
// ─────────────────────────────────────
function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Radio de la Tierra en millas
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
