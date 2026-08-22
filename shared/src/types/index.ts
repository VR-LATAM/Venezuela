// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// V-RIDE — Tipos TypeScript compartidos entre backend, mobile y dashboard
// Importar desde '@vride/shared' en cualquier módulo del monorepo
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────
// ROLES DE USUARIO
// ─────────────────────────────────────
export type UserRole = 'passenger' | 'driver' | 'admin';
export type Language = 'es' | 'en';

// ─────────────────────────────────────
// TIPOS DE SERVICIO
// ─────────────────────────────────────
export type ServiceType =
  | 'motorcycle' | 'sedan' | 'suv'
  | 'scheduled' | 'hourly' | 'wait_and_return'
  | 'encomienda' | 'pickup' | 'plataforma'
  | 'carga'
  | 'cisterna' | 'grua' | 'mecanico' | 'planta_electrica' | 'tanque_gas'
  | 'baterias' | 'cauchos' | 'gasolina' | 'aire_acondicionado' | 'mudanza'
  | 'taller_mecanico';

// ─────────────────────────────────────
// ESTADOS DEL VIAJE
// ─────────────────────────────────────
export type RideStatus =
  | 'searching'
  | 'driver_assigned'
  | 'driver_arriving'
  | 'driver_arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled_passenger'
  | 'cancelled_driver'
  | 'no_driver_found'
  | 'price_negotiation';

// ─────────────────────────────────────
// ESTADOS DEL CONDUCTOR
// ─────────────────────────────────────
export type DriverStatus =
  | 'pending'
  | 'under_review'
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'rejected';

// ─────────────────────────────────────
// ESTADO DE PAGO
// ─────────────────────────────────────
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'failed';

// ─────────────────────────────────────
// COORDENADAS GPS
// ─────────────────────────────────────
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

// ─────────────────────────────────────
// ESTADO DE EE.UU.
// ─────────────────────────────────────
export interface USState {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  launched_at: string | null;
  base_fare: number;
  price_per_mile: number;
  price_per_minute: number;
  min_fare: number;
  surge_multiplier: number;
  platform_commission_percent: number;
  motorcycle_multiplier: number;
  suv_multiplier: number;
  hourly_2h_price: number;
  hourly_4h_price: number;
  hourly_8h_price: number;
  wait_per_minute_rate: number;
  wait_and_return_enabled: boolean;
  hourly_ride_enabled: boolean;
  timezone: string;
}

// ─────────────────────────────────────
// USUARIO BASE
// ─────────────────────────────────────
export interface User {
  id: string;
  firebase_uid: string;
  email: string;
  name: string;
  phone?: string;
  phone_verified: boolean;
  photo_url?: string;
  role: UserRole;
  language: Language;
  state_code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────
// PASAJERO
// ─────────────────────────────────────
export interface Passenger extends User {
  role: 'passenger';
  operative_code?: string;
  rating_avg: number;
  total_rides: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  stripe_customer_id?: string;
  special_needs: PassengerSpecialNeeds;
}

// ─────────────────────────────────────
// NECESIDADES ESPECIALES DEL PASAJERO
// ─────────────────────────────────────
export type SpecialNeedsCategory =
  | 'none'
  | 'pregnant'
  | 'wheelchair'
  | 'visual_impairment'
  | 'hearing_impairment'
  | 'elderly'
  | 'minor'
  | 'medical';

export type CommunicationMethod = 'verbal' | 'text' | 'sign_language' | 'lip_reading';

export interface PassengerSpecialNeeds {
  category: SpecialNeedsCategory;       // legacy — se mantiene por compatibilidad
  categories?: SpecialNeedsCategory[];  // selección múltiple
  needs_physical_help?: boolean;
  uses_wheelchair?: boolean;
  uses_walker?: boolean;
  uses_cane?: boolean;
  needs_ramp?: boolean;
  traveling_with_companion?: boolean;
  guide_dog?: boolean;
  communication_method?: CommunicationMethod;
  carries_medical_equipment?: boolean;
  medical_equipment_details?: string;
  needs_baby_seat?: boolean;
  can_travel_alone?: boolean;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  special_instructions?: string;
}

// ─────────────────────────────────────
// CERTIFICACIONES DEL CONDUCTOR
// ─────────────────────────────────────
export type CertificationType =
  | 'defensive_driving'
  | 'first_aid'
  | 'senior_transport'
  | 'pregnant_transport'
  | 'disability_transport'
  | 'visual_impairment'
  | 'hearing_impairment'
  | 'wheelchair_vehicle'
  | 'cpr'
  | 'medical_exam';

export interface CertificationEntry {
  verified: boolean;
  expiry: string | null;   // MM/YYYY
  doc_url: string | null;
}

export type DriverCertifications = Partial<Record<CertificationType, CertificationEntry>>;

// ─────────────────────────────────────
// CONDUCTOR
// ─────────────────────────────────────
export interface Driver extends User {
  role: 'driver';
  operative_code?: string;
  // Datos personales
  date_of_birth?: string;
  ssn_last4?: string;
  home_address?: string;
  // Licencia
  license_number?: string;
  license_expiry?: string;
  // Vehículo
  vehicle_plate?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_color?: string;
  vehicle_vin?: string;
  vehicle_seats?: number;
  // Seguro
  insurance_company?: string;
  insurance_policy_number?: string;
  insurance_expiry?: string;
  // Servicio y estado
  services: ServiceType[];
  status: DriverStatus;
  is_online: boolean;
  current_location?: GeoPoint;
  last_location_at?: string;
  current_state_code?: string;
  // Métricas
  rating_avg: number;
  total_rides: number;
  rides_this_month: number;
  rides_offered?: number;
  rides_accepted?: number;
  consecutive_rejections?: number;
  total_earned: number;
  available_balance: number;
  // Certificaciones, idiomas, equipo
  certifications: DriverCertifications;
  languages: string[];
  special_equipment: string[];
  // Preferencias
  smokes: boolean;
  long_distance_available: boolean;
  music_preference: string;
  music_artist?: string;
  // Documentos (URLs en Supabase Storage)
  license_front_url?: string;
  license_back_url?: string;
  vehicle_photo_front_url?: string;
  vehicle_photo_back_url?: string;
  vehicle_photo_left_url?: string;
  vehicle_photo_right_url?: string;
  vehicle_interior_url?: string;
  insurance_doc_url?: string;
  accessible_cert_url?: string;
  // Pagos y referidos
  referral_code?: string;
  stripe_account_id?: string;
  stripe_account_verified: boolean;
}

// ─────────────────────────────────────
// VIAJE
// ─────────────────────────────────────
export interface Ride {
  id: string;
  passenger_id: string;
  driver_id?: string;
  state_code?: string;
  service_type: ServiceType;
  status: RideStatus;
  pickup_address: string;
  pickup_location: GeoPoint;
  dropoff_address: string;
  dropoff_location: GeoPoint;
  search_max_radius_km: number;
  scheduled_at?: string;
  driver_assigned_at?: string;
  driver_arrived_pickup_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  distance_km?: number;
  duration_minutes?: number;
  base_fare?: number;
  distance_fare?: number;
  time_fare?: number;
  surge_multiplier: number;
  service_multiplier: number;
  cancellation_fee: number;
  subtotal?: number;
  platform_commission?: number;
  driver_earnings?: number;
  total_charged?: number;
  payment_status: PaymentStatus;
  route_polyline?: string;
  created_at: string;
  // Wait & Return
  return_address?: string;
  return_location?: GeoPoint;
  estimated_wait_minutes?: number;
  wait_started_at?: string;
  wait_ended_at?: string;
  wait_minutes?: number;
  wait_fare?: number;
  // Hourly
  hourly_package_hours?: number;
  // Encomienda / Delivery
  package_description?: string;
  package_size?: 'small' | 'medium' | 'large';
  recipient_name?: string;
  recipient_phone?: string;
  delivery_vehicle?: string;
  initial_estimated_fare?: number;
  // Carga — negociación de precio
  offered_price?: number;
  counter_price?: number;
  counter_reason?: string;
  counter_driver_id?: string;
  // Relaciones populadas (para UI)
  passenger?: Passenger;
  driver?: Driver;
}

// ─────────────────────────────────────
// ESTIMACIÓN DE TARIFA (antes de confirmar el viaje)
// ─────────────────────────────────────
export interface FareEstimate {
  service_type: ServiceType;
  base_fare: number;
  distance_fare: number;
  time_fare: number;
  surge_multiplier: number;
  service_multiplier: number;
  subtotal: number;
  total: number;
  distance_km: number;
  duration_minutes: number;
  driver_eta_minutes?: number;
  // Wait & Return
  wait_fare_estimate?: number;
  wait_per_minute_rate?: number;
  // Hourly
  hourly_package_hours?: number;
  // Dual currency (Venezuela)
  total_ves?: number;
  exchange_rate_ves?: number;
}

// ─────────────────────────────────────
// CONDUCTOR CERCANO (para mostrar en mapa del pasajero)
// ─────────────────────────────────────
export interface NearbyDriver {
  id: string;
  name: string;
  photo_url?: string;
  rating_avg: number;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  vehicle_plate?: string;
  services: ServiceType[];
  current_location: GeoPoint;
  distance_km: number;    // Distancia al pasajero
  eta_minutes: number;    // Tiempo estimado de llegada
}

// ─────────────────────────────────────
// CALIFICACIÓN
// ─────────────────────────────────────
export interface Rating {
  id: string;
  ride_id: string;
  rater_id: string;
  rated_id: string;
  rater_role: 'passenger' | 'driver';
  score: number;
  comment?: string;
  created_at: string;
}

// ─────────────────────────────────────
// GANANCIAS DEL CONDUCTOR
// ─────────────────────────────────────
export type EarningType = 'ride' | 'referral_bonus' | 'performance_bonus' | 'quality_bonus' | 'correction';

export interface DriverEarning {
  id: string;
  driver_id: string;
  ride_id?: string;
  type: EarningType;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  description?: string;
  created_at: string;
}

// ─────────────────────────────────────
// RETIRO
// ─────────────────────────────────────
export interface DriverWithdrawal {
  id: string;
  driver_id: string;
  amount: number;
  status: WithdrawalStatus;
  stripe_transfer_id?: string;
  failure_reason?: string;
  requested_at: string;
  completed_at?: string;
}

// ─────────────────────────────────────
// REFERIDO
// ─────────────────────────────────────
export type ReferralStatus = 'pending' | 'in_progress' | 'completed' | 'paid';

export interface Referral {
  id: string;
  referrer_driver_id: string;
  referred_driver_id: string;
  bonus_amount: number;
  referred_bonus: number;
  rides_required: number;
  rides_completed: number;
  first_ride_bonus_paid: boolean;
  status: ReferralStatus;
  completed_at?: string;
  paid_at?: string;
  created_at: string;
  // Relaciones populadas
  referred_driver?: Pick<Driver, 'id' | 'name' | 'photo_url' | 'total_rides'>;
}

// ─────────────────────────────────────
// EVENTO SOS
// ─────────────────────────────────────
export interface SOSEvent {
  id: string;
  ride_id?: string;
  triggered_by: string;
  triggered_by_role: 'passenger' | 'driver';
  location?: GeoPoint;
  address_at_trigger?: string;
  status: 'active' | 'resolved' | 'false_alarm';
  notes?: string;
  resolved_at?: string;
  created_at: string;
}

// ─────────────────────────────────────
// RESPUESTA ESTÁNDAR DEL API
// Todos los endpoints devuelven este formato
// ─────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;      // Código de error interno (ej: 'NO_DRIVER_FOUND', 'INVALID_TOKEN')
  message?: string;   // Mensaje amigable para mostrar al usuario
}

// ─────────────────────────────────────
// PAGINACIÓN
// ─────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ─────────────────────────────────────
// EVENTOS DE WEBSOCKET (tiempo real)
// ─────────────────────────────────────
export type SocketEvent =
  // Conductor → Servidor
  | 'driver:location_update'      // Conductor envía nueva posición GPS
  | 'driver:status_change'        // Conductor cambia a online/offline
  | 'driver:ride_response'        // Conductor acepta o rechaza solicitud

  // Servidor → Conductor
  | 'driver:new_ride_request'     // Nueva solicitud de viaje para el conductor
  | 'driver:ride_cancelled'       // Pasajero canceló el viaje
  | 'driver:passenger_message'    // Mensaje del pasajero

  // Servidor → Pasajero
  | 'passenger:driver_assigned'   // Conductor asignado al viaje
  | 'passenger:driver_location'   // Actualización de posición del conductor
  | 'passenger:driver_arrived'    // Conductor llegó al punto de recogida
  | 'passenger:ride_started'      // Viaje iniciado
  | 'passenger:ride_completed'    // Viaje completado
  | 'passenger:driver_message'    // Mensaje del conductor
  | 'passenger:search_radius'     // Radio de búsqueda ampliado

  // Servidor → Admin Dashboard
  | 'admin:driver_online'         // Conductor se conectó
  | 'admin:driver_offline'        // Conductor se desconectó
  | 'admin:driver_location'       // Posición actualizada de cualquier conductor
  | 'admin:ride_created'          // Nuevo viaje creado
  | 'admin:ride_status_changed'   // Estado de viaje cambió
  | 'admin:sos_triggered';        // Botón SOS activado — PRIORIDAD MÁXIMA

export interface DriverLocationUpdate {
  driver_id: string;
  latitude: number;
  longitude: number;
  heading?: number;    // Dirección de movimiento (grados)
  speed?: number;      // Velocidad en km/h
  timestamp: number;   // Unix timestamp
}
