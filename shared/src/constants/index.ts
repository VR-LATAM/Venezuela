// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// VERONA RIDE — Constantes de negocio compartidas
// Valores por defecto — la configuración real viene de la BD (us_states)
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────
// TARIFAS BASE (Texas — valores por defecto)
// Configurables por estado desde el dashboard admin
// ─────────────────────────────────────
export const FARE_DEFAULTS = {
  BASE_FARE: 3.00,           // Cargo base al iniciar el viaje
  PRICE_PER_KM: 1.20,        // Por kilómetro recorrido
  PRICE_PER_MINUTE: 0.25,    // Por minuto de viaje
  MIN_FARE: 6.00,            // Precio mínimo por viaje
  SURGE_PEAK: 1.5,           // Multiplicador horas pico (12-2pm, 6-9pm)
  EXECUTIVE_MULTIPLIER: 1.8, // Servicio ejecutivo
  ACCESSIBLE_MULTIPLIER: 1.4,// Servicio accesible
  HOURLY_2H: 45.00,          // Servicio por horas — 2 horas
  HOURLY_4H: 80.00,          // Servicio por horas — 4 horas
  HOURLY_8H: 140.00,         // Servicio por horas — 8 horas
} as const;

// ─────────────────────────────────────
// COMISIÓN DE LA PLATAFORMA
// ─────────────────────────────────────
export const PLATFORM = {
  COMMISSION_PERCENT: 13,     // Verona Ride retiene 13%
  DRIVER_PERCENT: 87,         // Conductor recibe 87%
} as const;

// ─────────────────────────────────────
// BÚSQUEDA DE CONDUCTORES — RADIO DINÁMICO NACIONAL
// Sin geofencing: funciona en cualquier coordenada de EE.UU.
// ─────────────────────────────────────
export const DRIVER_SEARCH = {
  INITIAL_RADIUS_KM: 10,      // Primer intento: 10km del pasajero
  STEPS: [10, 20, 40, 80, 150], // Pasos de ampliación progresiva
  MAX_RADIUS_KM: 150,         // Máximo en zonas rurales (West Texas, Panhandle)
  ACCEPT_TIMEOUT_SECONDS: 30, // Tiempo para que el conductor acepte o rechace
  MAX_CONSECUTIVE_REJECTIONS: 3, // Advertencia al superar este número
} as const;

// ─────────────────────────────────────
// CANCELACIÓN
// ─────────────────────────────────────
export const CANCELLATION = {
  FREE_WINDOW_MINUTES: 2,     // Primeros 2 minutos: cancelación gratis
  FEE_USD: 3.00,              // Cargo por cancelar después de 2 minutos
} as const;

// ─────────────────────────────────────
// RETIROS DE CONDUCTORES
// ─────────────────────────────────────
export const WITHDRAWALS = {
  MIN_AMOUNT_USD: 10.00,      // Mínimo para solicitar retiro
  PROCESSING_DAYS: 2,         // 24-48 horas hábiles
} as const;

// ─────────────────────────────────────
// PROGRAMA DE REFERIDOS
// ─────────────────────────────────────
export const REFERRAL = {
  REFERRER_BONUS_USD: 600.00, // Bono para quien refiere ($600)
  REFERRED_BONUS_USD: 50.00,  // Bono para el referido ($50) — primer viaje completado
  RIDES_REQUIRED: 50,         // El referido debe completar 50 viajes
} as const;

// ─────────────────────────────────────
// BONOS DE PERFORMANCE
// ─────────────────────────────────────
export const PERFORMANCE_BONUSES = {
  QUALITY_MIN_RATING: 4.8,    // Calificación mínima para bono por calidad
  QUALITY_BONUS_PER_RIDE: 0.50, // +$0.50 por viaje con calificación ≥ 4.8
  MONTHLY_RIDES_THRESHOLD: 100, // 100+ viajes este mes
  MONTHLY_BONUS_USD: 50.00,   // Bono mensual por 100+ viajes
} as const;

// ─────────────────────────────────────
// GPS Y TRACKING EN TIEMPO REAL
// ─────────────────────────────────────
export const GPS = {
  UPDATE_INTERVAL_MS: 4000,   // Conductor envía posición cada 4 segundos
  REDIS_TTL_SECONDS: 10,      // TTL en Redis — si no hay update en 10s, se considera offline
  ETA_RECALC_INTERVAL_MS: 30000, // ETA se recalcula cada 30 segundos con Google Directions
} as const;

// ─────────────────────────────────────
// COLORES DE MARCA V-RIDE
// ─────────────────────────────────────
export const BRAND_COLORS = {
  PRIMARY: '#1A73E8',    // Azul — confianza, profesionalismo
  ACCENT: '#34A853',     // Verde — disponibilidad, éxito, en línea
  ALERT: '#EA4335',      // Rojo — SOS, error, urgencia
  NEUTRAL: '#F8F9FA',    // Fondo gris suave
  TEXT: '#202124',       // Casi negro — alta legibilidad
  DARK_BG: '#121212',    // Fondo modo oscuro
  DARK_TEXT: '#E8EAED',  // Texto modo oscuro
} as const;

// ─────────────────────────────────────
// ACCESIBILIDAD (nicho adultos mayores)
// ─────────────────────────────────────
export const ACCESSIBILITY = {
  MIN_FONT_SIZE: 17,           // px — mayor al estándar de 14-16px
  MIN_BUTTON_HEIGHT: 56,       // px — fácil de presionar con artritis
  ANIMATION_DURATION_MS: 300,  // Animaciones suaves en transiciones
} as const;

// ─────────────────────────────────────
// HORAS PICO (surge pricing automático)
// ─────────────────────────────────────
export const PEAK_HOURS = [
  { start: 12, end: 14 },   // 12pm - 2pm
  { start: 18, end: 21 },   // 6pm - 9pm
] as const;

// ─────────────────────────────────────
// ESTADOS HABILITADOS AL LANZAMIENTO
// ─────────────────────────────────────
export const LAUNCH_STATE = 'TX' as const;
