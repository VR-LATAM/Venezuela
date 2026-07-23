// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
// Tests de precisión de la fórmula Haversine
// Verificamos contra distancias conocidas entre ciudades de Texas (en MILLAS)

jest.mock('../config/database', () => ({ queryOne: jest.fn() }));
jest.mock('../config/redis', () => ({
  redis:      { get: jest.fn(), setex: jest.fn() },
  REDIS_KEYS: { stateConfig: (c: string) => `state:config:${c}` },
  REDIS_TTL:  { STATE_CONFIG: 3600 },
}));
jest.mock('../config/env', () => ({ env: { GOOGLE_MAPS_API_KEY: 'test' } }));
jest.mock('../utils/logger', () => ({ logger: { warn: jest.fn() } }));
jest.mock('axios');

import axios from 'axios';
import { getDistanceAndDuration } from '../services/fareService';

// Fuerza el fallback Haversine en todos los tests de este módulo
beforeEach(() => {
  (axios.get as jest.Mock).mockRejectedValue(new Error('forced fallback'));
});

describe('Haversine fallback — distancias conocidas (en millas)', () => {
  // Tolerancia ±25%: Haversine × 1.2 es una aproximación de ruta, no distancia exacta
  const TOLERANCE = 0.25;

  function withinRange(actual: number, expected: number) {
    return Math.abs(actual - expected) / expected < TOLERANCE;
  }

  it('Houston → Dallas (~245 millas en ruta)', async () => {
    const { distanceMiles } = await getDistanceAndDuration(
      29.7604, -95.3698,   // Houston
      32.7767, -96.7970    // Dallas
    );
    // Haversine línea recta ~239 mi × 1.2 ≈ 287 mi — dentro del 25% de 245
    expect(withinRange(distanceMiles, 245)).toBe(true);
  });

  it('Houston → Austin (~155 millas en ruta)', async () => {
    const { distanceMiles } = await getDistanceAndDuration(
      29.7604, -95.3698,   // Houston
      30.2672, -97.7431    // Austin
    );
    expect(withinRange(distanceMiles, 155)).toBe(true);
  });

  it('San Antonio → El Paso (~540 millas en ruta)', async () => {
    const { distanceMiles } = await getDistanceAndDuration(
      29.4241, -98.4936,   // San Antonio
      31.7619, -106.4850   // El Paso
    );
    expect(withinRange(distanceMiles, 540)).toBe(true);
  });

  it('viaje muy corto dentro de una ciudad (< 3 millas)', async () => {
    const { distanceMiles, durationMinutes } = await getDistanceAndDuration(
      29.7604, -95.3698,
      29.7700, -95.3600    // ~1 milla aprox
    );
    expect(distanceMiles).toBeLessThan(3);
    expect(durationMinutes).toBeGreaterThan(0);
  });

  it('durationMinutes se calcula con velocidad media 35 mph', async () => {
    const { distanceMiles, durationMinutes } = await getDistanceAndDuration(
      29.7604, -95.3698,
      29.7604, -95.2592    // ~6 millas aprox en longitud
    );
    // Verificar que la duración es consistente con 35 mph
    const expectedMinutes = Math.ceil((distanceMiles / 35) * 60);
    expect(durationMinutes).toBe(expectedMinutes);
  });
});
