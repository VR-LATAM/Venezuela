import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const sql = `
  ALTER TYPE service_type_enum ADD VALUE IF NOT EXISTS 'motorcycle';
  ALTER TYPE service_type_enum ADD VALUE IF NOT EXISTS 'sedan';
  ALTER TYPE service_type_enum ADD VALUE IF NOT EXISTS 'suv';
`;

/* ALTER TYPE ADD VALUE no puede correr dentro de un bloque de transacción */
for (const stmt of sql.trim().split(';').map(s => s.trim()).filter(Boolean)) {
  await client.query(stmt);
  console.log('OK:', stmt);
}

await client.query(`UPDATE training_modules SET service_type = 'motorcycle' WHERE code = 'VE-MOTO-001'`);
await client.query(`UPDATE training_modules SET service_type = 'sedan'      WHERE code = 'VE-SEDAN-001'`);
await client.query(`UPDATE training_modules SET service_type = 'suv'        WHERE code = 'VE-SUV-001'`);
console.log('OK: service_type actualizado en los 3 módulos Venezuela');

const r = await client.query(`SELECT code, service_type, is_prerequisite FROM training_modules ORDER BY order_index`);
r.rows.forEach(row => console.log(' ', row.code, '→ service_type:', row.service_type, '| is_prerequisite:', row.is_prerequisite));

await client.end();
