/* Migración VE-008 — Conductores de prueba para servicios de delivery */

/* Conductor 4 — Mensajero en moto (Encomienda) */
INSERT INTO users (firebase_uid, email, name, phone, phone_verified, role, language, is_active)
VALUES ('dev_drv_ve_004', 'conductor4@vride.test', 'Miguel Suárez Peña', '+584261234004', true, 'driver', 'es', true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO drivers (
  id, license_number, license_expiry,
  vehicle_plate, vehicle_brand, vehicle_model, vehicle_year, vehicle_color,
  background_check_status, services, status, is_online,
  rating_avg, total_rides, total_earned, available_balance, referral_code
)
SELECT id, 'VE-LIC-004', '2027-12-31',
  'JKL-001', 'Honda', 'CB190R', 2022, 'Rojo',
  'approved', ARRAY['motorcycle'], 'active', false,
  5.00, 0, 0.00, 0.00, 'MIGUEL2025'
FROM users WHERE email = 'conductor4@vride.test'
ON CONFLICT (id) DO UPDATE SET
  services      = ARRAY['motorcycle'],
  vehicle_plate = 'JKL-001',
  vehicle_brand = 'Honda',
  vehicle_model = 'CB190R',
  vehicle_year  = 2022,
  vehicle_color = 'Rojo';

/* Conductor 5 — Sedán mensajería (Encomienda) */
INSERT INTO users (firebase_uid, email, name, phone, phone_verified, role, language, is_active)
VALUES ('dev_drv_ve_005', 'conductor5@vride.test', 'Patricia Sosa López', '+584261234005', true, 'driver', 'es', true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO drivers (
  id, license_number, license_expiry,
  vehicle_plate, vehicle_brand, vehicle_model, vehicle_year, vehicle_color,
  background_check_status, services, status, is_online,
  rating_avg, total_rides, total_earned, available_balance, referral_code
)
SELECT id, 'VE-LIC-005', '2027-12-31',
  'MNO-002', 'Toyota', 'Corolla', 2023, 'Plata',
  'approved', ARRAY['sedan'], 'active', false,
  5.00, 0, 0.00, 0.00, 'PATRICIA2025'
FROM users WHERE email = 'conductor5@vride.test'
ON CONFLICT (id) DO UPDATE SET
  services      = ARRAY['sedan'],
  vehicle_plate = 'MNO-002',
  vehicle_brand = 'Toyota',
  vehicle_model = 'Corolla',
  vehicle_year  = 2023,
  vehicle_color = 'Plata';

/* Conductor 6 — Pick-Up carga mediana */
INSERT INTO users (firebase_uid, email, name, phone, phone_verified, role, language, is_active)
VALUES ('dev_drv_ve_006', 'conductor6@vride.test', 'Ricardo Torres Vega', '+584261234006', true, 'driver', 'es', true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO drivers (
  id, license_number, license_expiry,
  vehicle_plate, vehicle_brand, vehicle_model, vehicle_year, vehicle_color,
  background_check_status, services, status, is_online,
  rating_avg, total_rides, total_earned, available_balance, referral_code
)
SELECT id, 'VE-LIC-006', '2027-12-31',
  'PQR-003', 'Ford', 'F-150', 2021, 'Negro',
  'approved', ARRAY['pickup'], 'active', false,
  5.00, 0, 0.00, 0.00, 'RICARDO2025'
FROM users WHERE email = 'conductor6@vride.test'
ON CONFLICT (id) DO UPDATE SET
  services      = ARRAY['pickup'],
  vehicle_plate = 'PQR-003',
  vehicle_brand = 'Ford',
  vehicle_model = 'F-150',
  vehicle_year  = 2021,
  vehicle_color = 'Negro';

/* Conductor 7 — Plataforma materiales de construcción */
INSERT INTO users (firebase_uid, email, name, phone, phone_verified, role, language, is_active)
VALUES ('dev_drv_ve_007', 'conductor7@vride.test', 'Carlos Díaz Mora', '+584261234007', true, 'driver', 'es', true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO drivers (
  id, license_number, license_expiry,
  vehicle_plate, vehicle_brand, vehicle_model, vehicle_year, vehicle_color,
  background_check_status, services, status, is_online,
  rating_avg, total_rides, total_earned, available_balance, referral_code
)
SELECT id, 'VE-LIC-007', '2027-12-31',
  'STU-004', 'Chevrolet', 'NPR 400', 2020, 'Blanco',
  'approved', ARRAY['plataforma'], 'active', false,
  5.00, 0, 0.00, 0.00, 'CARLOS2025'
FROM users WHERE email = 'conductor7@vride.test'
ON CONFLICT (id) DO UPDATE SET
  services      = ARRAY['plataforma'],
  vehicle_plate = 'STU-004',
  vehicle_brand = 'Chevrolet',
  vehicle_model = 'NPR 400',
  vehicle_year  = 2020,
  vehicle_color = 'Blanco';
