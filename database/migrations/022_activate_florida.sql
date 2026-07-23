-- ============================================================
-- Migración 022 — Activar Florida con tarifas ajustadas al mercado
-- Florida: costo de vida ~8% mayor que Texas, mercado competitivo
-- Ciudades principales: Miami, Orlando, Tampa, Jacksonville
-- ============================================================

UPDATE us_states SET
  is_active                   = true,
  launched_at                 = NOW(),

  -- Tarifas estándar (ligeramente superiores a TX por costo de vida)
  base_fare                   = 3.25,
  price_per_km                = 1.35,
  price_per_minute            = 0.28,
  min_fare                    = 7.00,
  surge_multiplier            = 1.00,
  platform_commission_percent = 15.00,

  -- Multiplicadores de servicio (mismos que TX)
  executive_multiplier        = 1.80,
  accessible_multiplier       = 1.40,

  -- Precios por hora (ajustados al mercado FL)
  hourly_2h_price             = 50.00,
  hourly_4h_price             = 90.00,
  hourly_8h_price             = 155.00,

  timezone                    = 'America/New_York'

WHERE code = 'FL';
