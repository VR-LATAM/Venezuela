// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Repository de usuarios — solo queries SQL, sin lógica de negocio
// ═══════════════════════════════════════════════════════════════

import { query, queryOne } from '../config/database';
import { User, UserRole } from '@vride/shared';

export interface CreateUserParams {
  firebase_uid: string;
  email: string;
  name: string;
  phone?: string;
  phone_verified?: boolean;
  photo_url?: string;
  role: UserRole;
  language?: string;
  state_code?: string;
}

export const userRepository = {
  // Buscar usuario por Firebase UID (usado al login)
  findByFirebaseUid: (firebaseUid: string) =>
    queryOne<User>(
      'SELECT * FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    ),

  // Buscar usuario por email
  findByEmail: (email: string) =>
    queryOne<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    ),

  // Buscar usuario por ID interno
  findById: (id: string) =>
    queryOne<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    ),

  // Crear usuario base (insert en tabla users)
  create: (params: CreateUserParams) =>
    queryOne<User>(
      `INSERT INTO users (firebase_uid, email, name, phone, phone_verified, photo_url, role, language, state_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        params.firebase_uid,
        params.email,
        params.name,
        params.phone ?? null,
        params.phone_verified ?? false,
        params.photo_url ?? null,
        params.role,
        params.language ?? 'es',
        params.state_code ?? null,
      ]
    ),

  // Actualizar datos básicos del perfil
  update: (id: string, fields: Partial<Pick<User, 'name' | 'phone' | 'phone_verified' | 'photo_url' | 'language' | 'state_code'>>) => {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    // Construir el SET dinámicamente con solo los campos enviados
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        setClauses.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (setClauses.length === 0) return Promise.resolve(null);

    values.push(id);
    return queryOne<User>(
      `UPDATE users SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`,
      values
    );
  },

  // Desactivar cuenta (no eliminamos — mantenemos historial)
  deactivate: (id: string) =>
    queryOne<User>(
      'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    ),

  // Verificar si existe un firebase_uid o email (para registro)
  existsByFirebaseUidOrEmail: async (firebaseUid: string, email: string): Promise<boolean> => {
    const rows = await query<{ count: string }>(
      'SELECT COUNT(*)::text as count FROM users WHERE firebase_uid = $1 OR email = $2',
      [firebaseUid, email]
    );
    return parseInt(rows[0]?.count ?? '0') > 0;
  },
};
