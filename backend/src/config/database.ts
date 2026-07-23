// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Pool de conexiones PostgreSQL + PostGIS
// Una sola instancia compartida en todo el backend (singleton)
// ═══════════════════════════════════════════════════════════════

import { Pool, PoolClient, types } from 'pg';
import { env } from './env';
import { logger } from '../utils/logger';

// Parsear timestamp without time zone como UTC
// Por defecto node-postgres lo parsea como hora local, pero PostgreSQL lo almacena en UTC
types.setTypeParser(1114, (str: string) => new Date(str + 'Z'));

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  // Configuración para escala nacional: múltiples instancias del backend
  max: 20,           // Máximo de conexiones simultáneas por instancia
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Verificar conexión al arrancar
db.on('error', (err) => {
  logger.error('Error inesperado en el pool de PostgreSQL:', err);
});

export async function checkDatabaseConnection(): Promise<void> {
  let client: PoolClient | null = null;
  try {
    client = await db.connect();
    await client.query('SELECT 1');
    logger.info('✅ PostgreSQL conectado correctamente');
  } catch (err) {
    logger.error('❌ No se pudo conectar a PostgreSQL:', err);
    throw err;
  } finally {
    client?.release();
  }
}

// Helper para queries con parámetros — previene SQL injection
// Nunca concatenar strings en queries: usar siempre parámetros $1, $2, etc.
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await db.query(sql, params);
  return result.rows as T[];
}

// Helper para queries que devuelven un solo registro
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

// Helper para transacciones — garantiza commit/rollback automático
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
