// Script temporal para aplicar migraciones desde la terminal
// Uso: node database/run-migration.js <número>
// Ejemplo: node database/run-migration.js 016
// ─────────────────────────────────────────────────────────────
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const migrationNum = process.argv[2];
if (!migrationNum) {
  console.error('Usage: node database/run-migration.js <número>');
  process.exit(1);
}

const files = fs.readdirSync(__dirname + '/migrations')
  .filter(f => f.startsWith(migrationNum));

if (files.length === 0) {
  console.error(`No se encontró migración que empiece con ${migrationNum}`);
  process.exit(1);
}

const sqlFile = path.join(__dirname, 'migrations', files[0]);
const sql = fs.readFileSync(sqlFile, 'utf8');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL no configurado');
  process.exit(1);
}

async function run() {
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log(`✅ Conectado a la base de datos`);
    console.log(`📄 Aplicando: ${files[0]}`);
    await client.query(sql);
    console.log(`✅ Migración ${files[0]} aplicada correctamente`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
