-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 028: Tarifas premium + fix columna price_per_mile
-- 1. Renombrar price_per_km → price_per_mile (el código usaba price_per_mile)
-- 2. Agregar family_multiplier (faltaba en schema original)
-- 3. Actualizar tarifas: 10-15% por encima de Uber/Lyft por estado
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────
-- 1. Renombrar columna (fix de naming mismatch con el código TypeScript)
-- ─────────────────────────────────────
ALTER TABLE us_states RENAME COLUMN price_per_km TO price_per_mile;

-- ─────────────────────────────────────
-- 2. Agregar family_multiplier si no existe
-- ─────────────────────────────────────
ALTER TABLE us_states
  ADD COLUMN IF NOT EXISTS family_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.50;

-- ─────────────────────────────────────
-- 3. Tarifas premium por estado
--    Base: 10-15% por encima de Uber/Lyft estándar en ese mercado
--    Surge: 1.5x en hora pico (12-2pm y 6-9pm)
-- ─────────────────────────────────────

-- CALIFORNIA — mercado premium, costo de vida alto
UPDATE us_states SET
  base_fare             = 2.25,
  price_per_mile        = 1.55,
  price_per_minute      = 0.30,
  min_fare              = 8.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  hourly_2h_price       = 70.00,
  hourly_4h_price       = 125.00,
  hourly_8h_price       = 210.00,
  wait_per_minute_rate  = 0.38,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'CA';

-- FLORIDA — mercado turístico + retirados, demanda alta
UPDATE us_states SET
  base_fare             = 1.90,
  price_per_mile        = 1.30,
  price_per_minute      = 0.26,
  min_fare              = 7.50,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  hourly_2h_price       = 75.00,
  hourly_4h_price       = 135.00,
  hourly_8h_price       = 220.00,
  wait_per_minute_rate  = 0.38,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'FL';

-- TEXAS — mercado de lanzamiento, tarifa competitiva premium
UPDATE us_states SET
  base_fare             = 1.75,
  price_per_mile        = 1.15,
  price_per_minute      = 0.24,
  min_fare              = 6.50,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  hourly_2h_price       = 75.00,
  hourly_4h_price       = 135.00,
  hourly_8h_price       = 220.00,
  wait_per_minute_rate  = 0.35,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'TX';

-- WYOMING — mercado de lanzamiento real, distancias largas, pocos conductores
UPDATE us_states SET
  base_fare             = 2.00,
  price_per_mile        = 1.40,
  price_per_minute      = 0.27,
  min_fare              = 8.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  hourly_2h_price       = 80.00,
  hourly_4h_price       = 145.00,
  hourly_8h_price       = 235.00,
  wait_per_minute_rate  = 0.40,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'WY';

-- ILLINOIS — Chicago, mercado urbano denso
UPDATE us_states SET
  base_fare             = 2.00,
  price_per_mile        = 1.30,
  price_per_minute      = 0.27,
  min_fare              = 7.50,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  hourly_2h_price       = 80.00,
  hourly_4h_price       = 145.00,
  hourly_8h_price       = 235.00,
  wait_per_minute_rate  = 0.38,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'IL';

-- NORTH CAROLINA — mercado en crecimiento, Charlotte + Raleigh
UPDATE us_states SET
  base_fare             = 1.70,
  price_per_mile        = 1.15,
  price_per_minute      = 0.23,
  min_fare              = 6.50,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  hourly_2h_price       = 75.00,
  hourly_4h_price       = 130.00,
  hourly_8h_price       = 210.00,
  wait_per_minute_rate  = 0.33,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'NC';

-- SOUTH CAROLINA — mercado secundario, Columbia + Charleston
UPDATE us_states SET
  base_fare             = 1.65,
  price_per_mile        = 1.10,
  price_per_minute      = 0.22,
  min_fare              = 6.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  hourly_2h_price       = 70.00,
  hourly_4h_price       = 120.00,
  hourly_8h_price       = 200.00,
  wait_per_minute_rate  = 0.33,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'SC';

-- VIRGINIA — zona DMV (DC-Maryland-Virginia), mercado corporativo
UPDATE us_states SET
  base_fare             = 1.95,
  price_per_mile        = 1.35,
  price_per_minute      = 0.27,
  min_fare              = 7.50,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  hourly_2h_price       = 75.00,
  hourly_4h_price       = 135.00,
  hourly_8h_price       = 220.00,
  wait_per_minute_rate  = 0.38,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'VA';

-- GEORGIA — Atlanta, hub de negocios del sureste
UPDATE us_states SET
  base_fare             = 1.75,
  price_per_mile        = 1.15,
  price_per_minute      = 0.24,
  min_fare              = 6.50,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  hourly_2h_price       = 72.00,
  hourly_4h_price       = 128.00,
  hourly_8h_price       = 210.00,
  wait_per_minute_rate  = 0.35,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'GA';

-- MASSACHUSETTS — Boston, mercado universitario y corporativo premium
UPDATE us_states SET
  base_fare             = 2.15,
  price_per_mile        = 1.45,
  price_per_minute      = 0.29,
  min_fare              = 8.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  hourly_2h_price       = 75.00,
  hourly_4h_price       = 135.00,
  hourly_8h_price       = 225.00,
  wait_per_minute_rate  = 0.40,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'MA';

-- OKLAHOMA — mercado emergente, Oklahoma City + Tulsa
UPDATE us_states SET
  base_fare             = 1.60,
  price_per_mile        = 1.05,
  price_per_minute      = 0.22,
  min_fare              = 6.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  hourly_2h_price       = 65.00,
  hourly_4h_price       = 115.00,
  hourly_8h_price       = 188.00,
  wait_per_minute_rate  = 0.33,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'OK';
