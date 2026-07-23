// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Repository de pasajeros
// ═══════════════════════════════════════════════════════════════

import { queryOne } from '../config/database';
import { Passenger } from '@vride/shared';

// Vista JOIN de pasajero + datos base del usuario
const PASSENGER_SELECT = `
  SELECT
    u.id, u.firebase_uid, u.email, u.name, u.phone, u.phone_verified,
    u.photo_url, u.role, u.language, u.state_code, u.is_active, u.created_at, u.updated_at,
    p.rating_avg, p.total_rides, p.emergency_contact_name,
    p.emergency_contact_phone, p.stripe_customer_id,
    p.special_needs
  FROM users u
  JOIN passengers p ON p.id = u.id
`;

export const passengerRepository = {
  // Buscar pasajero completo por ID
  findById: (id: string) =>
    queryOne<Passenger>(`${PASSENGER_SELECT} WHERE u.id = $1`, [id]),

  // Buscar pasajero completo por Firebase UID
  findByFirebaseUid: (firebaseUid: string) =>
    queryOne<Passenger>(`${PASSENGER_SELECT} WHERE u.firebase_uid = $1`, [firebaseUid]),

  // Crear registro en tabla passengers (llamar después de crear user)
  create: (userId: string, emergencyContactName?: string, emergencyContactPhone?: string) =>
    queryOne<{ id: string }>(
      `INSERT INTO passengers (id, emergency_contact_name, emergency_contact_phone)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userId, emergencyContactName ?? null, emergencyContactPhone ?? null]
    ),

  // Actualizar contacto de emergencia
  updateEmergencyContact: (id: string, name: string, phone: string) =>
    queryOne<{ id: string }>(
      `UPDATE passengers
       SET emergency_contact_name = $1, emergency_contact_phone = $2
       WHERE id = $3 RETURNING id`,
      [name, phone, id]
    ),

  // Actualizar stripe_customer_id cuando se registre en Stripe
  updateStripeCustomerId: (id: string, stripeCustomerId: string) =>
    queryOne<{ id: string }>(
      'UPDATE passengers SET stripe_customer_id = $1 WHERE id = $2 RETURNING id',
      [stripeCustomerId, id]
    ),

  // Actualizar perfil de necesidades especiales (merge JSONB)
  updateSpecialNeeds: (id: string, specialNeeds: Record<string, unknown>) =>
    queryOne<{ id: string }>(
      `UPDATE passengers
       SET special_needs = special_needs || $1::jsonb
       WHERE id = $2 RETURNING id`,
      [JSON.stringify(specialNeeds), id]
    ),
};
