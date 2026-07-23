// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sql = fs.readFileSync(
  path.join(__dirname, '../database/migrations/008_driver_preferences.sql'),
  'utf8'
);

pool.query(sql)
  .then(() => { console.log('Migration 008 applied successfully.'); pool.end(); })
  .catch(e => { console.error('Migration failed:', e.message); pool.end(); });
