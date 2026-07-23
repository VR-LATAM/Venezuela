// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });

p.query(`UPDATE rides SET status='cancelled_passenger' WHERE status IN ('searching','driver_assigned','driver_arriving','driver_arrived','in_progress')`)
  .then(r => { console.log('Rides cancelled:', r.rowCount); p.end(); })
  .catch(e => { console.error(e.message); p.end(); });
