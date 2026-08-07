-- V-RIDE VENEZUELA — Migración 003
-- Modelo de membresía semanal por tipo de vehículo
-- Los conductores pagan cada viernes — el 100% del viaje les queda a ellos
-- Los pasajeros pagan directo al conductor (fuera de la app)

-- ─────────────────────────────────────
-- TIPOS DE VEHÍCULO Y PRECIOS DE MEMBRESÍA
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS ve_vehicle_types (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                VARCHAR(20) UNIQUE NOT NULL,  -- 'motorcycle', 'sedan', 'suv'
  name                VARCHAR(50) NOT NULL,          -- 'Motocicleta', 'Sedán', 'SUV'
  weekly_fee_usd      DECIMAL(8,2) NOT NULL,         -- Costo membresía semanal en USD
  is_active           BOOLEAN     NOT NULL DEFAULT true,
  created_at          TIMESTAMP   NOT NULL DEFAULT NOW()
);

INSERT INTO ve_vehicle_types (code, name, weekly_fee_usd) VALUES
  ('motorcycle', 'Motocicleta', 15.00),
  ('sedan',      'Sedán',       25.00),
  ('suv',        'SUV',         30.00)
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────
-- MEMBRESÍAS DE CONDUCTORES
-- Una fila por semana por conductor
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS ve_driver_memberships (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id           UUID        NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_type_code   VARCHAR(20) NOT NULL REFERENCES ve_vehicle_types(code),
  week_start          DATE        NOT NULL,  -- Viernes de inicio de la semana
  week_end            DATE        NOT NULL,  -- Jueves siguiente (7 días)
  amount_usd          DECIMAL(8,2) NOT NULL, -- Monto cobrado esa semana
  status              VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- pending: esperando pago | paid: confirmado | expired: no pagó | waived: exonerado por admin
  created_at          TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP   NOT NULL DEFAULT NOW(),
  UNIQUE (driver_id, week_start)
);

-- ─────────────────────────────────────
-- PAGOS DE MEMBRESÍA
-- Registra cada pago recibido con su método y referencia
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS ve_membership_payments (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  membership_id       UUID        NOT NULL REFERENCES ve_driver_memberships(id) ON DELETE CASCADE,
  driver_id           UUID        NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  amount_usd          DECIMAL(8,2) NOT NULL,
  payment_method      VARCHAR(30) NOT NULL,
  -- 'stripe' | 'zelle' | 'paypal' | 'binance' | 'pago_movil' | 'bank_transfer'
  payment_reference   VARCHAR(200),  -- ID de transacción, número de confirmación, etc.
  payment_proof_url   TEXT,          -- URL de captura de pantalla del pago (Supabase Storage)
  status              VARCHAR(20) NOT NULL DEFAULT 'pending_verification',
  -- pending_verification: esperando que admin confirme
  -- verified: admin confirmó el pago
  -- rejected: admin rechazó (referencia inválida)
  verified_by         UUID        REFERENCES users(id),  -- Admin que verificó
  verified_at         TIMESTAMP,
  rejection_reason    TEXT,
  paid_at             TIMESTAMP   NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────
-- MÉTODOS DE PAGO DISPONIBLES EN VENEZUELA
-- Configurable desde el dashboard admin
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS ve_payment_methods (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                VARCHAR(30) UNIQUE NOT NULL,
  name                VARCHAR(50) NOT NULL,
  currency            VARCHAR(10) NOT NULL,  -- 'USD' o 'VES'
  instructions        TEXT,       -- Instrucciones para el conductor (número Zelle, wallet Binance, etc.)
  is_active           BOOLEAN     NOT NULL DEFAULT true,
  display_order       INTEGER     NOT NULL DEFAULT 0,
  created_at          TIMESTAMP   NOT NULL DEFAULT NOW()
);

INSERT INTO ve_payment_methods (code, name, currency, display_order) VALUES
  ('zelle',         'Zelle',                    'USD', 1),
  ('binance',       'Binance Pay',              'USD', 2),
  ('paypal',        'PayPal',                   'USD', 3),
  ('stripe',        'Tarjeta de crédito/débito','USD', 4),
  ('pago_movil',    'Pago Móvil',               'VES', 5),
  ('bank_transfer', 'Transferencia bancaria',   'VES', 6)
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────
-- TRIGGERS DE updated_at
-- ─────────────────────────────────────
CREATE TRIGGER ve_memberships_updated_at
  BEFORE UPDATE ON ve_driver_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
