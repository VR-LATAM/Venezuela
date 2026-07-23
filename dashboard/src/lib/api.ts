// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
// Cliente HTTP para el backend V-Ride
// Adjunta automáticamente el JWT de NextAuth en cada petición

import axios from 'axios';
import { getSession } from 'next-auth/react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export const api = axios.create({ baseURL: BASE_URL });

// Interceptor: inyecta token de sesión
api.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

// ─── Tipos de respuesta ───────────────────────────────────────────────────────

export interface Driver {
  id:              string;
  name:            string;
  email:           string;
  phone:           string;
  state_code:      string;
  status:          string;
  rating_avg:      number;
  total_rides:     number;
  vehicle_brand:   string;
  vehicle_model:   string;
  vehicle_color:   string;
  vehicle_plate:   string;
  created_at:      string;
}

export interface Ride {
  id:                   string;
  status:               string;
  service_type:         string;
  state_code:           string;
  pickup_address:       string;
  dropoff_address:      string;
  total_charged:        number;
  driver_earnings:      number;
  platform_commission:  number;
  distance_km:          number;
  duration_minutes:     number;
  payment_status:       string;
  created_at:           string;
  completed_at:         string | null;
  passenger_name:       string;
  driver_name:          string | null;
}

export interface KPIs {
  ridesToday:     number;
  ridesWeek:      number;
  ridesMonth:     number;
  revenueToday:   number;
  revenueMonth:   number;
  activeDrivers:  number;
  avgRating:      number;
  cancelRate:     number;
}

export interface KPIsRaw {
  ridesTotal?:        { today?: number; thisWeek?: number; thisMonth?: number };
  revenue?:           { today?: number; thisMonth?: number };
  activeDrivers?:     number;
  avgPassengerRating?: number;
  cancellationRate?:  number;
}

export interface OnlineDriver {
  driverId:   string;
  latitude:   number;
  longitude:  number;
  heading?:   number;
  speed?:     number;
  name?:      string;
  vehicle?:   string;
  rating?:    number;
}

export interface SOSEvent {
  id:           string;
  ride_id:      string | null;
  passenger_id: string;
  passenger_name: string;
  latitude:     number | null;
  longitude:    number | null;
  status:       string;
  created_at:   string;
}

export interface HeatPoint { lat: number; lng: number; weight: number; }

export interface DriverTrainingModuleProgress {
  module_id:       number;
  code:            string;
  title:           string;
  passing_score:   number;
  total_questions: number;
  order_index:     number;
  is_required:     boolean;
  progress: {
    status:      'not_started' | 'reading' | 'passed' | 'failed';
    attempts:    number;
    last_score:  number | null;
    passed_at:   string | null;
    expires_at:  string | null;
  } | null;
}

export interface DriverTrainingStatus {
  modules:    DriverTrainingModuleProgress[];
  completed:  number;
  total:      number;
  isComplete: boolean;
}

// ─── Funciones helper ─────────────────────────────────────────────────────────

export const adminApi = {
  // Conductores
  listDrivers:       (params?: Record<string, unknown>) => api.get('/admin/drivers', { params }),
  pendingReview:     (params?: Record<string, unknown>) => api.get('/admin/drivers/pending-review', { params }),
  getDriver:         (id: string) => api.get(`/admin/drivers/${id}`),
  getDriverTraining: (id: string) => api.get<{ data: DriverTrainingStatus }>(`/admin/drivers/${id}/training`),
  approveDriver:     (id: string) => api.post(`/admin/drivers/${id}/approve`),
  rejectDriver:  (id: string, reason: string) => api.post(`/admin/drivers/${id}/reject`, { reason }),
  suspendDriver: (id: string, reason: string) => api.post(`/admin/drivers/${id}/suspend`, { reason }),
  reactivateDriver: (id: string) => api.post(`/admin/drivers/${id}/reactivate`),
  onlineDriversMap: () => api.get<{ data: { drivers: OnlineDriver[]; count: number } }>('/admin/drivers/online-map'),

  // Viajes
  listRides: (params?: Record<string, unknown>) => api.get('/admin/rides', { params }),

  // Finanzas
  financeSummary: (days = 30) => api.get('/admin/finance', { params: { days } }),

  // Tarifas
  listFares:  () => api.get('/admin/fares'),
  updateFare: (stateCode: string, data: Record<string, number>) =>
    api.put(`/admin/fares/${stateCode}`, data),

  // Pasajeros
  listPassengers: (params?: Record<string, unknown>) => api.get('/admin/passengers', { params }),

  // SOS
  listActiveSOS: () => api.get('/sos/active'),
  resolveSOS:    (id: string, resolution: string) =>
    api.post(`/sos/${id}/resolve`, { resolution }),

  // Analytics
  kpis:          () => api.get<{ data: KPIsRaw }>('/analytics/kpis'),
  demandHeatmap: (hours = 6, stateCode?: string) =>
    api.get<{ data: { points?: HeatPoint[]; heatmap?: HeatPoint[] } }>('/analytics/demand', { params: { hours, stateCode } }),
  surgeStatus:   () => api.get('/analytics/surge-status'),

  // Notificaciones masivas
  sendCampaign: (data: { title: string; body: string; topic: string }) =>
    api.post('/notification/campaign', data),

  // Referidos
  leaderboard: () => api.get('/referral/leaderboard'),

  // Clínicas (admin)
  listClinics:        ()                                   => api.get('/admin/clinics'),
  createClinic:       (data: Record<string, unknown>)      => api.post('/admin/clinics', data),
  resetClinicPassword:(id: string, password: string)       => api.patch(`/admin/clinics/${id}/reset-password`, { password }),
  toggleClinic:       (id: string, is_active: boolean)     => api.patch(`/admin/clinics/${id}/toggle`, { is_active }),
  clinicAllRequests:  ()                                   => api.get('/admin/clinics/all-requests'),
  clinicPending:      ()                                   => api.get('/admin/clinics/pending-requests'),
  linkRide:           (reqId: string, ride_id: string)     => api.patch(`/admin/clinics/requests/${reqId}/link`, { ride_id }),
};

// ─── Clinic portal (autenticado con token propio en localStorage) ─────────────

function getClinicToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('clinic_token');
}

const clinicHttp = axios.create({ baseURL: BASE_URL });
clinicHttp.interceptors.request.use((config) => {
  const token = getClinicToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface ClinicAccount {
  id:            string;
  name:          string;
  address:       string | null;
  contact_name:  string | null;
  contact_email: string | null;
  contact_phone: string | null;
  billing_code:  string | null;
  plan:          string;
  is_active:     boolean;
  api_key:       string;
  total_requests?:   number;
  pending_requests?: number;
  created_at:    string;
}

export interface ClinicRequest {
  id:              string;
  clinic_id:       string;
  patient_name:    string;
  patient_phone:   string | null;
  pickup_address:  string;
  dropoff_address: string;
  scheduled_at:    string;
  service_type:    string;
  notes:           string | null;
  diagnosis_code:  string | null;
  ride_id:         string | null;
  status:          string;
  clinic_name?:    string;
  created_at:      string;
}

export interface ClinicStats {
  total:     number;
  pending:   number;
  scheduled: number;
  completed: number;
  cancelled: number;
}

export const clinicApi = {
  login:         (email: string, password: string) =>
    clinicHttp.post<{ data: { token: string; clinic: ClinicAccount } }>('/clinic/auth/login', { email, password }),
  me:            () => clinicHttp.get<{ data: { clinic: ClinicAccount } }>('/clinic/me'),
  stats:         () => clinicHttp.get<{ data: { stats: ClinicStats } }>('/clinic/stats'),
  getRequests:   () => clinicHttp.get<{ data: { requests: ClinicRequest[] } }>('/clinic/requests'),
  createRequest: (data: Record<string, unknown>) =>
    clinicHttp.post<{ data: { request: ClinicRequest } }>('/clinic/request', data),
  cancelRequest: (id: string) => clinicHttp.patch(`/clinic/requests/${id}/cancel`),
};
