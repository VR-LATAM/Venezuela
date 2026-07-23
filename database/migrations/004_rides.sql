-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 004: Tabla de viajes — núcleo del negocio
-- Registra todo el ciclo de vida de cada viaje
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rides (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id UUID NOT NULL REFERENCES passengers(id),
  driver_id    UUID REFERENCES drivers(id),
  state_code   CHAR(2) REFERENCES us_states(code),  -- estado donde ocurrió el viaje

  service_type VARCHAR(20) NOT NULL
    CHECK (service_type IN ('standard', 'executive', 'accessible', 'scheduled', 'hourly')),

  -- Estados del ciclo de vida del viaje
  status VARCHAR(30) NOT NULL DEFAULT 'searching'
    CHECK (status IN (
      'searching',            -- Buscando conductor (radio dinámico activo)
      'driver_assigned',      -- Conductor asignado, aún no en camino
      'driver_arriving',      -- Conductor en camino al punto de recogida
      'driver_arrived',       -- Conductor llegó al punto de recogida
      'in_progress',          -- Pasajero a bordo, viaje en curso
      'completed',            -- Viaje finalizado con éxito
      'cancelled_passenger',  -- Cancelado por el pasajero
      'cancelled_driver',     -- Cancelado por el conductor
      'no_driver_found'       -- Ningún conductor disponible tras búsqueda máxima
    )),

  -- Ubicaciones almacenadas en texto Y en geometría PostGIS
  pickup_address   TEXT NOT NULL,
  pickup_location  GEOGRAPHY(POINT, 4326) NOT NULL,
  dropoff_address  TEXT NOT NULL,
  dropoff_location GEOGRAPHY(POINT, 4326) NOT NULL,

  -- Radio máximo alcanzado durante la búsqueda de conductor (km)
  -- Útil para analytics de cobertura por zona
  search_max_radius_km INTEGER DEFAULT 0,

  -- Tiempos del ciclo de vida completo
  scheduled_at              TIMESTAMP,   -- Solo para viajes programados
  driver_assigned_at        TIMESTAMP,
  driver_arrived_pickup_at  TIMESTAMP,
  started_at                TIMESTAMP,
  completed_at              TIMESTAMP,
  cancelled_at              TIMESTAMP,
  cancellation_reason       TEXT,

  -- Métricas del viaje
  distance_km       DECIMAL(8,3),
  duration_minutes  INTEGER,

  -- Cálculo de precio (desglosado para transparencia total)
  base_fare           DECIMAL(8,2),   -- Tarifa base de arranque
  distance_fare       DECIMAL(8,2),   -- Cargo por km recorrido
  time_fare           DECIMAL(8,2),   -- Cargo por minuto de viaje
  surge_multiplier    DECIMAL(3,2) NOT NULL DEFAULT 1.00,   -- Multiplicador horas pico
  service_multiplier  DECIMAL(3,2) NOT NULL DEFAULT 1.00,   -- Multiplicador por tipo de servicio
  cancellation_fee    DECIMAL(6,2)  NOT NULL DEFAULT 0.00,  -- Cargo por cancelación tardía
  subtotal            DECIMAL(10,2),
  platform_commission DECIMAL(10,2),  -- 13% que retiene V-Ride
  driver_earnings     DECIMAL(10,2),  -- 87% que recibe el conductor
  total_charged       DECIMAL(10,2),  -- Total cobrado al pasajero

  -- Pago con Stripe
  stripe_payment_intent_id VARCHAR(200),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),

  -- Ruta en polyline de Google Maps (para mostrar en historial)
  route_polyline TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para consultas frecuentes del backend y el dashboard
CREATE INDEX idx_rides_status      ON rides (status);
CREATE INDEX idx_rides_passenger   ON rides (passenger_id);
CREATE INDEX idx_rides_driver      ON rides (driver_id);
CREATE INDEX idx_rides_state       ON rides (state_code);
CREATE INDEX idx_rides_created     ON rides (created_at DESC);
CREATE INDEX idx_rides_payment     ON rides (payment_status);
CREATE INDEX idx_rides_service     ON rides (service_type);

-- Índice geoespacial para analytics de zonas sin cobertura
CREATE INDEX idx_rides_pickup_loc  ON rides USING GIST (pickup_location);


-- ═══════════════════════════════════════════════════════════════
-- VIAJES PROGRAMADOS
-- El pasajero agenda con horas/días de anticipación
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS scheduled_rides (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id     UUID NOT NULL REFERENCES passengers(id),
  service_type     VARCHAR(20) NOT NULL,
  pickup_address   TEXT NOT NULL,
  pickup_location  GEOGRAPHY(POINT, 4326) NOT NULL,
  dropoff_address  TEXT NOT NULL,
  dropoff_location GEOGRAPHY(POINT, 4326) NOT NULL,
  scheduled_at     TIMESTAMP NOT NULL,   -- Fecha y hora exacta del viaje
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'dispatching', 'assigned', 'cancelled', 'completed')),
  ride_id          UUID REFERENCES rides(id),   -- Ride creado cuando se despacha
  reminder_sent    BOOLEAN NOT NULL DEFAULT false,  -- Si ya se envió el reminder de 30min
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scheduled_rides_passenger  ON scheduled_rides (passenger_id);
CREATE INDEX idx_scheduled_rides_scheduled  ON scheduled_rides (scheduled_at);
CREATE INDEX idx_scheduled_rides_status     ON scheduled_rides (status);

CREATE TRIGGER scheduled_rides_updated_at
  BEFORE UPDATE ON scheduled_rides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
