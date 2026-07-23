-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 029: Servicio Military + Tarifas para los 39 estados restantes
-- 1. Agregar columna military_multiplier a us_states
-- 2. Actualizar military_multiplier en los 11 estados ya existentes
-- 3. Configurar tarifas para los 39 estados restantes
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────
-- 1. Nueva columna military_multiplier
--    1.00 = mismo precio que standard (servicio dedicado, sin recargo)
-- ─────────────────────────────────────
ALTER TABLE us_states
  ADD COLUMN IF NOT EXISTS military_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00;

-- ─────────────────────────────────────
-- 2. Actualizar military_multiplier en estados ya configurados (028)
-- ─────────────────────────────────────
UPDATE us_states SET military_multiplier = 1.00
WHERE code IN ('CA','FL','TX','WY','IL','NC','SC','VA','GA','MA','OK');

-- ─────────────────────────────────────
-- 3. Los 39 estados restantes
--    Clasificados por nivel de mercado (Tier 1-4)
-- ─────────────────────────────────────

-- ═══════ TIER 1 — MERCADOS PREMIUM ═══════

-- NEW YORK — NYC: mercado más caro del país
UPDATE us_states SET
  base_fare             = 2.75,
  price_per_mile        = 1.75,
  price_per_minute      = 0.33,
  min_fare              = 10.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 95.00,
  hourly_4h_price       = 170.00,
  hourly_8h_price       = 280.00,
  wait_per_minute_rate  = 0.45,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'NY';

-- NEW JERSEY — metro NYC, pasajeros corporativos
UPDATE us_states SET
  base_fare             = 2.20,
  price_per_mile        = 1.45,
  price_per_minute      = 0.29,
  min_fare              = 8.50,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 85.00,
  hourly_4h_price       = 155.00,
  hourly_8h_price       = 250.00,
  wait_per_minute_rate  = 0.42,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'NJ';

-- HAWAII — costo de vida muy alto, turismo intenso
UPDATE us_states SET
  base_fare             = 2.50,
  price_per_mile        = 1.60,
  price_per_minute      = 0.32,
  min_fare              = 10.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 88.00,
  hourly_4h_price       = 160.00,
  hourly_8h_price       = 260.00,
  wait_per_minute_rate  = 0.45,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'HI';

-- ALASKA — remoto, costos logísticos altísimos
UPDATE us_states SET
  base_fare             = 2.75,
  price_per_mile        = 1.75,
  price_per_minute      = 0.35,
  min_fare              = 12.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 95.00,
  hourly_4h_price       = 175.00,
  hourly_8h_price       = 285.00,
  wait_per_minute_rate  = 0.50,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'AK';

-- CONNECTICUT — corredor NYC-Boston, ingreso per cápita alto
UPDATE us_states SET
  base_fare             = 2.10,
  price_per_mile        = 1.40,
  price_per_minute      = 0.28,
  min_fare              = 8.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 82.00,
  hourly_4h_price       = 148.00,
  hourly_8h_price       = 240.00,
  wait_per_minute_rate  = 0.40,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'CT';

-- WASHINGTON — Seattle, tech hub, costo de vida alto
UPDATE us_states SET
  base_fare             = 2.15,
  price_per_mile        = 1.42,
  price_per_minute      = 0.29,
  min_fare              = 8.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 82.00,
  hourly_4h_price       = 150.00,
  hourly_8h_price       = 245.00,
  wait_per_minute_rate  = 0.40,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'WA';

-- OREGON — Portland, Austin del noroeste
UPDATE us_states SET
  base_fare             = 2.00,
  price_per_mile        = 1.35,
  price_per_minute      = 0.27,
  min_fare              = 7.50,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 78.00,
  hourly_4h_price       = 140.00,
  hourly_8h_price       = 230.00,
  wait_per_minute_rate  = 0.38,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'OR';

-- COLORADO — Denver + Boulder, mercado joven y activo
UPDATE us_states SET
  base_fare             = 2.05,
  price_per_mile        = 1.38,
  price_per_minute      = 0.27,
  min_fare              = 7.50,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 80.00,
  hourly_4h_price       = 143.00,
  hourly_8h_price       = 232.00,
  wait_per_minute_rate  = 0.38,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'CO';

-- MARYLAND — zona DMV (DC-Maryland-Virginia), mercado corporativo
UPDATE us_states SET
  base_fare             = 2.05,
  price_per_mile        = 1.38,
  price_per_minute      = 0.28,
  min_fare              = 7.50,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 80.00,
  hourly_4h_price       = 143.00,
  hourly_8h_price       = 232.00,
  wait_per_minute_rate  = 0.39,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'MD';

-- RHODE ISLAND — estado pequeño, alto costo de vida
UPDATE us_states SET
  base_fare             = 1.98,
  price_per_mile        = 1.33,
  price_per_minute      = 0.27,
  min_fare              = 7.50,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 76.00,
  hourly_4h_price       = 137.00,
  hourly_8h_price       = 223.00,
  wait_per_minute_rate  = 0.38,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'RI';

-- ═══════ TIER 2 — MERCADOS SUPERIORES ═══════

-- MINNESOTA — Minneapolis/St. Paul, mercado corporativo fuerte
UPDATE us_states SET
  base_fare             = 1.92,
  price_per_mile        = 1.28,
  price_per_minute      = 0.26,
  min_fare              = 7.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 76.00,
  hourly_4h_price       = 136.00,
  hourly_8h_price       = 222.00,
  wait_per_minute_rate  = 0.37,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'MN';

-- PENNSYLVANIA — Philadelphia + Pittsburgh
UPDATE us_states SET
  base_fare             = 1.90,
  price_per_mile        = 1.27,
  price_per_minute      = 0.26,
  min_fare              = 7.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 75.00,
  hourly_4h_price       = 135.00,
  hourly_8h_price       = 220.00,
  wait_per_minute_rate  = 0.37,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'PA';

-- ARIZONA — Phoenix metro, crecimiento explosivo
UPDATE us_states SET
  base_fare             = 1.88,
  price_per_mile        = 1.25,
  price_per_minute      = 0.25,
  min_fare              = 7.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 73.00,
  hourly_4h_price       = 132.00,
  hourly_8h_price       = 215.00,
  wait_per_minute_rate  = 0.36,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'AZ';

-- NEVADA — Las Vegas + Reno, turismo y hospitalidad
UPDATE us_states SET
  base_fare             = 1.92,
  price_per_mile        = 1.28,
  price_per_minute      = 0.26,
  min_fare              = 7.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 76.00,
  hourly_4h_price       = 136.00,
  hourly_8h_price       = 222.00,
  wait_per_minute_rate  = 0.37,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'NV';

-- UTAH — Salt Lake City, crecimiento tech
UPDATE us_states SET
  base_fare             = 1.82,
  price_per_mile        = 1.22,
  price_per_minute      = 0.25,
  min_fare              = 7.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 72.00,
  hourly_4h_price       = 130.00,
  hourly_8h_price       = 212.00,
  wait_per_minute_rate  = 0.36,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'UT';

-- MICHIGAN — Detroit/Grand Rapids, industria automotriz
UPDATE us_states SET
  base_fare             = 1.78,
  price_per_mile        = 1.18,
  price_per_minute      = 0.24,
  min_fare              = 6.50,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 70.00,
  hourly_4h_price       = 127.00,
  hourly_8h_price       = 210.00,
  wait_per_minute_rate  = 0.35,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'MI';

-- OHIO — Columbus/Cleveland/Cincinnati, mercado diversificado
UPDATE us_states SET
  base_fare             = 1.78,
  price_per_mile        = 1.18,
  price_per_minute      = 0.24,
  min_fare              = 6.50,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 70.00,
  hourly_4h_price       = 127.00,
  hourly_8h_price       = 210.00,
  wait_per_minute_rate  = 0.35,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'OH';

-- WISCONSIN — Milwaukee/Madison
UPDATE us_states SET
  base_fare             = 1.78,
  price_per_mile        = 1.18,
  price_per_minute      = 0.24,
  min_fare              = 6.50,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 70.00,
  hourly_4h_price       = 127.00,
  hourly_8h_price       = 210.00,
  wait_per_minute_rate  = 0.35,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'WI';

-- VERMONT — Burlington, turismo de naturaleza, alto poder adquisitivo
UPDATE us_states SET
  base_fare             = 1.90,
  price_per_mile        = 1.27,
  price_per_minute      = 0.26,
  min_fare              = 7.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 74.00,
  hourly_4h_price       = 133.00,
  hourly_8h_price       = 217.00,
  wait_per_minute_rate  = 0.37,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'VT';

-- NEW HAMPSHIRE — sin impuesto estatal, mercado de alto ingreso
UPDATE us_states SET
  base_fare             = 1.88,
  price_per_mile        = 1.25,
  price_per_minute      = 0.25,
  min_fare              = 7.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 73.00,
  hourly_4h_price       = 132.00,
  hourly_8h_price       = 215.00,
  wait_per_minute_rate  = 0.36,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'NH';

-- MAINE — turismo costero, temporada alta intensa
UPDATE us_states SET
  base_fare             = 1.83,
  price_per_mile        = 1.22,
  price_per_minute      = 0.25,
  min_fare              = 7.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 72.00,
  hourly_4h_price       = 130.00,
  hourly_8h_price       = 212.00,
  wait_per_minute_rate  = 0.36,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'ME';

-- DELAWARE — Wilmington, hub financiero/corporativo
UPDATE us_states SET
  base_fare             = 1.88,
  price_per_mile        = 1.25,
  price_per_minute      = 0.25,
  min_fare              = 7.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 73.00,
  hourly_4h_price       = 132.00,
  hourly_8h_price       = 215.00,
  wait_per_minute_rate  = 0.36,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'DE';

-- MONTANA — Billings/Bozeman, grandes distancias, turismo parques
UPDATE us_states SET
  base_fare             = 1.82,
  price_per_mile        = 1.25,
  price_per_minute      = 0.25,
  min_fare              = 7.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 72.00,
  hourly_4h_price       = 132.00,
  hourly_8h_price       = 215.00,
  wait_per_minute_rate  = 0.37,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'MT';

-- ═══════ TIER 3 — MERCADOS MEDIOS ═══════

-- TENNESSEE — Nashville/Memphis, turismo + música + salud
UPDATE us_states SET
  base_fare             = 1.68,
  price_per_mile        = 1.12,
  price_per_minute      = 0.23,
  min_fare              = 6.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 67.00,
  hourly_4h_price       = 120.00,
  hourly_8h_price       = 198.00,
  wait_per_minute_rate  = 0.33,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'TN';

-- INDIANA — Indianapolis, manufactura + logística
UPDATE us_states SET
  base_fare             = 1.67,
  price_per_mile        = 1.10,
  price_per_minute      = 0.22,
  min_fare              = 6.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 66.00,
  hourly_4h_price       = 118.00,
  hourly_8h_price       = 195.00,
  wait_per_minute_rate  = 0.33,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'IN';

-- MISSOURI — St. Louis + Kansas City
UPDATE us_states SET
  base_fare             = 1.67,
  price_per_mile        = 1.10,
  price_per_minute      = 0.22,
  min_fare              = 6.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 66.00,
  hourly_4h_price       = 118.00,
  hourly_8h_price       = 195.00,
  wait_per_minute_rate  = 0.33,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'MO';

-- LOUISIANA — New Orleans/Baton Rouge, turismo + petroquímica
UPDATE us_states SET
  base_fare             = 1.68,
  price_per_mile        = 1.12,
  price_per_minute      = 0.23,
  min_fare              = 6.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 67.00,
  hourly_4h_price       = 120.00,
  hourly_8h_price       = 198.00,
  wait_per_minute_rate  = 0.33,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'LA';

-- NEW MEXICO — Albuquerque/Santa Fe, arte + turismo
UPDATE us_states SET
  base_fare             = 1.67,
  price_per_mile        = 1.10,
  price_per_minute      = 0.22,
  min_fare              = 6.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 66.00,
  hourly_4h_price       = 118.00,
  hourly_8h_price       = 195.00,
  wait_per_minute_rate  = 0.33,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'NM';

-- IDAHO — Boise, crecimiento acelerado de población
UPDATE us_states SET
  base_fare             = 1.67,
  price_per_mile        = 1.10,
  price_per_minute      = 0.22,
  min_fare              = 6.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 66.00,
  hourly_4h_price       = 118.00,
  hourly_8h_price       = 195.00,
  wait_per_minute_rate  = 0.33,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'ID';

-- NORTH DAKOTA — Bismarck/Fargo, economía petrolífera
UPDATE us_states SET
  base_fare             = 1.72,
  price_per_mile        = 1.15,
  price_per_minute      = 0.23,
  min_fare              = 6.50,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 68.00,
  hourly_4h_price       = 122.00,
  hourly_8h_price       = 200.00,
  wait_per_minute_rate  = 0.34,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'ND';

-- SOUTH DAKOTA — Sioux Falls, turismo Mount Rushmore
UPDATE us_states SET
  base_fare             = 1.67,
  price_per_mile        = 1.10,
  price_per_minute      = 0.22,
  min_fare              = 6.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 66.00,
  hourly_4h_price       = 118.00,
  hourly_8h_price       = 195.00,
  wait_per_minute_rate  = 0.33,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'SD';

-- NEBRASKA — Omaha/Lincoln
UPDATE us_states SET
  base_fare             = 1.64,
  price_per_mile        = 1.08,
  price_per_minute      = 0.22,
  min_fare              = 6.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 65.00,
  hourly_4h_price       = 116.00,
  hourly_8h_price       = 192.00,
  wait_per_minute_rate  = 0.33,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'NE';

-- IOWA — Des Moines/Cedar Rapids
UPDATE us_states SET
  base_fare             = 1.64,
  price_per_mile        = 1.08,
  price_per_minute      = 0.22,
  min_fare              = 6.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 65.00,
  hourly_4h_price       = 116.00,
  hourly_8h_price       = 192.00,
  wait_per_minute_rate  = 0.33,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'IA';

-- KANSAS — Wichita + zona metropolitana KC
UPDATE us_states SET
  base_fare             = 1.64,
  price_per_mile        = 1.08,
  price_per_minute      = 0.22,
  min_fare              = 6.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 65.00,
  hourly_4h_price       = 116.00,
  hourly_8h_price       = 192.00,
  wait_per_minute_rate  = 0.33,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'KS';

-- KENTUCKY — Louisville/Lexington, logística + turismo
UPDATE us_states SET
  base_fare             = 1.62,
  price_per_mile        = 1.07,
  price_per_minute      = 0.21,
  min_fare              = 6.00,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 64.00,
  hourly_4h_price       = 114.00,
  hourly_8h_price       = 190.00,
  wait_per_minute_rate  = 0.32,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'KY';

-- ═══════ TIER 4 — MERCADOS DE VALOR ═══════

-- ALABAMA — Birmingham/Huntsville (NASA, aeroespacial)
UPDATE us_states SET
  base_fare             = 1.57,
  price_per_mile        = 1.03,
  price_per_minute      = 0.21,
  min_fare              = 5.50,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 63.00,
  hourly_4h_price       = 112.00,
  hourly_8h_price       = 185.00,
  wait_per_minute_rate  = 0.32,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'AL';

-- ARKANSAS — Little Rock/Fayetteville (Walmart HQ)
UPDATE us_states SET
  base_fare             = 1.57,
  price_per_mile        = 1.02,
  price_per_minute      = 0.21,
  min_fare              = 5.50,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 62.00,
  hourly_4h_price       = 110.00,
  hourly_8h_price       = 183.00,
  wait_per_minute_rate  = 0.32,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'AR';

-- WEST VIRGINIA — Charleston/Huntington, mercado pequeño
UPDATE us_states SET
  base_fare             = 1.55,
  price_per_mile        = 1.00,
  price_per_minute      = 0.20,
  min_fare              = 5.50,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 61.00,
  hourly_4h_price       = 108.00,
  hourly_8h_price       = 180.00,
  wait_per_minute_rate  = 0.31,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'WV';

-- MISSISSIPPI — Jackson/Biloxi, mercado más económico del país
UPDATE us_states SET
  base_fare             = 1.52,
  price_per_mile        = 0.99,
  price_per_minute      = 0.20,
  min_fare              = 5.50,
  surge_multiplier      = 1.50,
  family_multiplier     = 1.50,
  executive_multiplier  = 1.80,
  accessible_multiplier = 1.40,
  military_multiplier   = 1.00,
  hourly_2h_price       = 60.00,
  hourly_4h_price       = 106.00,
  hourly_8h_price       = 178.00,
  wait_per_minute_rate  = 0.30,
  wait_and_return_enabled = true,
  hourly_ride_enabled   = true
WHERE code = 'MS';
