// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// V-RIDE — Script de migración de base de datos
// Ejecuta todas las migraciones en orden numérico
// Uso: npm run migrate (desde /database)
// ═══════════════════════════════════════════════════════════════

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

async function runMigrations(): Promise<void> {
  const client = new Client({ connectionString: process.env['DATABASE_URL'] });

  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');

    // Crear tabla de control de migraciones si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id         SERIAL PRIMARY KEY,
        filename   VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Leer archivos .sql en orden numérico
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      // Verificar si ya fue aplicada
      const { rows } = await client.query(
        'SELECT id FROM schema_migrations WHERE filename = $1',
        [file]
      );

      if (rows.length > 0) {
        console.log(`⏭️  Saltando (ya aplicada): ${file}`);
        continue;
      }

      // Ejecutar la migración
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`⚡ Ejecutando: ${file}`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`✅ Completada: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Error en migración ${file}: ${err}`);
      }
    }

    console.log('\n🎉 Todas las migraciones completadas exitosamente');

  } catch (err) {
    console.error('❌ Error ejecutando migraciones:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
