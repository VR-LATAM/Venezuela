// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query("UPDATE users SET role='passenger' WHERE email='edwardlabrador@gmail.com'")
  .then(r => {
    console.log('Updated rows:', r.rowCount);
    pool.end();
  })
  .catch(e => {
    console.error('Error:', e.message);
    pool.end();
  });
