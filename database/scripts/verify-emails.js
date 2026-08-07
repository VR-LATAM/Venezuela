process.on('uncaughtException', (err) => { console.error('ERROR:', err.message); process.exit(1); });
process.on('unhandledRejection', (err) => { console.error('REJECTION:', err?.message ?? err); process.exit(1); });

require('dotenv').config({ path: './backend/.env' });
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId:   process.env.FIREBASE_PROJECT_ID,
    privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});

const EMAILS = [
  'pasajero1@vride.ve',
  'pasajero2@vride.ve',
  'pasajero3@vride.ve',
  'conductor1@vride.ve',
  'conductor2@vride.ve',
  'conductor3@vride.ve',
];

async function run() {
  for (const email of EMAILS) {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, { emailVerified: true });
    console.log(`✅ ${email}`);
  }
  console.log('\nTodos los correos verificados.');
  admin.app().delete();
}

run().catch((err) => { console.error('FALLO:', err.message); process.exit(1); });
