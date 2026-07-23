// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// V-RIDE — Script de seeds (datos de prueba)
// Uso: npm run seed (desde /database)
// ⚠️  SOLO para entorno de desarrollo — NO ejecutar en producción
// ═══════════════════════════════════════════════════════════════

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const SEEDS_DIR = path.join(__dirname, '../seeds');

async function runSeeds(): Promise<void> {
  if (process.env['NODE_ENV'] === 'production') {
    console.error('❌ No se pueden ejecutar seeds en producción');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env['DATABASE_URL'] });

  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');
    console.log('⚠️  ATENCIÓN: Insertando datos de prueba (entorno de desarrollo)');

    const files = fs.readdirSync(SEEDS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(SEEDS_DIR, file), 'utf8');
      console.log(`🌱 Ejecutando seed: ${file}`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`✅ Seed completado: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Error en seed ${file}: ${err}`);
      }
    }

    console.log('\n🎉 Todos los seeds completados');
    console.log('📊 Datos disponibles:');
    console.log('   • 1 administrador (admin@vride.app)');
    console.log('   • 5 conductores activos en Texas');
    console.log('   • 10 pasajeros en Texas');
    console.log('   • 5+ viajes completados con calificaciones y ganancias');

  } catch (err) {
    console.error('❌ Error ejecutando seeds:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSeeds();
