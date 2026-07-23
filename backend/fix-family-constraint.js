// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://vride:vride123@localhost:5432/vride'
});

async function run() {
  try {
    // Eliminar el constraint viejo y crear uno nuevo que incluya 'family'
    await pool.query(`
      ALTER TABLE rides
      DROP CONSTRAINT IF EXISTS rides_service_type_check
    `);

    await pool.query(`
      ALTER TABLE rides
      ADD CONSTRAINT rides_service_type_check
      CHECK (service_type IN ('standard', 'family', 'executive', 'accessible', 'scheduled', 'hourly'))
    `);

    console.log('✅ Constraint actualizado correctamente.');

    // Verificar
    const check = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conname = 'rides_service_type_check'
    `);
    console.log('Nuevo constraint:', check.rows[0]?.definition);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    pool.end();
  }
}

run();
