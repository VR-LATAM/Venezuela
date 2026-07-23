-- ═══════════════════════════════════════════════════════════════
-- 024_performance_indexes.sql
-- Índices compuestos y parciales para queries de alto tráfico
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1. CONDUCTORES DISPONIBLES — PostGIS partial GIST index
--
--    Usado por: driverRepository.findNearby() — se ejecuta en cada
--    solicitud de viaje, potencialmente con radio 10→20→40→80→150km.
--    Los índices separados idx_drivers_status e idx_drivers_is_online
--    obligan a PostgreSQL a hacer bitmap AND en memoria.
--    Este índice parcial cubre sólo las filas relevantes (~5% de la tabla)
--    y acelera el ST_DWithin sin necesidad de filtros adicionales.
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_drivers_available_gist
  ON drivers USING GIST (current_location)
  WHERE is_online = true AND status = 'active';

-- ─────────────────────────────────────────────────────────────
-- 2. CERTIFICACIONES DE SERVICIO — lookup en subquery de findNearby
--
--    El subquery EXISTS en findNearby filtra por (driver_id, service_type, is_active).
--    El índice existente idx_service_cert_active cubre (driver_id, is_active)
--    pero no service_type — agrega un scan extra por cada conductor candidato.
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_service_cert_lookup
  ON driver_service_certifications (driver_id, service_type)
  WHERE is_active = true;

-- ─────────────────────────────────────────────────────────────
-- 3. VIAJE ACTIVO DEL PASAJERO — partial index
--
--    Usado por: rideRepository.findActiveByPassenger() — se ejecuta en
--    cada solicitud de viaje nueva para verificar que el pasajero no
--    tiene uno en curso. La tabla rides crece indefinidamente;
--    el índice parcial excluye los estados terminales (~90% de las filas).
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rides_active_passenger
  ON rides (passenger_id, created_at DESC)
  WHERE status NOT IN ('completed', 'cancelled_passenger', 'cancelled_driver', 'no_driver_found');

-- ─────────────────────────────────────────────────────────────
-- 4. VIAJE ACTIVO DEL CONDUCTOR — partial index
--
--    Usado por: rideRepository.findActiveByDriver() — se ejecuta al
--    cargar el home del conductor para mostrar el viaje en curso.
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rides_active_driver
  ON rides (driver_id, created_at DESC)
  WHERE status IN ('driver_assigned', 'driver_arriving', 'driver_arrived', 'in_progress');

-- ─────────────────────────────────────────────────────────────
-- 5. COMISIÓN PROGRESIVA DEL CONDUCTOR — partial index compuesto
--
--    Usado por: getDriverCommissionInfo() — se ejecuta en CADA viaje
--    completado y también al cargar el perfil del conductor.
--    Cuenta viajes completados del año en curso para determinar
--    si el conductor está en tier Standard (15%), Silver (14%) o Elite (13%).
--    Sin este índice: full scan de rides filtrado en memoria.
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rides_completed_driver
  ON rides (driver_id, completed_at DESC)
  WHERE status = 'completed';

-- ─────────────────────────────────────────────────────────────
-- 6. DESCUENTO DE LEALTAD DEL PASAJERO — partial index compuesto
--
--    Usado por: completeRide() — se ejecuta en cada viaje completado
--    para verificar si el pasajero califica al 10% de descuento
--    (15 viajes esta semana ó 50 este mes).
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rides_completed_passenger
  ON rides (passenger_id, completed_at DESC)
  WHERE status = 'completed';

-- ─────────────────────────────────────────────────────────────
-- 7. REPORTE DE IMPUESTOS 1099 — índice en completed_at
--
--    Usado por: driverController.getTaxReport() — filtra por
--    EXTRACT(YEAR FROM completed_at) y agrupa por mes.
--    El índice idx_rides_completed_driver de arriba también cubre
--    este caso, pero este índice de completed_at standalone ayuda
--    a queries del admin que no filtran por driver_id.
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rides_completed_at
  ON rides (completed_at DESC)
  WHERE status = 'completed' AND completed_at IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 8. BÚSQUEDA DE VIAJES EN ESTADO 'searching' — para asignación
--
--    Usado por: rideRepository.assignDriver() y en la búsqueda asíncrona
--    donde se verifica que el viaje siga en 'searching'.
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rides_searching
  ON rides (created_at DESC)
  WHERE status = 'searching';

-- ─────────────────────────────────────────────────────────────
-- 9. VIAJES POR ESTADO para el dashboard admin
--
--    Usado por: adminController — lista rides con filtros de status.
--    Compuesto (status, created_at) permite cubrir ORDER BY created_at
--    sin sort extra cuando se filtra por un estado.
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rides_status_created
  ON rides (status, created_at DESC);
