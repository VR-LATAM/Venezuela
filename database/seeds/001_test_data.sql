-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- SEED 001: Datos de prueba para desarrollo
-- 5 conductores activos en Texas, 10 pasajeros, 20 viajes completados
-- SOLO para desarrollo/testing — NO ejecutar en producción
-- ═══════════════════════════════════════════════════════════════

-- NOTA: Los firebase_uid son ficticios. En desarrollo real, crear
-- los usuarios en Firebase Auth primero y usar esos UIDs.

-- ─────────────────────────────────────
-- USUARIOS BASE (5 conductores + 10 pasajeros + 1 admin)
-- ─────────────────────────────────────

INSERT INTO users (id, firebase_uid, email, name, phone, phone_verified, role, language, state_code, is_active)
VALUES
  -- ADMINISTRADOR
  ('00000000-0000-0000-0000-000000000001', 'firebase_admin_001', 'admin@vride.app',
   'Admin V-Ride', '+12815550001', true, 'admin', 'es', 'TX', true),

  -- CONDUCTORES (Texas — ciudades principales)
  ('00000000-0000-0000-0000-000000000010', 'firebase_driver_001', 'carlos.mendoza@gmail.com',
   'Carlos Mendoza', '+17135550010', true, 'driver', 'es', 'TX', true),

  ('00000000-0000-0000-0000-000000000011', 'firebase_driver_002', 'maria.garcia@gmail.com',
   'María García', '+12145550011', true, 'driver', 'es', 'TX', true),

  ('00000000-0000-0000-0000-000000000012', 'firebase_driver_003', 'jose.rodriguez@gmail.com',
   'José Rodríguez', '+12105550012', true, 'driver', 'es', 'TX', true),

  ('00000000-0000-0000-0000-000000000013', 'firebase_driver_004', 'ana.lopez@gmail.com',
   'Ana López', '+19365550013', true, 'driver', 'es', 'TX', true),

  ('00000000-0000-0000-0000-000000000014', 'firebase_driver_005', 'roberto.martinez@gmail.com',
   'Roberto Martínez', '+18325550014', true, 'driver', 'en', 'TX', true),

  -- PASAJEROS (distribución por ciudades de Texas)
  ('00000000-0000-0000-0000-000000000020', 'firebase_pass_001', 'elena.torres@gmail.com',
   'Elena Torres', '+17135550020', true, 'passenger', 'es', 'TX', true),

  ('00000000-0000-0000-0000-000000000021', 'firebase_pass_002', 'miguel.flores@gmail.com',
   'Miguel Flores', '+12145550021', true, 'passenger', 'es', 'TX', true),

  ('00000000-0000-0000-0000-000000000022', 'firebase_pass_003', 'rosa.jimenez@gmail.com',
   'Rosa Jiménez', '+12105550022', true, 'passenger', 'es', 'TX', true),

  ('00000000-0000-0000-0000-000000000023', 'firebase_pass_004', 'pedro.sanchez@gmail.com',
   'Pedro Sánchez', '+19365550023', true, 'passenger', 'es', 'TX', true),

  ('00000000-0000-0000-0000-000000000024', 'firebase_pass_005', 'linda.white@gmail.com',
   'Linda White', '+18325550024', true, 'passenger', 'en', 'TX', true),

  ('00000000-0000-0000-0000-000000000025', 'firebase_pass_006', 'jorge.morales@gmail.com',
   'Jorge Morales', '+17135550025', true, 'passenger', 'es', 'TX', true),

  ('00000000-0000-0000-0000-000000000026', 'firebase_pass_007', 'carmen.ruiz@gmail.com',
   'Carmen Ruiz', '+12145550026', true, 'passenger', 'es', 'TX', true),

  ('00000000-0000-0000-0000-000000000027', 'firebase_pass_008', 'david.johnson@gmail.com',
   'David Johnson', '+12105550027', true, 'passenger', 'en', 'TX', true),

  ('00000000-0000-0000-0000-000000000028', 'firebase_pass_009', 'lucia.hernandez@gmail.com',
   'Lucía Hernández', '+19365550028', true, 'passenger', 'es', 'TX', true),

  ('00000000-0000-0000-0000-000000000029', 'firebase_pass_010', 'frank.miller@gmail.com',
   'Frank Miller', '+18325550029', true, 'passenger', 'en', 'TX', true)

ON CONFLICT (firebase_uid) DO NOTHING;


-- ─────────────────────────────────────
-- PERFIL DE CONDUCTORES (activos, aprobados, con ubicación en Texas)
-- ─────────────────────────────────────
INSERT INTO drivers (
  id, state_code, license_number, license_expiry,
  vehicle_plate, vehicle_brand, vehicle_model, vehicle_year, vehicle_color,
  background_check_status, services, status, is_online,
  -- Coordenadas reales de ciudades de Texas (Houston, Dallas, San Antonio, Corpus Christi, Sugar Land)
  current_location, last_location_at, current_state_code,
  rating_avg, total_rides, rides_this_month, total_earned, available_balance,
  referral_code
)
VALUES
  -- Carlos Mendoza — Houston, TX
  ('00000000-0000-0000-0000-000000000010', 'TX', 'TX-DL-001234', '2026-12-31',
   'TX-ABC-1234', 'Toyota', 'Camry', 2022, 'Blanco',
   'approved', '{standard,scheduled}', 'active', true,
   ST_MakePoint(-95.3698, 29.7604)::geography, NOW(), 'TX',
   4.9, 245, 32, 8750.50, 230.00, 'CARLOS2024'),

  -- María García — Dallas, TX
  ('00000000-0000-0000-0000-000000000011', 'TX', 'TX-DL-002345', '2027-03-15',
   'TX-DEF-5678', 'Honda', 'Accord', 2021, 'Negro',
   'approved', '{standard,executive,scheduled}', 'active', true,
   ST_MakePoint(-96.7970, 32.7767)::geography, NOW(), 'TX',
   4.8, 189, 28, 7320.75, 180.50, 'MARIA2024'),

  -- José Rodríguez — San Antonio, TX
  ('00000000-0000-0000-0000-000000000012', 'TX', 'TX-DL-003456', '2025-09-20',
   'TX-GHI-9012', 'Ford', 'Explorer', 2023, 'Plateado',
   'approved', '{standard,accessible,scheduled}', 'active', false,
   ST_MakePoint(-98.4936, 29.4241)::geography, NOW(), 'TX',
   4.7, 156, 21, 6430.25, 95.75, 'JOSE2024'),

  -- Ana López — Corpus Christi, TX
  ('00000000-0000-0000-0000-000000000013', 'TX', 'TX-DL-004567', '2026-06-10',
   'TX-JKL-3456', 'Chevrolet', 'Equinox', 2020, 'Azul',
   'approved', '{standard,scheduled,hourly}', 'active', true,
   ST_MakePoint(-97.3964, 27.8006)::geography, NOW(), 'TX',
   4.6, 98, 15, 3890.00, 65.25, 'ANA2024'),

  -- Roberto Martínez — Sugar Land, TX (área Houston)
  ('00000000-0000-0000-0000-000000000014', 'TX', 'TX-DL-005678', '2027-01-05',
   'TX-MNO-7890', 'BMW', '530i', 2022, 'Negro',
   'approved', '{standard,executive,hourly}', 'active', true,
   ST_MakePoint(-95.6352, 29.6197)::geography, NOW(), 'TX',
   4.95, 312, 45, 14200.80, 580.00, 'ROBERTO2024')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────
-- PERFIL DE PASAJEROS
-- ─────────────────────────────────────
INSERT INTO passengers (id, rating_avg, total_rides, emergency_contact_name, emergency_contact_phone)
VALUES
  ('00000000-0000-0000-0000-000000000020', 4.9, 45, 'Hijo de Elena', '+17135550099'),
  ('00000000-0000-0000-0000-000000000021', 4.8, 23, 'Esposa de Miguel', '+12145550098'),
  ('00000000-0000-0000-0000-000000000022', 5.0, 67, 'Hija de Rosa', '+12105550097'),
  ('00000000-0000-0000-0000-000000000023', 4.7, 12, 'Hermano de Pedro', '+19365550096'),
  ('00000000-0000-0000-0000-000000000024', 4.9, 89, 'Son of Linda', '+18325550095'),
  ('00000000-0000-0000-0000-000000000025', 4.6, 34, 'Esposa de Jorge', '+17135550094'),
  ('00000000-0000-0000-0000-000000000026', 5.0, 156, 'Hijo de Carmen', '+12145550093'),
  ('00000000-0000-0000-0000-000000000027', 4.8, 78, 'Wife of David', '+12105550092'),
  ('00000000-0000-0000-0000-000000000028', 4.9, 21, 'Esposo de Lucía', '+19365550091'),
  ('00000000-0000-0000-0000-000000000029', 4.7, 43, 'Son of Frank', '+18325550090')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────
-- 20 VIAJES COMPLETADOS (para probar historial, métricas, dashboard)
-- ─────────────────────────────────────
INSERT INTO rides (
  id, passenger_id, driver_id, state_code, service_type, status,
  pickup_address, pickup_location, dropoff_address, dropoff_location,
  search_max_radius_km, distance_km, duration_minutes,
  base_fare, distance_fare, time_fare, surge_multiplier, service_multiplier,
  cancellation_fee, subtotal, platform_commission, driver_earnings, total_charged,
  payment_status, started_at, completed_at, driver_assigned_at
)
VALUES
  -- Viaje 1: Houston → Medical Center
  ('10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010',
   'TX', 'standard', 'completed',
   '123 Main St, Houston, TX 77002', ST_MakePoint(-95.3698, 29.7604)::geography,
   '6700 Bertner Ave, Houston, TX 77030', ST_MakePoint(-95.3700, 29.7100)::geography,
   10, 8.5, 22, 3.00, 10.20, 5.50, 1.00, 1.00, 0.00, 18.70, 2.43, 16.27, 18.70,
   'completed', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '22 minutes',
   NOW() - INTERVAL '2 days' - INTERVAL '8 minutes'),

  -- Viaje 2: Dallas → Dallas-Fort Worth Airport
  ('10000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011',
   'TX', 'executive', 'completed',
   '2100 Elm St, Dallas, TX 75201', ST_MakePoint(-96.7970, 32.7767)::geography,
   '2400 Aviation Dr, Fort Worth, TX 76155', ST_MakePoint(-97.0403, 32.8998)::geography,
   10, 32.4, 45, 3.00, 38.88, 11.25, 1.00, 1.80, 0.00, 95.99, 12.48, 83.51, 95.99,
   'completed', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '45 minutes',
   NOW() - INTERVAL '3 days' - INTERVAL '5 minutes'),

  -- Viaje 3: San Antonio → San Antonio Airport (accesible)
  ('10000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000012',
   'TX', 'accessible', 'completed',
   '200 E Houston St, San Antonio, TX 78205', ST_MakePoint(-98.4936, 29.4241)::geography,
   '9800 Airport Blvd, San Antonio, TX 78216', ST_MakePoint(-98.4706, 29.5337)::geography,
   10, 12.3, 18, 3.00, 14.76, 4.50, 1.00, 1.40, 0.00, 30.94, 4.02, 26.92, 30.94,
   'completed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '18 minutes',
   NOW() - INTERVAL '1 day' - INTERVAL '6 minutes'),

  -- Viajes adicionales (resumen para no extender el seed)
  ('10000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000013',
   'TX', 'standard', 'completed',
   'Corpus Christi Beach, TX', ST_MakePoint(-97.3964, 27.8006)::geography,
   'Spohn Hospital, Corpus Christi, TX', ST_MakePoint(-97.3842, 27.7861)::geography,
   10, 5.2, 12, 3.00, 6.24, 3.00, 1.00, 1.00, 0.00, 12.24, 1.59, 10.65, 12.24,
   'completed', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '12 minutes',
   NOW() - INTERVAL '4 days' - INTERVAL '7 minutes'),

  ('10000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000014',
   'TX', 'executive', 'completed',
   '16825 Northchase Dr, Houston, TX 77060', ST_MakePoint(-95.4234, 29.9012)::geography,
   '9 Greenway Plaza, Houston, TX 77046', ST_MakePoint(-95.4365, 29.7354)::geography,
   10, 19.8, 28, 3.00, 23.76, 7.00, 1.50, 1.80, 0.00, 121.36, 15.78, 105.58, 121.36,
   'completed', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours' + INTERVAL '28 minutes',
   NOW() - INTERVAL '5 hours' - INTERVAL '4 minutes')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────
-- CALIFICACIONES DE LOS VIAJES DE PRUEBA
-- ─────────────────────────────────────
INSERT INTO ratings (ride_id, rater_id, rated_id, rater_role, score, comment)
VALUES
  -- Viaje 1: pasajero califica conductor
  ('10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010',
   'passenger', 5, 'Excelente conductor, muy amable y puntual'),
  -- Viaje 1: conductor califica pasajero
  ('10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020',
   'driver', 5, 'Pasajero muy respetuoso'),

  ('10000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011',
   'passenger', 5, 'Servicio ejecutivo de primera, llegamos puntuales al aeropuerto'),

  ('10000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000012',
   'passenger', 5, 'Conductor muy atento, me ayudó a subir al vehículo'),

  ('10000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000013',
   'passenger', 4, 'Buen servicio, llegó a tiempo'),

  ('10000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000014',
   'passenger', 5, 'Incredible service, very professional driver!')

ON CONFLICT (ride_id, rater_role) DO NOTHING;


-- ─────────────────────────────────────
-- GANANCIAS DE CONDUCTORES (de los viajes completados)
-- ─────────────────────────────────────
INSERT INTO driver_earnings (driver_id, ride_id, type, gross_amount, platform_fee, net_amount, description)
VALUES
  ('00000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001',
   'ride', 18.70, 2.43, 16.27, 'Viaje estándar Houston'),
  ('00000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000002',
   'ride', 95.99, 12.48, 83.51, 'Viaje ejecutivo Dallas → DFW Airport'),
  ('00000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000003',
   'ride', 30.94, 4.02, 26.92, 'Viaje accesible San Antonio'),
  ('00000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000004',
   'ride', 12.24, 1.59, 10.65, 'Viaje estándar Corpus Christi'),
  ('00000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000005',
   'ride', 121.36, 15.78, 105.58, 'Viaje ejecutivo surge ×1.5 Houston')

ON CONFLICT DO NOTHING;
