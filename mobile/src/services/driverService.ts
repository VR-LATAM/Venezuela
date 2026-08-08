// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio de conductor (móvil) — subida de documentos y perfil
// Maneja multipart/form-data para subir fotos a Firebase Storage via backend
// ═══════════════════════════════════════════════════════════════

import * as SecureStore from 'expo-secure-store';
import { apiClient, getApiError } from './apiClient';
import { Driver } from '@vride/shared';

const API_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000';

export type DocumentType =
  | 'cedula_front'
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

export interface CertificationEntry {
  verified: boolean;
  expiry: string | null;
  doc_url: string | null;
}

export interface DriverProfileUpdate {
  // Personal
  dateOfBirth?: string;
  ssnLast4?: string;
  homeAddress?: string;
  // License
  licenseNumber?: string;
  licenseExpiry?: string;
  // Vehicle
  vehiclePlate?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  vehicleVin?: string;
  vehicleSeats?: number;
  // Insurance
  insuranceCompany?: string;
  insurancePolicyNumber?: string;
  insuranceExpiry?: string;
  // Service
  services?: string[];
  // Languages & equipment
  languages?: string[];
  specialEquipment?: string[];
  // Certifications
  certifications?: Record<string, CertificationEntry>;
  // Preferences
  smokes?: boolean;
  longDistanceAvailable?: boolean;
  musicPreference?: string;
  musicArtist?: string;
}

export const driverMobileService = {
  // ─────────────────────────────────────
  // Obtener perfil completo del conductor autenticado
  // ─────────────────────────────────────
  getProfile: async (): Promise<Driver> => {
    const response = await apiClient.get('/driver/profile');
    return response.data.data as Driver;
  },

  // ─────────────────────────────────────
  // Subir un documento al backend (multipart/form-data)
  // uri: ruta local del archivo (expo-image-picker)
  // Devuelve la URL pública del archivo en Firebase Storage
  // ─────────────────────────────────────
  uploadDocument: async (
    docType: DocumentType,
    uri: string,
    mimeType: string
  ): Promise<string> => {
    const extension = mimeType.includes('pdf') ? 'pdf'
      : mimeType.includes('png') ? 'png'
      : mimeType.includes('webp') ? 'webp'
      : 'jpg';

    const formData = new FormData();
    formData.append('file', {
      uri,
      type: mimeType,
      name: `${docType}.${extension}`,
    } as unknown as Blob);

    const token = await SecureStore.getItemAsync('access_token');
    const res = await fetch(`${API_URL}/api/v1/driver/documents/${docType}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token ?? ''}` },
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? `HTTP ${res.status}`);
    }

    const body = await res.json();
    return body.data.url as string;
  },

  // ─────────────────────────────────────
  // Actualizar datos del vehículo y licencia (sin fotos)
  // ─────────────────────────────────────
  updateProfile: async (data: DriverProfileUpdate): Promise<Driver> => {
    try {
      const response = await apiClient.patch('/driver/profile', data);
      return response.data.data as Driver;
    } catch (err) {
      throw new Error(getApiError(err));
    }
  },

  // ─────────────────────────────────────
  // Enviar todos los documentos para revisión del admin
  // Solo funciona si todos los documentos requeridos están subidos
  // ─────────────────────────────────────
  submitForReview: async (): Promise<Driver> => {
    const response = await apiClient.post('/driver/submit-review');
    return response.data.data.driver as Driver;
  },

  // ─────────────────────────────────────
  // Cambiar disponibilidad online/offline (solo si status = 'active')
  // ─────────────────────────────────────
  setOnlineStatus: async (isOnline: boolean): Promise<Record<string, unknown>> => {
    const r = await apiClient.patch('/driver/online', { isOnline });
    return r.data?.data as Record<string, unknown> ?? {};
  },

  updateLocationHTTP: async (latitude: number, longitude: number): Promise<void> => {
    await apiClient.post('/driver/location', { latitude, longitude, timestamp: Date.now() });
  },

  getAcceptanceRate: async (): Promise<{
    rides_offered: number;
    rides_accepted: number;
    acceptance_rate_pct: number;
  }> => {
    const r = await apiClient.get('/driver/acceptance-rate');
    return r.data.data;
  },

  setDailyGoal: async (goal: number | null): Promise<void> => {
    await apiClient.patch('/driver/daily-goal', { goal });
  },

  getDocumentExpiry: async (): Promise<Array<{
    document_type: string;
    expires_at: string;
    days_left: number;
    is_expired: boolean;
    urgent: boolean;
    warning: boolean;
  }>> => {
    const r = await apiClient.get('/driver/document-expiry');
    return r.data.data.alerts;
  },
};
