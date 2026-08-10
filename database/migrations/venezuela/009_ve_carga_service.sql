/* Migración VE-009 — Servicio Carga con negociación de precio */

/* 1. Ampliar CHECK de service_type */
ALTER TABLE rides DROP CONSTRAINT IF EXISTS rides_service_type_check;
ALTER TABLE rides ADD CONSTRAINT rides_service_type_check
  CHECK (service_type IN (
    'standard','family','executive','accessible',
    'scheduled','hourly','wait_and_return',
    'motorcycle','sedan','suv',
    'encomienda','pickup','plataforma','carga'
  ));

/* 2. Ampliar CHECK de status para incluir price_negotiation */
ALTER TABLE rides DROP CONSTRAINT IF EXISTS rides_status_check;
ALTER TABLE rides ADD CONSTRAINT rides_status_check
  CHECK (status IN (
    'searching','driver_assigned','driver_arriving','driver_arrived',
    'in_progress','completed','cancelled_passenger','cancelled_driver',
    'no_driver_found','price_negotiation'
  ));

/* 3. Nuevas columnas en rides */
ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS delivery_vehicle   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS offered_price      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS counter_price      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS counter_reason     VARCHAR(500),
  ADD COLUMN IF NOT EXISTS counter_driver_id  UUID REFERENCES users(id);

/* 4. Tipos de vehículo para carga */
INSERT INTO ve_vehicle_types (code, name, weekly_fee_usd)
VALUES
  ('350', 'F-350 / Platabanda', 45.00),
  ('npr', 'NPR 400 / Superior',  55.00)
ON CONFLICT (code) DO NOTHING;

/* 5. Conductor 8 — F-350 */
INSERT INTO users (firebase_uid, email, name, phone, phone_verified, role, language, is_active)
VALUES ('dev_drv_ve_008', 'conductor8@vride.test', 'Andrés Castillo Vera', '+584261234008', true, 'driver', 'es', true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO drivers (
  id, license_number, license_expiry,
  vehicle_plate, vehicle_brand, vehicle_model, vehicle_year, vehicle_color,
  background_check_status, services, status, is_online,
  rating_avg, total_rides, total_earned, available_balance, referral_code
)
SELECT id, 'VE-LIC-008', '2027-12-31',
  'MNO-008', 'Ford', 'F-350', 2021, 'Blanco',
  'approved', ARRAY['350'], 'active', false,
  5.00, 0, 0.00, 0.00, 'ANDRES2025'
FROM users WHERE email = 'conductor8@vride.test'
ON CONFLICT (id) DO UPDATE SET
  services      = ARRAY['350'],
  vehicle_plate = 'MNO-008',
  vehicle_brand = 'Ford',
  vehicle_model = 'F-350',
  vehicle_year  = 2021,
  vehicle_color = 'Blanco';

/* 6. Conductor 9 — NPR 400 */
INSERT INTO users (firebase_uid, email, name, phone, phone_verified, role, language, is_active)
VALUES ('dev_drv_ve_009', 'conductor9@vride.test', 'José Mendoza Ríos', '+584261234009', true, 'driver', 'es', true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO drivers (
  id, license_number, license_expiry,
  vehicle_plate, vehicle_brand, vehicle_model, vehicle_year, vehicle_color,
  background_check_status, services, status, is_online,
  rating_avg, total_rides, total_earned, available_balance, referral_code
)
SELECT id, 'VE-LIC-009', '2027-12-31',
  'PQR-009', 'Chevrolet', 'NPR 400', 2020, 'Amarillo',
  'approved', ARRAY['npr'], 'active', false,
  5.00, 0, 0.00, 0.00, 'JOSE2025'
FROM users WHERE email = 'conductor9@vride.test'
ON CONFLICT (id) DO UPDATE SET
  services      = ARRAY['npr'],
  vehicle_plate = 'PQR-009',
  vehicle_brand = 'Chevrolet',
  vehicle_model = 'NPR 400',
  vehicle_year  = 2020,
  vehicle_color = 'Amarillo';

/* 7. Certificaciones de carga para conductores 8 y 9 */
INSERT INTO driver_service_certifications (driver_id, service_type, certified_at, certified_by)
SELECT d.id, 'carga', NOW(), 'system'
FROM drivers d
JOIN users u ON u.id = d.id
WHERE u.email IN ('conductor8@vride.test', 'conductor9@vride.test')
ON CONFLICT DO NOTHING;
