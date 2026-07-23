// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Repositorio de eventos SOS
// Tabla: sos_events
// ═══════════════════════════════════════════════════════════════

import { db } from '../config/database';

export interface SosEvent {
  id:                 string;
  ride_id:            string | null;
  triggered_by:       string;
  triggered_by_role:  'passenger' | 'driver';
  lat:                number | null;
  lng:                number | null;
  address_at_trigger: string | null;
  status:             'active' | 'resolved' | 'false_alarm';
  notes:              string | null;
  resolved_by:        string | null;
  resolved_at:        Date | null;
  created_at:         Date;
}

export const sosRepository = {

  create: async (params: {
    rideId?:           string;
    triggeredBy:       string;
    triggeredByRole:   'passenger' | 'driver';
    lat?:              number;
    lng?:              number;
    addressAtTrigger?: string;
  }): Promise<SosEvent> => {
    const location = params.lat !== undefined && params.lng !== undefined
      ? `ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography`
      : 'NULL';

    const { rows } = await db.query<SosEvent>(
      `INSERT INTO sos_events
         (ride_id, triggered_by, triggered_by_role, location, address_at_trigger)
       VALUES ($1, $2, $3, ${location}, $4)
       RETURNING id, ride_id, triggered_by, triggered_by_role,
                 ST_Y(location::geometry) AS lat,
                 ST_X(location::geometry) AS lng,
                 address_at_trigger, status, notes, resolved_by, resolved_at, created_at`,
      [params.rideId ?? null, params.triggeredBy, params.triggeredByRole, params.addressAtTrigger ?? null]
    );
    return rows[0];
  },

  listActive: async (): Promise<SosEvent[]> => {
    const { rows } = await db.query<SosEvent>(
      `SELECT id, ride_id, triggered_by, triggered_by_role,
              ST_Y(location::geometry) AS lat,
              ST_X(location::geometry) AS lng,
              address_at_trigger, status, notes, resolved_by, resolved_at, created_at
       FROM sos_events WHERE status = 'active' ORDER BY created_at DESC`
    );
    return rows;
  },

  resolve: async (id: string, resolvedBy: string, status: 'resolved' | 'false_alarm', notes?: string): Promise<boolean> => {
    const { rowCount } = await db.query(
      `UPDATE sos_events
       SET status = $1, resolved_by = $2, resolved_at = NOW(), notes = COALESCE($3, notes)
       WHERE id = $4 AND status = 'active'`,
      [status, resolvedBy, notes ?? null, id]
    );
    return (rowCount ?? 0) > 0;
  },
};
