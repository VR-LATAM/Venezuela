// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Repository de conductores
// Incluye queries PostGIS para búsqueda nacional por GPS
// ═══════════════════════════════════════════════════════════════

import { query, queryOne } from '../config/database';
import { Driver, DriverStatus } from '@vride/shared';
import { encryptPII, decryptPII } from '../utils/piiCrypto';

// Convierte "MM/YYYY" → "YYYY-MM-01" para columnas DATE de PostgreSQL
function toIsoDate(mmYyyy: string | undefined): string | undefined {
  if (!mmYyyy) return undefined;
  const parts = mmYyyy.split('/');
  if (parts.length === 2) return `${parts[1]}-${parts[0].padStart(2, '0')}-01`;
  return mmYyyy; // ya en otro formato, dejar pasar
}

// Desencripta los campos PII de un conductor después de leerlos de la BD.
// Si la clave no está configurada o el campo es null, lo devuelve sin cambios.
function decryptDriver<T>(driver: T | null): T | null {
  if (!driver) return null;
  const d = driver as unknown as Record<string, unknown>;
  const safeDecrypt = (val: unknown): unknown => {
    if (val === null || val === undefined) return null;
    if (typeof val !== 'string') return val;
    return decryptPII(val);
  };
  return {
    ...d,
    date_of_birth:  safeDecrypt(d['date_of_birth']),
    home_address:   safeDecrypt(d['home_address']),
    license_number: safeDecrypt(d['license_number']),
  } as unknown as T;
}

// Vista JOIN de conductor + datos base del usuario
const DRIVER_SELECT = `
  SELECT
    u.id, u.firebase_uid, u.email, u.name, u.phone, u.phone_verified,
    u.photo_url, u.role, u.language, u.state_code, u.is_active,
    u.created_at, u.updated_at,
    d.date_of_birth, d.ssn_last4, d.home_address,
    d.license_number, d.license_expiry, d.license_front_url, d.license_back_url,
    d.vehicle_plate, d.vehicle_brand, d.vehicle_model, d.vehicle_year, d.vehicle_color,
    d.vehicle_vin, d.vehicle_seats,
    d.vehicle_photo_front_url, d.vehicle_photo_back_url, d.vehicle_photo_left_url,
    d.vehicle_photo_right_url, d.vehicle_interior_url,
    d.insurance_company, d.insurance_policy_number,
    d.insurance_doc_url, d.insurance_expiry, d.background_check_status,
    d.accessible_cert_url, d.services, d.status, d.rejection_reason, d.suspension_reason,
    d.is_online, d.last_location_at, d.current_state_code,
    d.rating_avg, d.total_rides, d.rides_this_month, d.consecutive_rejections,
    d.total_earned, d.available_balance,
    d.certifications, d.languages, d.special_equipment,
    d.smokes, d.long_distance_available,
    d.music_preference, d.music_artist,
    d.referral_code, d.referred_by_id,
    d.stripe_account_id, d.stripe_account_verified,
    d.operative_code,
    d.contract_signed_at, d.contract_signature,
    -- Extraer lat/lng de la geometría PostGIS
    ST_Y(d.current_location::geometry) AS current_latitude,
    ST_X(d.current_location::geometry) AS current_longitude
  FROM users u
  JOIN drivers d ON d.id = u.id
`;

export interface CreateDriverParams {
  userId: string;
  stateCode: string;
  referralCode: string;
  referredById?: string;
}

export interface UpdateDriverDocumentsParams {
  // Personal
  dateOfBirth?: string;
  ssnLast4?: string;
  homeAddress?: string;
  // License
  licenseNumber?: string;
  licenseExpiry?: string;
  licenseFrontUrl?: string;
  licenseBackUrl?: string;
  // Vehicle
  vehiclePlate?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  vehicleVin?: string;
  vehicleSeats?: number;
  vehiclePhotoFrontUrl?: string;
  vehiclePhotoBackUrl?: string;
  vehiclePhotoLeftUrl?: string;
  vehiclePhotoRightUrl?: string;
  vehicleInteriorUrl?: string;
  // Insurance
  insuranceCompany?: string;
  insurancePolicyNumber?: string;
  insuranceDocUrl?: string;
  insuranceExpiry?: string;
  accessibleCertUrl?: string;
  // Service
  services?: string[];
  // Languages & equipment
  languages?: string[];
  specialEquipment?: string[];
  // Certifications (JSONB merge)
  certifications?: Record<string, { verified: boolean; expiry: string | null; doc_url: string | null }>;
  // Preferencias
  smokes?: boolean;
  longDistanceAvailable?: boolean;
  musicPreference?: string;
  musicArtist?: string;
}

export const driverRepository = {
  // Buscar conductor completo por ID
  findById: async (id: string) =>
    decryptDriver(await queryOne<Driver>(`${DRIVER_SELECT} WHERE u.id = $1`, [id])),

  // Buscar conductor por Firebase UID
  findByFirebaseUid: async (firebaseUid: string) =>
    decryptDriver(await queryOne<Driver>(`${DRIVER_SELECT} WHERE u.firebase_uid = $1`, [firebaseUid])),

  // Buscar conductor por código de referido
  findByReferralCode: async (referralCode: string) =>
    decryptDriver(await queryOne<Driver>(`${DRIVER_SELECT} WHERE d.referral_code = $1`, [referralCode])),

  // Crear registro en tabla drivers (después de crear user)
  create: (params: CreateDriverParams) =>
    queryOne<{ id: string }>(
      `INSERT INTO drivers (id, state_code, referral_code, referred_by_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [params.userId, params.stateCode, params.referralCode, params.referredById ?? null]
    ),

  // Actualizar documentos del conductor (multi-paso del registro)
  updateDocuments: (id: string, params: UpdateDriverDocumentsParams) => {
    const fields: Record<string, unknown> = {
      // PII encriptado en columnas _enc; columnas originales se nulan
      date_of_birth_enc:       params.dateOfBirth   ? encryptPII(params.dateOfBirth)   : undefined,
      home_address_enc:        params.homeAddress   ? encryptPII(params.homeAddress)   : undefined,
      license_number_enc:      params.licenseNumber ? encryptPII(params.licenseNumber) : undefined,
      date_of_birth:           params.dateOfBirth   ? null : undefined,
      home_address:            params.homeAddress   ? null : undefined,
      license_number:          params.licenseNumber ? null : undefined,
      ssn_last4:               params.ssnLast4,
      license_expiry:          toIsoDate(params.licenseExpiry),
      license_front_url:       params.licenseFrontUrl,
      license_back_url:        params.licenseBackUrl,
      vehicle_plate:           params.vehiclePlate,
      vehicle_brand:           params.vehicleBrand,
      vehicle_model:           params.vehicleModel,
      vehicle_year:            params.vehicleYear,
      vehicle_color:           params.vehicleColor,
      vehicle_vin:             params.vehicleVin,
      vehicle_seats:           params.vehicleSeats,
      vehicle_photo_front_url: params.vehiclePhotoFrontUrl,
      vehicle_photo_back_url:  params.vehiclePhotoBackUrl,
      vehicle_photo_left_url:  params.vehiclePhotoLeftUrl,
      vehicle_photo_right_url: params.vehiclePhotoRightUrl,
      vehicle_interior_url:    params.vehicleInteriorUrl,
      insurance_company:       params.insuranceCompany,
      insurance_policy_number: params.insurancePolicyNumber,
      insurance_doc_url:       params.insuranceDocUrl,
      insurance_expiry:        toIsoDate(params.insuranceExpiry),
      accessible_cert_url:     params.accessibleCertUrl,
      services:                params.services ? `{${params.services.join(',')}}` : undefined,
      languages:               params.languages ? `{${params.languages.join(',')}}` : undefined,
      special_equipment:       params.specialEquipment ? `{${params.specialEquipment.join(',')}}` : undefined,
      smokes:                  params.smokes,
      long_distance_available: params.longDistanceAvailable,
      music_preference:        params.musicPreference,
      music_artist:            params.musicArtist,
    };

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    for (const [col, val] of Object.entries(fields)) {
      if (val !== undefined) {
        setClauses.push(`${col} = $${i}`);
        values.push(val);
        i++;
      }
    }

    // Certifications: merge JSONB
    if (params.certifications) {
      setClauses.push(`certifications = certifications || $${i}::jsonb`);
      values.push(JSON.stringify(params.certifications));
      i++;
    }

    if (setClauses.length === 0) return Promise.resolve(null);

    values.push(id);
    return queryOne<{ id: string }>(
      `UPDATE drivers SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $${i} RETURNING id`,
      values
    );
  },

  // Cambiar estado de la cuenta del conductor (admin)
  updateStatus: (id: string, status: DriverStatus, reason?: string) =>
    queryOne<{ id: string; status: string }>(
      `UPDATE drivers
       SET status = $1,
           rejection_reason = CASE WHEN $1 = 'rejected' THEN $2 ELSE rejection_reason END,
           suspension_reason = CASE WHEN $1 = 'suspended' THEN $2 ELSE suspension_reason END,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, status`,
      [status, reason ?? null, id]
    ),

  // Mover a estado "under_review" cuando todos los documentos estén subidos
  submitForReview: (id: string) =>
    queryOne<{ id: string }>(
      `UPDATE drivers SET status = 'under_review', updated_at = NOW()
       WHERE id = $1 RETURNING id`,
      [id]
    ),

  updateOperativeCodePrefix: (id: string, services: string[]) => {
    const prefixMap: Record<string, string> = {
      motorcycle: 'MT', sedan: 'SD', suv: 'SV',
      van: 'VN', pickup: 'PU', '350': 'CG', npr: 'CG',
    };
    const prefix = services.map(s => prefixMap[s]).find(Boolean) ?? 'DR';
    return queryOne<{ id: string }>(
      `UPDATE drivers
       SET operative_code = regexp_replace(operative_code, '^[A-Z]+', $1),
           updated_at = NOW()
       WHERE id = $2 RETURNING id`,
      [prefix, id]
    );
  },

  saveContractSignature: (id: string, signature: string) =>
    queryOne<{ id: string }>(
      `UPDATE drivers
       SET contract_signature = $2, contract_signed_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING id`,
      [id, signature]
    ),

  // Actualizar posición GPS en tiempo real (llamado cada 4 segundos)
  // Usa PostGIS ST_MakePoint(lng, lat) para actualizar la geometría
  updateLocation: (id: string, longitude: number, latitude: number, currentStateCode?: string) =>
    queryOne<{ id: string }>(
      `UPDATE drivers
       SET current_location = ST_MakePoint($1, $2)::geography,
           last_location_at = NOW(),
           current_state_code = COALESCE($3, current_state_code),
           updated_at = NOW()
       WHERE id = $4 RETURNING id`,
      [longitude, latitude, currentStateCode ?? null, id]
    ),

  // Agregar un servicio al array services[] del conductor si no lo tiene ya
  addService: (driverId: string, serviceType: string) =>
    queryOne<{ id: string }>(
      `UPDATE drivers
       SET services   = array_append(COALESCE(services, ARRAY[]::text[]), $1),
           updated_at = NOW()
       WHERE id = $2
         AND NOT ($1 = ANY(COALESCE(services, ARRAY[]::text[])))
       RETURNING id`,
      [serviceType, driverId]
    ),

  // Cambiar disponibilidad online/offline
  // Si va online, guarda online_since para auditoría de seguro TNC
  updateOnlineStatus: (id: string, isOnline: boolean) =>
    queryOne<{ id: string }>(
      `UPDATE drivers
       SET is_online    = $1,
           online_since = CASE WHEN $1 = true THEN NOW() ELSE online_since END,
           updated_at   = NOW()
       WHERE id = $2 RETURNING id`,
      [isOnline, id]
    ),

  // Guardar punto GPS en historial durante viaje activo (auditoría seguro)
  logLocation: (driverId: string, rideId: string | null, latitude: number, longitude: number, heading?: number, speed?: number) =>
    queryOne<{ id: number }>(
      `INSERT INTO driver_location_log (driver_id, ride_id, latitude, longitude, heading, speed)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [driverId, rideId ?? null, latitude, longitude, heading ?? null, speed ?? null]
    ),

  // ─────────────────────────────────────
  // BÚSQUEDA GEOESPACIAL NACIONAL (PostGIS)
  // Encuentra conductores disponibles dentro de un radio dado
  // Funciona igual en Houston que en West Texas o cualquier ciudad de EE.UU.
  // ─────────────────────────────────────
  findNearby: (
    longitude: number,
    latitude: number,
    radiusMeters: number,
    serviceType?: string,
    limit = 10
  ) =>
    query<Driver & { distance_meters: number }>(
      `SELECT
        u.id, u.name, u.photo_url,
        d.vehicle_brand, d.vehicle_model, d.vehicle_color, d.vehicle_plate,
        d.services, d.rating_avg, d.is_online,
        ST_Y(d.current_location::geometry) AS current_latitude,
        ST_X(d.current_location::geometry) AS current_longitude,
        -- Distancia exacta en metros desde el punto del pasajero
        ST_Distance(
          d.current_location::geography,
          ST_MakePoint($1, $2)::geography
        ) AS distance_meters
       FROM drivers d
       JOIN users u ON u.id = d.id
       WHERE d.is_online = true
         AND d.status = 'active'
         AND u.is_active = true
         -- ST_DWithin: usa el índice GIST para búsqueda ultrarrápida por radio
         AND ST_DWithin(
           d.current_location::geography,
           ST_MakePoint($1, $2)::geography,
           $3
         )
         -- Filtrar por tipo de servicio: acepta si está en d.services.
         -- d.services IS NULL = conductor sin servicios configurados → acepta cualquier tipo.
         -- 'encomienda' = moto, sedán o SUV. 'carga' = 350 o NPR.
         AND (
           $4::text IS NULL
           OR d.services IS NULL
           OR $4 = ANY(d.services)
           OR ($4 = 'encomienda' AND d.services && ARRAY['motorcycle','sedan','suv']::text[])
           OR ($4 = 'carga'      AND d.services && ARRAY['350','npr']::text[])
         )
       ORDER BY distance_meters ASC, d.rating_avg DESC
       LIMIT $5`,
      [longitude, latitude, radiusMeters, serviceType ?? null, limit]
    ),

  // Lista de conductores pendientes de aprobación (para dashboard admin)
  findPendingReview: (limit = 50, offset = 0) =>
    query<Driver>(
      `${DRIVER_SELECT}
       WHERE d.status = 'under_review'
       ORDER BY u.created_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),

  // Lista filtrable para el dashboard admin
  findAll: (filters: {
    status?: DriverStatus;
    stateCode?: string;
    limit?: number;
    offset?: number;
  }) => {
    const conditions: string[] = ['1=1'];
    const values: unknown[] = [];
    let i = 1;

    if (filters.status) {
      conditions.push(`d.status = $${i}`);
      values.push(filters.status);
      i++;
    }
    if (filters.stateCode) {
      conditions.push(`d.state_code = $${i}`);
      values.push(filters.stateCode);
      i++;
    }

    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;
    values.push(limit, offset);

    return query<Driver>(
      `${DRIVER_SELECT}
       WHERE ${conditions.join(' AND ')}
       ORDER BY u.created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      values
    );
  },

  // Actualizar Stripe Connect account ID
  updateStripeAccount: (id: string, stripeAccountId: string) =>
    queryOne<{ id: string }>(
      `UPDATE drivers SET stripe_account_id = $1, updated_at = NOW()
       WHERE id = $2 RETURNING id`,
      [stripeAccountId, id]
    ),

  // Actualizar un campo simple — daily_earnings_goal, etc.
  updateField: (id: string, field: string, value: unknown) => {
    const ALLOWED = new Set([
      'daily_earnings_goal',
    ]);
    if (!ALLOWED.has(field)) throw new Error(`Field '${field}' is not updatable via updateField`);
    return queryOne<{ id: string }>(
      `UPDATE drivers SET ${field} = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
      [value, id]
    );
  },

  // Incrementar contadores de oferta/aceptación
  incrementRidesOffered: (id: string) =>
    queryOne<{ id: string }>(
      `UPDATE drivers SET rides_offered = COALESCE(rides_offered,0) + 1, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [id]
    ),

  incrementRidesAccepted: (id: string) =>
    queryOne<{ id: string }>(
      `UPDATE drivers SET rides_accepted = COALESCE(rides_accepted,0) + 1, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [id]
    ),
};
