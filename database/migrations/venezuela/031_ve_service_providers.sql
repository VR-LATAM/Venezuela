/* ═══════════════════════════════════════════════════════════════
   Migración 031 — Afiliación de prestatarios de servicios Comunidad
   Cuota: $20/mes  ·  Tipos: tecnico, proveedor, negocio
   ═══════════════════════════════════════════════════════════════ */

/* Agregar columna para contraseña hasheada (prestatarios no usan Firebase) */
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

/* Extender el CHECK de role para incluir 'provider' */
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('passenger', 'driver', 'admin', 'provider'));

/* ─── Tabla principal de prestatarios ─── */
CREATE TABLE IF NOT EXISTS ve_service_providers (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  provider_type   VARCHAR(20) NOT NULL
                  CHECK (provider_type IN ('tecnico', 'proveedor', 'negocio')),

  /* Datos personales */
  full_name       VARCHAR(200) NOT NULL,
  cedula          VARCHAR(20),
  phone           VARCHAR(20)  NOT NULL,
  state           VARCHAR(100),
  profile_photo_url TEXT,

  /* Técnico (mecánico, A/C, baterías, cauchos) */
  specialty         TEXT,
  experience        VARCHAR(50),
  cert_photo_url    TEXT,

  /* Proveedor (cisterna, tanque gas, planta, gasolina, grúa, mudanza) */
  equipment         TEXT,
  capacity          VARCHAR(100),
  equipment_photo_url TEXT,

  /* Negocio (taller mecánico) */
  business_name     VARCHAR(200),
  business_address  TEXT,
  rif               VARCHAR(20),
  business_photo_url TEXT,

  /* Estado y membresía */
  status            VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  rejection_reason  TEXT,

  membership_fee_usd    DECIMAL(10,2) DEFAULT 20.00,
  membership_period     VARCHAR(10)   DEFAULT 'monthly',
  membership_expires_at TIMESTAMPTZ,

  /* Estadísticas */
  rating         DECIMAL(3,2) DEFAULT 0,
  total_services INTEGER      DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ve_sp_user_id ON ve_service_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_ve_sp_type    ON ve_service_providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_ve_sp_status  ON ve_service_providers(status);
CREATE INDEX IF NOT EXISTS idx_ve_sp_state   ON ve_service_providers(state);
