// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
// Tests unitarios del servicio de tarifas
// Los módulos externos (DB, Redis, Google Maps) son mocked para aislar la lógica

import axios from 'axios';

// ─── Mocks ───────────────────────────────────────────────────────────────────
jest.mock('axios');
jest.mock('../config/database', () => ({
  queryOne: jest.fn(),
}));
jest.mock('../config/redis', () => ({
  redis:      { get: jest.fn(), setex: jest.fn() },
  REDIS_KEYS: { stateConfig: (code: string) => `state:config:${code}` },
  REDIS_TTL:  { STATE_CONFIG: 3600 },
}));
jest.mock('../config/env', () => ({
  env: { GOOGLE_MAPS_API_KEY: 'test-key' },
}));
jest.mock('../utils/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import { calculateFareEstimate, getDistanceAndDuration } from '../services/fareService';
import { queryOne } from '../config/database';
import { redis } from '../config/redis';

// ─── Fixture de configuración de estado ──────────────────────────────────────
const TX_CONFIG = {
  code:                        'TX',
  base_fare:                   3.00,
  price_per_mile:              1.20,   // tarifa por MILLA (mercado EE.UU.)
  price_per_minute:            0.25,
  min_fare:                    6.00,
  surge_multiplier:            1.5,
  platform_commission_percent: 17,
  executive_multiplier:        1.8,
  accessible_multiplier:       1.4,
  hourly_rate:                 45,
  hourly_2h_price:             45,
};

// Forzar hora fuera de pico (sin surge) para la mayoría de tests
function mockNonSurgeHour() {
  jest.spyOn(Date.prototype, 'getHours').mockReturnValue(10); // 10am
}
function mockSurgeHour() {
  jest.spyOn(Date.prototype, 'getHours').mockReturnValue(19); // 7pm
}

describe('fareService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Redis vacío por defecto (fuerza consulta a DB)
    (redis.get as jest.Mock).mockResolvedValue(null);
    (redis.setex as jest.Mock).mockResolvedValue('OK');
    (queryOne as jest.Mock).mockResolvedValue(TX_CONFIG);
    // Google Maps: simular respuesta OK
    // 16_093 metros = exactamente 10 millas (16093 / 1609.34 = 10.00)
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        status: 'OK',
        rows: [{ elements: [{ status: 'OK', distance: { value: 16_093 }, duration: { value: 900 } }] }],
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('calculateFareEstimate — standard service', () => {
    const BASE_PARAMS = {
      pickupLat:  29.7604, pickupLng: -95.3698,  // Houston
      dropoffLat: 30.2672, dropoffLng: -97.7431, // Austin
      serviceType: 'standard' as const,
      stateCode:   'TX',
    };

    it('calcula correctamente tarifa estándar fuera de hora pico', async () => {
      mockNonSurgeHour();
      const estimate = await calculateFareEstimate(BASE_PARAMS);

      // Distancia: 10 millas (mock) → 10 * 1.20 = 12.00
      // Tiempo:    15 min (mock) → 15 * 0.25 = 3.75
      // Subtotal:  3.00 + 12.00 + 3.75 = 18.75 (sin surge, sin multiplicador)
      expect(estimate.service_type).toBe('standard');
      expect(estimate.surge_multiplier).toBe(1.0);
      expect(estimate.service_multiplier).toBe(1.0);
      expect(estimate.base_fare).toBe(3.00);
      expect(estimate.distance_fare).toBe(12.00);
      expect(estimate.time_fare).toBe(3.75);
      expect(estimate.total).toBe(18.75);
      expect(estimate.distance_miles).toBeCloseTo(10, 1);
      expect(estimate.duration_minutes).toBe(15);
    });

    it('aplica surge multiplier en hora pico (1.5x)', async () => {
      mockSurgeHour();
      const estimate = await calculateFareEstimate(BASE_PARAMS);

      // 18.75 * 1.5 = 28.125 → 28.13
      expect(estimate.surge_multiplier).toBe(1.5);
      expect(estimate.total).toBeCloseTo(28.13, 1);
    });

    it('respeta el mínimo de tarifa', async () => {
      mockNonSurgeHour();
      // Viaje muy corto: 0.5 km / 2 min
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          status: 'OK',
          rows: [{ elements: [{ status: 'OK', distance: { value: 500 }, duration: { value: 120 } }] }],
        },
      });
      const estimate = await calculateFareEstimate(BASE_PARAMS);

      // Subtotal bruto: 3.00 + 0.6 + 0.5 = 4.10 < min_fare (6.00)
      expect(estimate.total).toBe(6.00);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('calculateFareEstimate — executive service', () => {
    it('aplica multiplicador executive (1.8x)', async () => {
      mockNonSurgeHour();
      const estimate = await calculateFareEstimate({
        pickupLat: 29.7604, pickupLng: -95.3698,
        dropoffLat: 30.2672, dropoffLng: -97.7431,
        serviceType: 'executive',
        stateCode: 'TX',
      });
      // 18.75 * 1.8 = 33.75
      expect(estimate.service_multiplier).toBe(1.8);
      expect(estimate.total).toBeCloseTo(33.75, 1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('calculateFareEstimate — accessible service', () => {
    it('aplica multiplicador accessible (1.4x)', async () => {
      mockNonSurgeHour();
      const estimate = await calculateFareEstimate({
        pickupLat: 29.7604, pickupLng: -95.3698,
        dropoffLat: 30.2672, dropoffLng: -97.7431,
        serviceType: 'accessible',
        stateCode: 'TX',
      });
      // 18.75 * 1.4 = 26.25
      expect(estimate.service_multiplier).toBe(1.4);
      expect(estimate.total).toBeCloseTo(26.25, 1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('calculateFareEstimate — hourly service', () => {
    it('retorna precio fijo de hourly_2h_price', async () => {
      mockNonSurgeHour();
      const estimate = await calculateFareEstimate({
        pickupLat: 29.7604, pickupLng: -95.3698,
        dropoffLat: 30.2672, dropoffLng: -97.7431,
        serviceType: 'hourly',
        stateCode: 'TX',
      });
      expect(estimate.total).toBe(45.00);
      expect(estimate.surge_multiplier).toBe(1.0); // No aplica surge en hourly
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('getDistanceAndDuration — fallback Haversine', () => {
    it('usa Haversine cuando Google Maps falla', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Houston → Dallas: ~239 millas línea recta × 1.2 ≈ 287 millas
      const result = await getDistanceAndDuration(
        29.7604, -95.3698,  // Houston
        32.7767, -96.7970   // Dallas
      );

      expect(result.distanceMiles).toBeGreaterThan(180);
      expect(result.distanceMiles).toBeLessThan(400);
      expect(result.durationMinutes).toBeGreaterThan(30);
    });

    it('usa Haversine cuando la respuesta de Google Maps tiene status != OK', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: { status: 'ZERO_RESULTS', rows: [] },
      });

      const result = await getDistanceAndDuration(29.7604, -95.3698, 30.2672, -97.7431);
      expect(result.distanceMiles).toBeGreaterThan(0);
    });

    it('retorna valores de Google Maps cuando la respuesta es correcta', async () => {
      const result = await getDistanceAndDuration(29.7604, -95.3698, 30.2672, -97.7431);
      // 16_093 metros / 1609.34 = 10.00 millas
      expect(result.distanceMiles).toBeCloseTo(10, 1);
      expect(result.durationMinutes).toBe(15);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('getStateConfig — consulta a BD', () => {
    it('retorna la configuración del estado desde la BD', async () => {
      const { getStateConfig } = await import('../services/fareService');
      (queryOne as jest.Mock).mockResolvedValue(TX_CONFIG);

      const config = await getStateConfig('TX');

      expect(config?.code).toBe('TX');
      expect(queryOne).toHaveBeenCalledWith(
        'SELECT * FROM us_states WHERE code = $1',
        ['TX']
      );
    });

    it('retorna null si el estado no existe en la BD', async () => {
      const { getStateConfig } = await import('../services/fareService');
      (queryOne as jest.Mock).mockResolvedValue(null);

      const config = await getStateConfig('XX');

      expect(config).toBeNull();
    });
  });
});
