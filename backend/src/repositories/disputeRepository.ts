// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { query, queryOne } from '../config/database';

export interface RideDispute {
  id: string;
  ride_id: string;
  reporter_id: string;
  reporter_role: 'passenger' | 'driver';
  reason: string;
  description: string | null;
  status: 'open' | 'reviewing' | 'resolved' | 'closed';
  resolution: string | null;
  resolved_by: string | null;
  created_at: string;
  resolved_at: string | null;
}

export const disputeRepository = {

  create: async (data: {
    rideId: string;
    reporterId: string;
    reporterRole: 'passenger' | 'driver';
    reason: string;
    description?: string;
  }): Promise<RideDispute> => {
    const row = await queryOne<RideDispute>(
      `INSERT INTO ride_disputes (ride_id, reporter_id, reporter_role, reason, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.rideId, data.reporterId, data.reporterRole, data.reason, data.description ?? null]
    );
    return row!;
  },

  getByRide: (rideId: string) =>
    query<RideDispute>(
      'SELECT * FROM ride_disputes WHERE ride_id = $1 ORDER BY created_at DESC',
      [rideId]
    ),

  getByUser: (userId: string) =>
    query<RideDispute>(
      'SELECT * FROM ride_disputes WHERE reporter_id = $1 ORDER BY created_at DESC',
      [userId]
    ),

  // Admin
  listOpen: () =>
    query<RideDispute & { passenger_name: string; driver_name: string }>(
      `SELECT d.*, pu.full_name AS passenger_name, du.full_name AS driver_name
       FROM ride_disputes d
       JOIN rides r ON r.id = d.ride_id
       LEFT JOIN users pu ON pu.id = r.passenger_id
       LEFT JOIN users du ON du.id = r.driver_id
       WHERE d.status IN ('open','reviewing')
       ORDER BY d.created_at ASC`
    ),

  resolve: async (disputeId: string, adminId: string, resolution: string): Promise<RideDispute | null> =>
    queryOne<RideDispute>(
      `UPDATE ride_disputes
         SET status = 'resolved', resolution = $2, resolved_by = $3, resolved_at = NOW()
       WHERE id = $1 RETURNING *`,
      [disputeId, resolution, adminId]
    ),

  updateStatus: (disputeId: string, status: string) =>
    query('UPDATE ride_disputes SET status = $2 WHERE id = $1', [disputeId, status]),
};
