/* price_per_mile en BD ahora almacena precio por KM (Venezuela usa km, no millas) */
UPDATE us_states SET
  base_fare             = 1.00,
  price_per_mile        = 0.92,
  price_per_minute      = 0.05,
  min_fare              = 1.00,
  motorcycle_multiplier = 0.55
WHERE is_active = true;
