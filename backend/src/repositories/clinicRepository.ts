// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { query, queryOne } from '../config/database';

export interface ClinicAccount {
  id: string;
  name: string;
  address: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  billing_code: string | null;
  password_hash: string | null;
  api_key: string;
  plan: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClinicRideRequest {
  id: string;
  clinic_id: string;
  passenger_id: string | null;
  patient_name: string;
  patient_phone: string | null;
  pickup_address: string;
  dropoff_address: string;
  scheduled_at: string;
  service_type: string;
  notes: string | null;
  diagnosis_code: string | null;
  ride_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ClinicStats {
  total: number;
  pending: number;
  scheduled: number;
  completed: number;
  cancelled: number;
}

export const clinicRepository = {

  findByApiKey: (apiKey: string) =>
    queryOne<ClinicAccount>(
      `SELECT * FROM clinic_accounts WHERE api_key = $1 AND is_active = TRUE`,
      [apiKey]
    ),

  findById: (id: string) =>
    queryOne<ClinicAccount>(
      `SELECT * FROM clinic_accounts WHERE id = $1`,
      [id]
    ),

  findByEmail: (email: string) =>
    queryOne<ClinicAccount>(
      `SELECT * FROM clinic_accounts WHERE contact_email = $1`,
      [email]
    ),

  listAll: () =>
    query<ClinicAccount & { total_requests: number; pending_requests: number }>(
      `SELECT c.*,
              COUNT(r.id)::int                                              AS total_requests,
              COUNT(r.id) FILTER (WHERE r.status = 'pending')::int         AS pending_requests
       FROM   clinic_accounts c
       LEFT   JOIN clinic_ride_requests r ON r.clinic_id = c.id
       GROUP  BY c.id
       ORDER  BY c.name ASC`
    ),

  create: async (data: {
    name: string;
    address?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    billingCode?: string;
    passwordHash?: string;
    plan?: string;
  }): Promise<ClinicAccount> => {
    const row = await queryOne<ClinicAccount>(
      `INSERT INTO clinic_accounts
         (name, address, contact_name, contact_email, contact_phone, billing_code, password_hash, plan)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        data.name,
        data.address ?? null,
        data.contactName ?? null,
        data.contactEmail ?? null,
        data.contactPhone ?? null,
        data.billingCode ?? null,
        data.passwordHash ?? null,
        data.plan ?? 'basic',
      ]
    );
    return row!;
  },

  setPassword: (id: string, passwordHash: string) =>
    query(
      `UPDATE clinic_accounts SET password_hash = $2 WHERE id = $1`,
      [id, passwordHash]
    ),

  toggleActive: (id: string, isActive: boolean) =>
    queryOne<ClinicAccount>(
      `UPDATE clinic_accounts SET is_active = $2 WHERE id = $1 RETURNING *`,
      [id, isActive]
    ),

  getStats: async (clinicId: string): Promise<ClinicStats> => {
    const row = await queryOne<{
      total: string; pending: string; scheduled: string; completed: string; cancelled: string;
    }>(
      `SELECT COUNT(*)::int                                                 AS total,
              COUNT(*) FILTER (WHERE status = 'pending')::int              AS pending,
              COUNT(*) FILTER (WHERE status = 'scheduled')::int            AS scheduled,
              COUNT(*) FILTER (WHERE status = 'completed')::int            AS completed,
              COUNT(*) FILTER (WHERE status = 'cancelled')::int            AS cancelled
       FROM   clinic_ride_requests
       WHERE  clinic_id = $1`,
      [clinicId]
    );
    return {
      total:     Number(row?.total     ?? 0),
      pending:   Number(row?.pending   ?? 0),
      scheduled: Number(row?.scheduled ?? 0),
      completed: Number(row?.completed ?? 0),
      cancelled: Number(row?.cancelled ?? 0),
    };
  },

  createRideRequest: async (data: {
    clinicId: string;
    patientName: string;
    patientPhone?: string;
    pickupAddress: string;
    dropoffAddress: string;
    scheduledAt: string;
    serviceType?: string;
    notes?: string;
    diagnosisCode?: string;
    passengerId?: string;
  }): Promise<ClinicRideRequest> => {
    const row = await queryOne<ClinicRideRequest>(
      `INSERT INTO clinic_ride_requests
         (clinic_id, patient_name, patient_phone, pickup_address, dropoff_address,
          scheduled_at, service_type, notes, diagnosis_code, passenger_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        data.clinicId, data.patientName, data.patientPhone ?? null,
        data.pickupAddress, data.dropoffAddress, data.scheduledAt,
        data.serviceType ?? 'accessible', data.notes ?? null,
        data.diagnosisCode ?? null, data.passengerId ?? null,
      ]
    );
    return row!;
  },

  getRequests: (clinicId: string) =>
    query<ClinicRideRequest>(
      `SELECT * FROM clinic_ride_requests WHERE clinic_id = $1 ORDER BY scheduled_at DESC`,
      [clinicId]
    ),

  getRequestById: (id: string, clinicId: string) =>
    queryOne<ClinicRideRequest>(
      `SELECT * FROM clinic_ride_requests WHERE id = $1 AND clinic_id = $2`,
      [id, clinicId]
    ),

  cancelRequest: (id: string, clinicId: string) =>
    query(
      `UPDATE clinic_ride_requests
       SET status = 'cancelled'
       WHERE id = $1 AND clinic_id = $2 AND status = 'pending'`,
      [id, clinicId]
    ),

  linkRide: (requestId: string, rideId: string) =>
    query(
      `UPDATE clinic_ride_requests SET ride_id = $2, status = 'scheduled' WHERE id = $1`,
      [requestId, rideId]
    ),

  findByRideId: (rideId: string) =>
    queryOne<ClinicRideRequest>(
      `SELECT * FROM clinic_ride_requests WHERE ride_id = $1`,
      [rideId]
    ),

  listPendingRequests: () =>
    query<ClinicRideRequest & { clinic_name: string }>(
      `SELECT r.*, c.name AS clinic_name
       FROM   clinic_ride_requests r
       JOIN   clinic_accounts c ON c.id = r.clinic_id
       WHERE  r.status = 'pending'
       ORDER  BY r.scheduled_at ASC`
    ),

  listAllRequests: () =>
    query<ClinicRideRequest & { clinic_name: string }>(
      `SELECT r.*, c.name AS clinic_name
       FROM   clinic_ride_requests r
       JOIN   clinic_accounts c ON c.id = r.clinic_id
       ORDER  BY r.scheduled_at DESC
       LIMIT  200`
    ),
};
