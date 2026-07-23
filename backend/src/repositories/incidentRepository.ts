// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { query, queryOne } from '../config/database';

export interface RideIncident {
  id: string;
  ride_id: string;
  reporter_id: string;
  reporter_role: string;
  incident_type: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  status: string;
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
}

export const INCIDENT_TYPES = [
  'aggressive_passenger',
  'aggressive_driver',
  'accident',
  'mechanical_failure',
  'route_deviation',
  'unauthorized_stop',
  'property_damage',
  'other',
] as const;

export const incidentRepository = {
  create: async (data: {
    rideId: string;
    reporterId: string;
    reporterRole: string;
    incidentType: string;
    description?: string;
    lat?: number;
    lng?: number;
  }): Promise<RideIncident> => {
    const row = await queryOne<RideIncident>(
      `INSERT INTO ride_incidents
         (ride_id, reporter_id, reporter_role, incident_type, description, lat, lng)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [data.rideId, data.reporterId, data.reporterRole, data.incidentType,
       data.description ?? null, data.lat ?? null, data.lng ?? null]
    );
    return row!;
  },

  getByRide: (rideId: string) =>
    query<RideIncident>(
      `SELECT * FROM ride_incidents WHERE ride_id = $1 ORDER BY created_at DESC`,
      [rideId]
    ),

  getByUser: (userId: string) =>
    query<RideIncident>(
      `SELECT * FROM ride_incidents WHERE reporter_id = $1 ORDER BY created_at DESC`,
      [userId]
    ),

  listOpen: () =>
    query<RideIncident & { passenger_name: string; driver_name: string }>(
      `SELECT i.*,
              COALESCE(pu.full_name, pu.name) AS passenger_name,
              COALESCE(du.full_name, du.name) AS driver_name
       FROM ride_incidents i
       JOIN rides r ON r.id = i.ride_id
       LEFT JOIN users pu ON pu.id = r.passenger_id
       LEFT JOIN users du ON du.id = r.driver_id
       WHERE i.status = 'open'
       ORDER BY i.created_at ASC`
    ),

  resolve: (id: string, notes: string) =>
    query(
      `UPDATE ride_incidents SET status = 'resolved', admin_notes = $2, resolved_at = NOW() WHERE id = $1`,
      [id, notes]
    ),
};
