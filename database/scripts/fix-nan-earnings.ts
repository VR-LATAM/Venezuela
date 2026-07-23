// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Script de reparación de ganancias
// 1. Backfill driver_earnings desde rides completados (si no existe la fila)
// 2. Recalcular total_earned / available_balance en drivers
// Uso: npm run fix-nan-earnings
// ═══════════════════════════════════════════════════════════════

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const client = new Client({ connectionString: process.env['DATABASE_URL'] });

async function run(): Promise<void> {
  await client.connect();
  console.log('✅ Conectado a PostgreSQL\n');

  // ─────────────────────────────────────
  // 1. Backfill driver_earnings desde rides
  //    Inserta filas que faltan (ON CONFLICT skip)
  // ─────────────────────────────────────
  console.log('📋 Paso 1: backfill driver_earnings desde rides completados...');

  const { rowCount: inserted } = await client.query(
    `INSERT INTO driver_earnings (driver_id, ride_id, type, gross_amount, platform_fee, net_amount, description)
     SELECT
       r.driver_id,
       r.id           AS ride_id,
       'ride'         AS type,
       CASE WHEN r.total_charged IS NULL OR r.total_charged::text = 'NaN'
            THEN 0 ELSE r.total_charged END                            AS gross_amount,
       CASE WHEN r.platform_commission IS NULL OR r.platform_commission::text = 'NaN'
            THEN 0 ELSE r.platform_commission END                      AS platform_fee,
       CASE WHEN r.driver_earnings IS NULL OR r.driver_earnings::text = 'NaN'
            THEN 0 ELSE r.driver_earnings END                          AS net_amount,
       'Ganancia por viaje completado (backfill)'                      AS description
     FROM rides r
     WHERE r.status = 'completed'
       AND r.driver_id IS NOT NULL
       AND r.driver_earnings IS NOT NULL
       AND r.driver_earnings::text != 'NaN'
       AND NOT EXISTS (
         SELECT 1 FROM driver_earnings de
         WHERE de.ride_id = r.id AND de.driver_id = r.driver_id AND de.type = 'ride'
       )`
  );
  console.log(`   ✅ ${inserted ?? 0} fila(s) insertadas en driver_earnings\n`);

  // ─────────────────────────────────────
  // 2. Recalcular totales en tabla drivers
  //    Para TODOS los conductores con NaN o desincronizados
  // ─────────────────────────────────────
  console.log('📋 Paso 2: recalcular total_earned / available_balance...');

  // Conductores con NaN o que tengan discrepancia con driver_earnings
  const { rows: targets } = await client.query<{ id: string; name: string }>(
    `SELECT d.id, u.name
     FROM drivers d
     JOIN users u ON u.id = d.id
     WHERE d.total_earned::text = 'NaN'
        OR d.available_balance::text = 'NaN'`
  );

  if (targets.length === 0) {
    console.log('   ✅ No hay conductores con NaN\n');
  } else {
    for (const driver of targets) {
      const { rows } = await client.query<{ total: string; withdrawn: string }>(
        `SELECT
           COALESCE(SUM(de.net_amount) FILTER (WHERE de.net_amount::text != 'NaN'), 0)::text AS total,
           COALESCE(
             (SELECT SUM(dw.amount)
              FROM driver_withdrawals dw
              WHERE dw.driver_id = $1
                AND dw.status IN ('completed','processing')),
             0
           )::text AS withdrawn
         FROM driver_earnings de
         WHERE de.driver_id = $1`,
        [driver.id]
      );

      const totalEarned     = parseFloat(rows[0].total);
      const withdrawn       = parseFloat(rows[0].withdrawn);
      const availableBalance = Math.max(0, totalEarned - withdrawn);

      await client.query(
        `UPDATE drivers
         SET total_earned      = $2,
             available_balance = $3,
             updated_at        = NOW()
         WHERE id = $1`,
        [driver.id, totalEarned, availableBalance]
      );

      console.log(`   ✅ ${driver.name}: earned=$${totalEarned.toFixed(2)}, available=$${availableBalance.toFixed(2)}`);
    }
  }

  // ─────────────────────────────────────
  // 3. También corregir total_rides desincronizado
  // ─────────────────────────────────────
  console.log('\n📋 Paso 3: corregir total_rides desincronizado...');

  const { rowCount: ridesFixed } = await client.query(
    `UPDATE drivers d
     SET total_rides      = (SELECT COUNT(*) FROM rides r WHERE r.driver_id = d.id AND r.status = 'completed'),
         rides_this_month = (SELECT COUNT(*) FROM rides r WHERE r.driver_id = d.id AND r.status = 'completed'
                              AND r.completed_at >= date_trunc('month', NOW())),
         updated_at       = NOW()
     WHERE d.id IN (
       SELECT d2.id FROM drivers d2
       WHERE d2.total_earned::text = 'NaN' OR d2.available_balance::text = 'NaN'
       UNION
       SELECT r.driver_id FROM rides r WHERE r.status = 'completed' AND r.driver_id IS NOT NULL
       EXCEPT
       SELECT de.driver_id FROM driver_earnings de
     )`
  );
  console.log(`   ✅ ${ridesFixed ?? 0} conductor(es) con métricas actualizadas`);

  console.log('\n🎉 Reparación completada');
  await client.end();
}

run().catch(err => {
  console.error('❌ Error:', err);
  client.end();
  process.exit(1);
});
