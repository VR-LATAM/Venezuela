// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio de tarifas — cálculo de precios y geocodificación
// Fórmula VE: base + km×ppk (sin componente de tiempo)
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
  encomienda:      1.0,
  pickup:          1.4,
  plataforma:      1.8,
  carga:           2.0,
  cisterna:           1.5,
  grua:               2.0,
  mecanico:           1.2,
  planta_electrica:   1.5,
  tanque_gas:         1.2,
  baterias:           1.2,
  cauchos:            1.2,
  gasolina:           1.3,
  aire_acondicionado: 1.3,
  mudanza:            2.0,
  taller_mecanico:    1.0,
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
): Promise<{ distanceKm: number; durationMinutes: number }> {
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
        distanceKm:      element.distance.value / 1000, // metros → km
        durationMinutes: Math.ceil(element.duration.value / 60),
      };
    }
  } catch (err) {
    logger.warn('Distance Matrix falló, usando Haversine:', err);
  }

  // Fallback: Haversine × 1.2 — velocidad promedio 40 km/h (tráfico venezolano)
  const distKm = haversineKm(pickupLat, pickupLng, dropoffLat, dropoffLng) * 1.2;
  const durationMin = Math.ceil((distKm / 40) * 60);
  return { distanceKm: distKm, durationMinutes: durationMin };
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
  packageSize?: 'small' | 'medium' | 'large';
  deliveryVehicle?: 'motorcycle' | 'sedan' | 'suv' | 'pickup' | 'plataforma';
  cargaVehicle?: '350' | 'npr';
}): Promise<FareEstimate> {
  // Configuración del estado (tarifas configurables por admin)
  let stateConfig: USState | null = null;
  try {
    stateConfig = await getStateConfig(params.stateCode);
  } catch (err) {
    logger.error(`calculateFareEstimate: getStateConfig falló para stateCode="${params.stateCode}"`, err);
    throw err;
  }

  // pg devuelve columnas NUMERIC como strings — convertir siempre a número
  // La columna se llama price_per_mile en BD por historia, pero almacena precio por KM
  const baseFare     = +(stateConfig?.base_fare        ?? 1.00);
  const pricePerKm   = +(stateConfig?.price_per_mile   ?? 0.88);
  const pricePerMin  = +(stateConfig?.price_per_minute ?? 0.05);
  const minFare        = +(stateConfig?.min_fare             ?? 1.00);
  const motorcycleMultiplier = +(stateConfig?.motorcycle_multiplier ?? 0.55);
  const suvMultiplier        = +(stateConfig?.suv_multiplier        ?? 1.30);

  // Encomienda: pasajero elige vehículo; siempre 40% más barato que transporte de personas
  // Carga: vehículo pesado (350 o NPR), precio de referencia para la negociación
  // Otros servicios: multiplicador fijo por tipo de vehículo
  let serviceMultiplier: number;
  if (params.serviceType === 'encomienda') {
    const vehicle = params.deliveryVehicle ?? 'motorcycle';
    const vehicleBase =
      vehicle === 'motorcycle' ? motorcycleMultiplier :
      vehicle === 'suv'        ? suvMultiplier        :
      1.0;
    serviceMultiplier = vehicleBase * 0.60;
  } else if (params.serviceType === 'carga') {
    serviceMultiplier = params.cargaVehicle === 'npr' ? 2.2 : 1.8;
  } else {
    serviceMultiplier =
      params.serviceType === 'motorcycle' ? motorcycleMultiplier :
      params.serviceType === 'suv'        ? suvMultiplier        :
      params.serviceType === 'pickup'     ? 1.20                 :
      params.serviceType === 'plataforma' ? 3.0                  :
      1.0;
  }

  // Surge pricing (hora pico)
  const surgeMultiplier = isSurgeHour() ? +(stateConfig?.surge_multiplier ?? 1.5) : 1.0;

  // Distancia y tiempo real via Google Maps / Haversine (en km)
  logger.info(`calculateFareEstimate: state=${params.stateCode} svc=${params.serviceType} coords=(${params.pickupLat.toFixed(4)},${params.pickupLng.toFixed(4)})→(${params.dropoffLat.toFixed(4)},${params.dropoffLng.toFixed(4)})`);
  const { distanceKm, durationMinutes } = await getDistanceAndDuration(
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
      distance_km:          Math.round(distanceKm * 100) / 100,
      duration_minutes:     durationMinutes,
      driver_eta_minutes:   params.driverEtaMinutes,
      hourly_package_hours: hours,
    };
  }

  // Wait & Return — ida + espera estimada + vuelta
  if (params.serviceType === 'wait_and_return') {
    const waitPerMin    = +(stateConfig?.wait_per_minute_rate ?? 0.30);
    const estimatedWait = params.estimatedWaitMinutes ?? 60;
    const waitFare      = estimatedWait * waitPerMin;

    const safeDistKm      = isFinite(distanceKm)      ? distanceKm      : 0;
    const safeDurationMin = isFinite(durationMinutes)  ? durationMinutes : 0;
    const oneLegFare = Math.max(
      (baseFare + safeDistKm * pricePerKm) * surgeMultiplier,
      minFare
    );
    const total = Math.round((oneLegFare * 2 + waitFare) * 100) / 100;
    const { ves, rate } = await convertToVES(total);

    return {
      service_type:          params.serviceType,
      base_fare:             Math.round(baseFare * 2 * 100) / 100,
      distance_fare:         Math.round(safeDistKm * pricePerKm * 2 * 100) / 100,
      time_fare:             Math.round(safeDurationMin * pricePerMin * 2 * 100) / 100,
      surge_multiplier:      surgeMultiplier,
      service_multiplier:    1.0,
      subtotal:              total,
      total,
      total_ves:             ves,
      exchange_rate_ves:     rate,
      distance_km:           Math.round(safeDistKm * 100) / 100,
      duration_minutes:      safeDurationMin,
      driver_eta_minutes:    params.driverEtaMinutes,
      wait_fare_estimate:    Math.round(waitFare * 100) / 100,
      wait_per_minute_rate:  waitPerMin,
    };
  }

  // Proteger contra NaN
  const safeDistKm      = isFinite(distanceKm)     ? distanceKm     : 0;
  const safeDurationMin = isFinite(durationMinutes) ? durationMinutes : 0;

  // Mínimo diferenciado por tipo de servicio
  const effectiveMinFare =
    params.serviceType === 'motorcycle'  ? minFare * motorcycleMultiplier :
    params.serviceType === 'encomienda'  ? Math.min(minFare, 2.00)        :
    params.serviceType === 'pickup'      ? Math.max(minFare, 15.00)       :
    params.serviceType === 'plataforma'  ? Math.max(minFare, 90.00)       :
    params.serviceType === 'carga'       ? Math.max(minFare, params.cargaVehicle === 'npr' ? 50.00 : 30.00) :
    minFare;

  // Tarifa solo por distancia (sin componente de tiempo)
  const distanceFare = safeDistKm * pricePerKm;
  const rawSubtotal  = (baseFare + distanceFare) * serviceMultiplier * surgeMultiplier;
  const subtotal     = Math.max(rawSubtotal, effectiveMinFare);
  const total        = Math.round(subtotal * 100) / 100;
  const { ves, rate } = await convertToVES(total);

  return {
    service_type:       params.serviceType,
    base_fare:          baseFare,
    distance_fare:      Math.round(distanceFare * 100) / 100,
    time_fare:          0,
    surge_multiplier:   surgeMultiplier,
    service_multiplier: serviceMultiplier,
    subtotal:           total,
    total,
    total_ves:          ves,
    exchange_rate_ves:  rate,
    distance_km:        Math.round(safeDistKm * 100) / 100,
    duration_minutes:   safeDurationMin,
    driver_eta_minutes: params.driverEtaMinutes,
  };
}

// ─────────────────────────────────────
// Fórmula Haversine — distancia en KM entre dos puntos GPS
// ─────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Radio de la Tierra en km
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
