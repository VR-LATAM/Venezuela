// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio de conductores — lógica de negocio
// Subida de documentos, gestión de estado, aprobación/rechazo
// ═══════════════════════════════════════════════════════════════

import { driverRepository } from '../repositories/driverRepository';
import { userRepository } from '../repositories/userRepository';
import { uploadDocument, uploadProfilePhoto, isAllowedMimeType, MAX_FILE_SIZE_BYTES } from './storageService';
import { sendPushNotification } from '../config/firebase';
import { query, queryOne } from '../config/database';
import { Driver } from '@vride/shared';

export type DocumentField =
  | 'license_front'
  | 'license_back'
  | 'vehicle_front'
  | 'vehicle_back'
  | 'vehicle_left'
  | 'vehicle_right'
  | 'vehicle_interior'
  | 'insurance'
  | 'accessible_cert'
  | 'selfie'
  | 'cert_defensive_driving'
  | 'cert_first_aid'
  | 'cert_senior_transport'
  | 'cert_pregnant_transport'
  | 'cert_disability_transport'
  | 'cert_visual_impairment'
  | 'cert_hearing_impairment'
  | 'cert_wheelchair_vehicle'
  | 'cert_cpr'
  | 'cert_medical_exam';

// Tipos de certificación que se guardan como doc_url en JSONB
const CERT_DOC_TYPES = new Set<DocumentField>([
  'cert_defensive_driving', 'cert_first_aid', 'cert_senior_transport',
  'cert_pregnant_transport', 'cert_disability_transport', 'cert_visual_impairment',
  'cert_hearing_impairment', 'cert_wheelchair_vehicle', 'cert_cpr', 'cert_medical_exam',
]);

// Mapeo de campo del documento a columna en la BD
const DOC_FIELD_MAP: Record<Exclude<DocumentField,
  | 'cert_defensive_driving' | 'cert_first_aid' | 'cert_senior_transport'
  | 'cert_pregnant_transport' | 'cert_disability_transport' | 'cert_visual_impairment'
  | 'cert_hearing_impairment' | 'cert_wheelchair_vehicle' | 'cert_cpr' | 'cert_medical_exam'
>, string> = {
  license_front: 'license_front_url',
  license_back: 'license_back_url',
  vehicle_front: 'vehicle_photo_front_url',
  vehicle_back: 'vehicle_photo_back_url',
  vehicle_left: 'vehicle_photo_left_url',
  vehicle_right: 'vehicle_photo_right_url',
  vehicle_interior: 'vehicle_interior_url',
  insurance: 'insurance_doc_url',
  accessible_cert: 'accessible_cert_url',
  selfie: 'photo_url', // Va a tabla users, no drivers
};

// Documentos requeridos para poder solicitar revisión
const REQUIRED_DOCUMENTS: DocumentField[] = [
  'license_front',
  'license_back',
  'vehicle_front',
  'vehicle_back',
  'vehicle_left',
  'vehicle_right',
  'vehicle_interior',
  'insurance',
];

export const driverService = {
  // ─────────────────────────────────────
  // Subir un documento del conductor
  // ─────────────────────────────────────
  uploadDocument: async (
    driverId: string,
    docType: DocumentField,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<string> => {
    // Validar tipo y tamaño
    if (!isAllowedMimeType(mimeType)) {
      throw new Error('INVALID_FILE_TYPE');
    }
    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error('FILE_TOO_LARGE');
    }

    let fileUrl: string;

    if (docType === 'selfie') {
      // La selfie es la foto de perfil del usuario
      fileUrl = await uploadProfilePhoto(fileBuffer, mimeType, driverId);
      await userRepository.update(driverId, { photo_url: fileUrl });
    } else if (CERT_DOC_TYPES.has(docType)) {
      // Certificación — guardar URL en JSONB certifications
      fileUrl = await uploadDocument(fileBuffer, mimeType, driverId, docType);
      const certKey = docType.replace('cert_', ''); // e.g. 'cert_cpr' → 'cpr'
      await queryOne(
        `UPDATE drivers
         SET certifications = jsonb_set(
           COALESCE(certifications, '{}'),
           $1,
           jsonb_build_object('verified', false, 'expiry', null, 'doc_url', $2::text),
           true
         ), updated_at = NOW()
         WHERE id = $3`,
        [`{${certKey}}`, fileUrl, driverId]
      );
    } else {
      fileUrl = await uploadDocument(fileBuffer, mimeType, driverId, docType);

      // Actualizar la columna correspondiente en la tabla drivers
      const column = DOC_FIELD_MAP[docType as keyof typeof DOC_FIELD_MAP];
      await queryOne(
        `UPDATE drivers SET ${column} = $1, updated_at = NOW() WHERE id = $2`,
        [fileUrl, driverId]
      );
    }

    return fileUrl;
  },

  // ─────────────────────────────────────
  // Enviar solicitud de revisión
  // Verifica que todos los documentos requeridos estén subidos
  // ─────────────────────────────────────
  submitForReview: async (driverId: string): Promise<Driver> => {
    const driver = await driverRepository.findById(driverId);
    if (!driver) throw new Error('DRIVER_NOT_FOUND');

    if (driver.status !== 'pending') {
      throw new Error('INVALID_STATUS_FOR_REVIEW');
    }

    // Verificar documentos requeridos
    const missingDocs = checkMissingDocuments(driver);
    if (missingDocs.length > 0) {
      throw new Error(`MISSING_DOCUMENTS:${missingDocs.join(',')}`);
    }

    await driverRepository.submitForReview(driverId);

    const updated = await driverRepository.findById(driverId);
    if (!updated) throw new Error('DRIVER_NOT_FOUND');
    return updated;
  },

  saveContractSignature: async (driverId: string, signature: string): Promise<void> => {
    if (!signature || signature.trim().length === 0) throw new Error('INVALID_SIGNATURE');
    await driverRepository.saveContractSignature(driverId, signature);
  },

  // ─────────────────────────────────────
  // Aprobar conductor (admin)
  // ─────────────────────────────────────
  approveDriver: async (driverId: string, adminId: string): Promise<Driver> => {
    const driver = await driverRepository.findById(driverId);
    if (!driver) throw new Error('DRIVER_NOT_FOUND');

    if (driver.status !== 'under_review') {
      throw new Error('NOT_UNDER_REVIEW');
    }

    await driverRepository.updateStatus(driverId, 'active');

    // Notificar al conductor por push
    const pushToken = await getDriverPushToken(driverId);
    if (pushToken) {
      await sendPushNotification({
        token: pushToken,
        title: 'Account approved! 🎉',
        body: 'Your account has been approved. Complete the 5 training modules to start receiving rides.',
        data: { type: 'account_approved', action: 'open_training' },
      });
    }

    // Registrar en log de auditoría
    await query(
      `INSERT INTO driver_warnings (driver_id, issued_by, reason)
       VALUES ($1, $2, 'Cuenta aprobada por admin')`,
      [driverId, adminId]
    );

    const updated = await driverRepository.findById(driverId);
    if (!updated) throw new Error('DRIVER_NOT_FOUND');
    return updated;
  },

  // ─────────────────────────────────────
  // Rechazar conductor con motivo (admin)
  // ─────────────────────────────────────
  rejectDriver: async (driverId: string, reason: string, adminId: string): Promise<Driver> => {
    const driver = await driverRepository.findById(driverId);
    if (!driver) throw new Error('DRIVER_NOT_FOUND');

    await driverRepository.updateStatus(driverId, 'rejected', reason);

    const pushToken = await getDriverPushToken(driverId);
    if (pushToken) {
      await sendPushNotification({
        token: pushToken,
        title: 'Application not approved',
        body: `Your application was not approved: ${reason}. You can correct the issues and resubmit.`,
        data: { type: 'account_rejected', reason },
      });
    }

    const updated = await driverRepository.findById(driverId);
    if (!updated) throw new Error('DRIVER_NOT_FOUND');
    return updated;
  },

  // ─────────────────────────────────────
  // Suspender conductor (admin)
  // ─────────────────────────────────────
  suspendDriver: async (driverId: string, reason: string): Promise<Driver> => {
    await driverRepository.updateStatus(driverId, 'suspended', reason);

    const pushToken = await getDriverPushToken(driverId);
    if (pushToken) {
      await sendPushNotification({
        token: pushToken,
        title: 'Account suspended',
        body: `Your account has been temporarily suspended: ${reason}`,
        data: { type: 'account_suspended' },
      });
    }

    const updated = await driverRepository.findById(driverId);
    if (!updated) throw new Error('DRIVER_NOT_FOUND');
    return updated;
  },

  // Perfil público del conductor (para mostrar al pasajero durante el viaje)
  getPublicProfile: async (driverId: string) => {
    const driver = await driverRepository.findById(driverId);
    if (!driver) throw new Error('DRIVER_NOT_FOUND');

    // Solo devolver campos públicos — nunca documentos, balance, etc.
    return {
      id: driver.id,
      name: driver.name,
      photo_url: driver.photo_url,
      rating_avg: driver.rating_avg,
      total_rides: driver.total_rides,
      vehicle_brand: driver.vehicle_brand,
      vehicle_model: driver.vehicle_model,
      vehicle_color: driver.vehicle_color,
      vehicle_plate: driver.vehicle_plate,
      vehicle_year: driver.vehicle_year,
      services: driver.services,
    };
  },
};

// ─────────────────────────────────────
// Helpers privados
// ─────────────────────────────────────

function checkMissingDocuments(driver: Driver): string[] {
  const fieldMap: Record<string, unknown> = {
    license_front: driver.license_front_url,
    license_back: driver.license_back_url,
    vehicle_front: driver.vehicle_photo_front_url,
    vehicle_back: driver.vehicle_photo_back_url,
    vehicle_left: driver.vehicle_photo_left_url,
    vehicle_right: driver.vehicle_photo_right_url,
    vehicle_interior: driver.vehicle_interior_url,
    insurance: driver.insurance_doc_url,
  };

  return REQUIRED_DOCUMENTS.filter(doc => !fieldMap[doc]);
}

async function getDriverPushToken(driverId: string): Promise<string | null> {
  const row = await queryOne<{ token: string }>(
    `SELECT token FROM push_tokens WHERE user_id = $1 LIMIT 1`,
    [driverId]
  );
  return row?.token ?? null;
}
