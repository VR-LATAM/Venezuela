// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio de almacenamiento — Supabase Storage
// Sube fotos de perfil y documentos de conductores al bucket privado
// ═══════════════════════════════════════════════════════════════

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

type DocumentType =
  | 'profile'
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

const BUCKET = 'vride-docs';
const TEN_YEARS_SECONDS = 315_360_000;

function authHeaders() {
  return {
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

async function getSignedUrl(filePath: string): Promise<string> {
  const { data } = await axios.post(
    `${env.SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${filePath}`,
    { expiresIn: TEN_YEARS_SECONDS },
    { headers: { ...authHeaders(), 'Content-Type': 'application/json' } }
  );
  return `${env.SUPABASE_URL}${data.signedURL}`;
}

// Subir un archivo al bucket privado de Supabase Storage
// Devuelve una URL firmada con acceso temporal de 10 años
export async function uploadDocument(
  fileBuffer: Buffer,
  mimeType: string,
  userId: string,
  docType: DocumentType
): Promise<string> {
  const ext = getExtensionFromMime(mimeType);
  const filePath = `${userId}/${docType}_${uuidv4()}${ext}`;

  await axios.post(
    `${env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${filePath}`,
    fileBuffer,
    { headers: { ...authHeaders(), 'Content-Type': mimeType } }
  );

  return getSignedUrl(filePath);
}

// Subir foto de perfil — misma lógica, carpeta separada
export async function uploadProfilePhoto(
  fileBuffer: Buffer,
  mimeType: string,
  userId: string
): Promise<string> {
  const ext = getExtensionFromMime(mimeType);
  const filePath = `profiles/${userId}${ext}`;

  await axios.post(
    `${env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${filePath}`,
    fileBuffer,
    { headers: { ...authHeaders(), 'Content-Type': mimeType, 'x-upsert': 'true' } }
  );

  return getSignedUrl(filePath);
}

// Subir foto de custodia de paquete
export async function uploadCustodyPhoto(
  fileBuffer: Buffer,
  mimeType: string,
  rideId: string,
  folder: string,
  angle: string
): Promise<string> {
  const ext = getExtensionFromMime(mimeType);
  const filePath = `custody/${rideId}/${folder}_${angle}_${uuidv4()}${ext}`;

  await axios.post(
    `${env.SUPABASE_URL}/storage/v1/object/custody-photos/${filePath}`,
    fileBuffer,
    { headers: { ...authHeaders(), 'Content-Type': mimeType, 'x-upsert': 'true' } }
  );

  return `${env.SUPABASE_URL}/storage/v1/object/public/custody-photos/${filePath}`;
}

// Eliminar archivo del storage
export async function deleteFile(fileUrl: string): Promise<void> {
  try {
    const filePath = extractPathFromUrl(fileUrl);
    if (!filePath) return;
    await axios.delete(
      `${env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${filePath}`,
      { headers: authHeaders() }
    );
  } catch {
    // No lanzar error si el archivo ya no existe
  }
}

function extractPathFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // URL firmada: /storage/v1/object/sign/vride-docs/{filePath}?token=...
    const match = urlObj.pathname.match(/\/storage\/v1\/object\/sign\/[^/]+\/(.+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function getExtensionFromMime(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg':  '.jpg',
    'image/png':  '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
  };
  return mimeMap[mimeType] ?? '.bin';
}

// Validar tipo de archivo permitido
export function isAllowedMimeType(mimeType: string): boolean {
  return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'].includes(mimeType);
}

// Tamaño máximo de archivo: 10MB
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
