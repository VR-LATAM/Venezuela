import { readFileSync } from 'fs';
import pg from 'pg';
const { Client } = pg;

const files = [
  'database/migrations/venezuela/005_ve_adapt_training_modules.sql',
  'database/migrations/venezuela/004_ve_training_modules.sql',
  'database/migrations/venezuela/006_ve_sedan_suv_modules.sql',
];

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
console.log('Conectado a la base de datos.');

for (const file of files) {
  const sql = readFileSync(file, 'utf8');
  try {
    await client.query(sql);
    console.log(`OK: ${file}`);
  } catch (e) {
    console.error(`ERROR en ${file}: ${e.message}`);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log('Todas las migraciones ejecutadas correctamente.');
