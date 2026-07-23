// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://vride:vride123@localhost:5432/vride'
});

async function run() {
  try {
    const result = await pool.query(`
      UPDATE drivers SET
        services = ARRAY['standard','family','executive','accessible','scheduled','hourly']::varchar[],
        status = 'active'
      WHERE id = (SELECT id FROM users WHERE email = 'elabrador1901@gmail.com')
    `);

    if (result.rowCount === 0) {
      console.log('❌ No se encontró el conductor con ese email.');
    } else {
      console.log('✅ Conductor actualizado correctamente.');

      const check = await pool.query(`
        SELECT u.email, d.status, d.services
        FROM drivers d
        JOIN users u ON u.id = d.id
        WHERE u.email = 'elabrador1901@gmail.com'
      `);
      console.log('Datos actualizados:', check.rows[0]);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    pool.end();
  }
}

run();
