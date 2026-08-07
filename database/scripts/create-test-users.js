// Script: Crea 3 conductores + 3 pasajeros en Firebase y los registra en el backend
// Ejecutar desde la raíz: node database/scripts/create-test-users.js

process.on('uncaughtException', (err) => { console.error('ERROR:', err.message); process.exit(1); });
process.on('unhandledRejection', (err) => { console.error('REJECTION:', err?.message ?? err); process.exit(1); });

console.log('Cargando dependencias...');
require('dotenv').config({ path: './backend/.env' });
require('dotenv').config({ path: './mobile/.env' });
const admin = require('firebase-admin');
const axios  = require('axios');
console.log('Dependencias OK');

// ─── Config ──────────────────────────────────────────────────────────────────
const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BACKEND_URL      = process.env.EXPO_PUBLIC_API_URL + '/api/v1';
const PASSWORD         = 'Test1234!';

console.log('Backend URL:', BACKEND_URL);

admin.initializeApp({
  credential: admin.credential.cert({
    projectId:   process.env.FIREBASE_PROJECT_ID,
    privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});

// ─── Usuarios ────────────────────────────────────────────────────────────────
const PASAJEROS = [
  { email: 'pasajero1@vride.ve', name: 'Laura Pérez Rodríguez',  phone: '+584141234001', stateCode: 'DC', emergencyContactName: 'Roberto Pérez',   emergencyContactPhone: '+584141230099', emergencyContactEmail: 'roberto.perez@gmail.com' },
  { email: 'pasajero2@vride.ve', name: 'Carlos Ramírez Blanco',  phone: '+584141234002', stateCode: 'MI', emergencyContactName: 'Ana Ramírez',      emergencyContactPhone: '+584141230098', emergencyContactEmail: 'ana.ramirez@gmail.com'   },
  { email: 'pasajero3@vride.ve', name: 'María González Torres',  phone: '+584141234003', stateCode: 'AR', emergencyContactName: 'Luis González',     emergencyContactPhone: '+584141230097', emergencyContactEmail: 'luis.gonzalez@gmail.com' },
];

const CONDUCTORES = [
  { email: 'conductor1@vride.ve', name: 'Andrés Medina Castillo', phone: '+584261234001', stateCode: 'DC', referralCode: 'ANDRES2025' },
  { email: 'conductor2@vride.ve', name: 'José Hernández Silva',   phone: '+584261234002', stateCode: 'ZU', referralCode: 'JOSE2025'   },
  { email: 'conductor3@vride.ve', name: 'Elena Castillo Mora',    phone: '+584261234003', stateCode: 'CA', referralCode: 'ELENA2025'  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function upsertFirebaseUser(email, name) {
  try {
    const existing = await admin.auth().getUserByEmail(email);
    console.log(`   ♻️  Ya existe en Firebase: ${email}`);
    return existing.uid;
  } catch {
    await admin.auth().createUser({ email, password: PASSWORD, displayName: name });
    console.log(`   🔥 Creado en Firebase: ${email}`);
  }
}

async function getFirebaseIdToken(email) {
  const res = await axios.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    { email, password: PASSWORD, returnSecureToken: true }
  );
  return res.data.idToken;
}

async function registerPassenger(p, firebaseToken) {
  await axios.post(`${BACKEND_URL}/auth/register/passenger`, {
    firebaseToken,
    name:                  p.name,
    phone:                 p.phone,
    language:              'es',
    stateCode:             p.stateCode,
    emergencyContactName:  p.emergencyContactName,
    emergencyContactPhone: p.emergencyContactPhone,
    emergencyContactEmail: p.emergencyContactEmail,
  });
}

async function registerDriver(d, firebaseToken) {
  await axios.post(`${BACKEND_URL}/auth/register/driver`, {
    firebaseToken,
    name:      d.name,
    phone:     d.phone,
    language:  'es',
    stateCode: d.stateCode,
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  console.log('\n👤 CREANDO PASAJEROS\n─────────────────────────────────');
  for (const p of PASAJEROS) {
    console.log(`\n${p.name}`);
    await upsertFirebaseUser(p.email, p.name);
    const token = await getFirebaseIdToken(p.email);
    try {
      await registerPassenger(p, token);
      console.log(`   ✅ Registrado en backend`);
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'ALREADY_REGISTERED') {
        console.log(`   ⚠️  Ya existe en backend`);
      } else {
        throw new Error(`Backend error: ${err.response?.data?.error ?? err.message}`);
      }
    }
  }

  console.log('\n🚗 CREANDO CONDUCTORES\n─────────────────────────────────');
  for (const d of CONDUCTORES) {
    console.log(`\n${d.name}`);
    await upsertFirebaseUser(d.email, d.name);
    const token = await getFirebaseIdToken(d.email);
    try {
      await registerDriver(d, token);
      console.log(`   ✅ Registrado en backend`);
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'ALREADY_REGISTERED') {
        console.log(`   ⚠️  Ya existe en backend`);
      } else {
        throw new Error(`Backend error: ${err.response?.data?.error ?? err.message}`);
      }
    }
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log('✅ TODOS LOS USUARIOS CREADOS');
  console.log('══════════════════════════════════════════════════');
  console.log('\nPASAJEROS:');
  PASAJEROS.forEach(p => console.log(`  ${p.email}  /  ${PASSWORD}`));
  console.log('\nCONDUCTORES:');
  CONDUCTORES.forEach(d => console.log(`  ${d.email}  /  ${PASSWORD}`));
  console.log('══════════════════════════════════════════════════');

  admin.app().delete();
}

run().catch((err) => { console.error('FALLO FINAL:', err.message); process.exit(1); });
