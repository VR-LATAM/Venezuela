/* ═══════════════════════════════════════════════════════════════
   Sistema de custodia de paquetes y carga — V-Ride Venezuela
   Aplica a: encomienda, pickup, plataforma, 350, npr
   Fotos por ángulo (JSONB): 6 ángulos para todos los servicios
   { front, back, left, right, top, bottom }
   ═══════════════════════════════════════════════════════════════ */

/* Nuevos estados de viaje */
ALTER TABLE rides
  DROP CONSTRAINT IF EXISTS rides_status_check;

ALTER TABLE rides
  ADD CONSTRAINT rides_status_check CHECK (status IN (
    'searching',
    'driver_assigned',
    'driver_arriving',
    'driver_arrived',
    'package_received',
    'in_progress',
    'completed',
    'cancelled_passenger',
    'cancelled_driver',
    'no_driver_found',
    'price_negotiation',
    'returning_to_sender',
    'returned_to_sender'
  ));

/* Tabla de custodia
   Las fotos se almacenan como JSONB con 6 claves por ángulo:
   { "front": "url", "back": "url", "left": "url",
     "right": "url", "top": "url", "bottom": "url" }
   Aplica igual a encomienda y a todos los vehículos de carga.
*/
CREATE TABLE IF NOT EXISTS ve_encomienda_custody (
  ride_id                   UUID        PRIMARY KEY
                            REFERENCES rides(id) ON DELETE CASCADE,

  service_type              VARCHAR(20) NOT NULL,
  /* encomienda | pickup | plataforma | 350 | npr */

  /* PINs de 4 dígitos */
  pickup_pin                CHAR(4)     NOT NULL,
  delivery_pin              CHAR(4)     NOT NULL,
  return_pin                CHAR(4),

  /* Fotos por ángulo — JSONB */
  pickup_photos             JSONB,
  delivery_photos           JSONB,
  return_photos             JSONB,

  /* Timestamps de cada evento */
  pickup_pin_verified_at    TIMESTAMPTZ,
  recipient_not_home_at     TIMESTAMPTZ,
  return_pin_verified_at    TIMESTAMPTZ,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER ve_encomienda_custody_updated_at
  BEFORE UPDATE ON ve_encomienda_custody
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_ve_encomienda_custody_ride ON ve_encomienda_custody(ride_id);
