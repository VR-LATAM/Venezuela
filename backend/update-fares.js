// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://vride:vride123@localhost:5432/vride'
});

async function run() {
  try {
    // Agregar columna family_multiplier si no existe
    await pool.query(`
      ALTER TABLE us_states
      ADD COLUMN IF NOT EXISTS family_multiplier NUMERIC(4,2) DEFAULT 1.50
    `);

    // Actualizar precios para TX
    const result = await pool.query(`
      UPDATE us_states SET
        base_fare             = 1.50,
        price_per_mile        = 0.82,
        price_per_minute      = 0.19,
        min_fare              = 5.00,
        family_multiplier     = 1.50,
        executive_multiplier  = 1.40,
        accessible_multiplier = 1.15,
        surge_multiplier      = 1.50,
        hourly_2h_price       = 45.00
      WHERE code = 'TX'
    `);

    console.log('✅ Precios actualizados. Filas modificadas:', result.rowCount);

    // Verificar
    const check = await pool.query(`
      SELECT code, base_fare, price_per_mile, price_per_minute, min_fare,
             family_multiplier, executive_multiplier, accessible_multiplier
      FROM us_states WHERE code = 'TX'
    `);
    console.log('Valores en BD:', check.rows[0]);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    pool.end();
  }
}

run();
