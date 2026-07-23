-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 003: Tabla de usuarios (base para todos los roles)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,    -- UID de Firebase Auth
  email        VARCHAR(255) UNIQUE NOT NULL,
  name         VARCHAR(255) NOT NULL,
  phone        VARCHAR(20),
  phone_verified BOOLEAN    NOT NULL DEFAULT false,
  photo_url    TEXT,
  role         VARCHAR(20)  NOT NULL CHECK (role IN ('passenger', 'driver', 'admin')),
  language     VARCHAR(5)   NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en')),
  state_code   CHAR(2)      REFERENCES us_states(code),  -- estado de residencia
  is_active    BOOLEAN      NOT NULL DEFAULT true,
  created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_firebase_uid ON users (firebase_uid);
CREATE INDEX idx_users_email        ON users (email);
CREATE INDEX idx_users_role         ON users (role);
CREATE INDEX idx_users_state        ON users (state_code);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ═══════════════════════════════════════════════════════════════
-- PASAJEROS — extensión de la tabla users
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS passengers (
  id                      UUID         PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  rating_avg              DECIMAL(3,2) NOT NULL DEFAULT 5.00,
  total_rides             INTEGER      NOT NULL DEFAULT 0,
  emergency_contact_name  VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  stripe_customer_id      VARCHAR(100) UNIQUE,   -- ID en Stripe para cobros
  created_at              TIMESTAMP    NOT NULL DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════════
-- CONDUCTORES — extensión de la tabla users con campo PostGIS
-- El campo current_location es la clave para la búsqueda nacional
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS drivers (
  id            UUID    PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state_code    CHAR(2) REFERENCES us_states(code),   -- estado de registro

  -- Documentos de identidad
  license_number     VARCHAR(50),
  license_expiry     DATE,
  license_front_url  TEXT,
  license_back_url   TEXT,

  -- Datos del vehículo
  vehicle_plate         VARCHAR(20),
  vehicle_brand         VARCHAR(100),
  vehicle_model         VARCHAR(100),
  vehicle_year          INTEGER,
  vehicle_color         VARCHAR(50),
  vehicle_photo_front_url   TEXT,
  vehicle_photo_back_url    TEXT,
  vehicle_photo_left_url    TEXT,
  vehicle_photo_right_url   TEXT,
  vehicle_interior_url  TEXT,

  -- Seguro y verificación
  insurance_doc_url      TEXT,
  insurance_expiry       DATE,
  background_check_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (background_check_status IN ('pending', 'approved', 'rejected')),
  accessible_cert_url    TEXT,   -- Certificado capacitación movilidad reducida

  -- Tipos de servicio habilitados para este conductor
  services TEXT[] NOT NULL DEFAULT '{standard}',
    -- Posibles valores: 'standard', 'executive', 'accessible', 'scheduled', 'hourly'

  -- Estado de la cuenta del conductor
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'under_review', 'active', 'inactive', 'suspended', 'rejected')),
  rejection_reason TEXT,
  suspension_reason TEXT,

  -- Disponibilidad en tiempo real
  is_online           BOOLEAN   NOT NULL DEFAULT false,
  -- CAMPO GEOESPACIAL — PostGIS Geography Point (lng, lat, WGS84)
  -- Actualizado cada 4 segundos via WebSocket cuando el conductor está online
  -- Permite ST_DWithin() para buscar conductores en cualquier punto de EE.UU.
  current_location    GEOGRAPHY(POINT, 4326),
  last_location_at    TIMESTAMP,
  current_state_code  CHAR(2) REFERENCES us_states(code),  -- estado actual (puede diferir del de registro)

  -- Métricas y ganancias
  rating_avg          DECIMAL(3,2) NOT NULL DEFAULT 5.00,
  total_rides         INTEGER      NOT NULL DEFAULT 0,
  rides_this_month    INTEGER      NOT NULL DEFAULT 0,
  consecutive_rejections INTEGER   NOT NULL DEFAULT 0,
  total_earned        DECIMAL(12,2) NOT NULL DEFAULT 0,
  available_balance   DECIMAL(12,2) NOT NULL DEFAULT 0,   -- Balance disponible para retirar

  -- Referidos
  referral_code       VARCHAR(20) UNIQUE,   -- Código único compartible
  referred_by_id      UUID REFERENCES drivers(id),

  -- Stripe Connect (para recibir pagos directos)
  stripe_account_id       VARCHAR(100) UNIQUE,
  stripe_account_verified BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ÍNDICE GEOESPACIAL — búsqueda ultrarrápida ST_DWithin()
-- Filtrado por is_online y status para excluir conductores no disponibles
-- Este índice permite encontrar conductores en cualquier ciudad de EE.UU. en milisegundos
CREATE INDEX idx_drivers_location ON drivers USING GIST (current_location)
  WHERE is_online = true AND status = 'active';

CREATE INDEX idx_drivers_status    ON drivers (status);
CREATE INDEX idx_drivers_is_online ON drivers (is_online);
CREATE INDEX idx_drivers_state     ON drivers (state_code);
CREATE INDEX idx_drivers_referral  ON drivers (referral_code);

CREATE TRIGGER drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
