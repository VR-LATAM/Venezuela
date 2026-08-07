// Script: Limpia usuarios de prueba y crea 3 conductores + 3 pasajeros nuevos
// Ejecutar: node database/scripts/reset-test-users.js

require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🧹 Eliminando usuarios existentes (no admin)...');
    const deleted = await client.query(
      `DELETE FROM users WHERE role IN ('passenger', 'driver') RETURNING email`
    );
    console.log(`   → ${deleted.rowCount} usuario(s) eliminado(s)`);
    deleted.rows.forEach(r => console.log(`     - ${r.email}`));

    console.log('\n👤 Creando pasajeros...');
    const passengers = [
      { uid: 'dev_pass_ve_001', email: 'pasajero1@vride.ve', name: 'Laura Pérez',     phone: '+584141234001' },
      { uid: 'dev_pass_ve_002', email: 'pasajero2@vride.ve', name: 'Carlos Ramírez',  phone: '+584141234002' },
      { uid: 'dev_pass_ve_003', email: 'pasajero3@vride.ve', name: 'María González',  phone: '+584141234003' },
    ];

    for (const p of passengers) {
      const res = await client.query(
        `INSERT INTO users (firebase_uid, email, name, phone, phone_verified, role, language, is_active)
         VALUES ($1, $2, $3, $4, true, 'passenger', 'es', true)
         ON CONFLICT (email) DO UPDATE SET firebase_uid=$1, name=$3
         RETURNING id`,
        [p.uid, p.email, p.name, p.phone]
      );
      const userId = res.rows[0].id;
      await client.query(
        `INSERT INTO passengers (id, rating_avg, total_rides, emergency_contact_name, emergency_contact_phone)
         VALUES ($1, 5.00, 0, 'Contacto de emergencia', '+584140000000')
         ON CONFLICT (id) DO NOTHING`,
        [userId]
      );
      console.log(`   ✅ ${p.name} (${p.email})`);
    }

    console.log('\n🚗 Creando conductores...');
    const drivers = [
      { uid: 'dev_drv_ve_001', email: 'conductor1@vride.ve', name: 'Andrés Medina',   phone: '+584261234001', plate: 'ABC-123', brand: 'Toyota',   model: 'Corolla', year: 2020, color: 'Blanco',  code: 'ANDRES2025' },
      { uid: 'dev_drv_ve_002', email: 'conductor2@vride.ve', name: 'José Hernández',  phone: '+584261234002', plate: 'DEF-456', brand: 'Chevrolet', model: 'Aveo',    year: 2019, color: 'Gris',    code: 'JOSE2025'   },
      { uid: 'dev_drv_ve_003', email: 'conductor3@vride.ve', name: 'Elena Castillo',  phone: '+584261234003', plate: 'GHI-789', brand: 'Ford',      model: 'Fiesta',  year: 2021, color: 'Azul',    code: 'ELENA2025'  },
    ];

    for (const d of drivers) {
      const res = await client.query(
        `INSERT INTO users (firebase_uid, email, name, phone, phone_verified, role, language, is_active)
         VALUES ($1, $2, $3, $4, true, 'driver', 'es', true)
         ON CONFLICT (email) DO UPDATE SET firebase_uid=$1, name=$3
         RETURNING id`,
        [d.uid, d.email, d.name, d.phone]
      );
      const userId = res.rows[0].id;
      await client.query(
        `INSERT INTO drivers (
           id, license_number, license_expiry,
           vehicle_plate, vehicle_brand, vehicle_model, vehicle_year, vehicle_color,
           background_check_status, services, status, is_online,
           rating_avg, total_rides, total_earned, available_balance, referral_code
         ) VALUES (
           $1, 'VE-LIC-' || $1::text, '2027-12-31',
           $2, $3, $4, $5, $6,
           'approved', '{standard}', 'active', false,
           5.00, 0, 0.00, 0.00, $7
         ) ON CONFLICT (id) DO NOTHING`,
        [userId, d.plate, d.brand, d.model, d.year, d.color, d.code]
      );
      console.log(`   ✅ ${d.name} (${d.email})`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Listo. Usuarios de prueba creados.');
    console.log('\n📋 CREDENCIALES (usar con modo development):');
    console.log('─────────────────────────────────────────');
    console.log('PASAJEROS:');
    passengers.forEach(p => console.log(`  Email: ${p.email}  |  Contraseña: (no aplica en dev mode)`));
    console.log('\nCONDUCTORES:');
    drivers.forEach(d => console.log(`  Email: ${d.email}  |  Contraseña: (no aplica en dev mode)`));
    console.log('─────────────────────────────────────────');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(() => process.exit(1));
