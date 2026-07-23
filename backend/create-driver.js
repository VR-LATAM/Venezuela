// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const p = new Pool({ connectionString: process.env.DATABASE_URL });

async function create() {
  // Borrar si ya existe
  const existing = await p.query(`SELECT id FROM users WHERE email = 'elabrador1901@gmail.com'`);
  if (existing.rows.length > 0) {
    const oldId = existing.rows[0].id;
    await p.query(`DELETE FROM drivers WHERE id = $1`, [oldId]);
    await p.query(`DELETE FROM users WHERE id = $1`, [oldId]);
    console.log('Deleted existing user');
  }

  const id = uuidv4();
  const uid = 'dev_' + id.replace(/-/g, '').slice(0, 20);

  await p.query(
    `INSERT INTO users (id, firebase_uid, email, name, phone, role, language, state_code, is_active)
     VALUES ($1, $2, $3, $4, $5, 'driver', 'en', 'TX', true)`,
    [id, uid, 'elabrador1901@gmail.com', 'Jose Labrador', '5551234567']
  );

  await p.query(
    `INSERT INTO drivers (id, state_code, referral_code) VALUES ($1, $2, $3)`,
    [id, 'TX', 'JOSE2025']
  );

  console.log('Driver created successfully. ID:', id);
  p.end();
}

create().catch(e => { console.error('Error:', e.message); p.end(); });
