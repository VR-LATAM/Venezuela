import admin from 'firebase-admin';
import https from 'https';

const FIREBASE_API_KEY = 'AIzaSyCdHU2L2bY3ytJVaMOrVdoyv1t5dkbeTuY';
const BACKEND_URL     = 'https://vridebackend-production-dd32.up.railway.app/api/v1';

admin.initializeApp({
  credential: admin.credential.cert({
    projectId:   'latam-ve',
    privateKey:  "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDT9RaTvv5dqnJ9\ntzXSUtyOK4EvS4fck7Is6xax2RFYXq4wOrz4a2D9cOstTzTFu7kZ1XXbMBC84VHG\nHFII2Y+c6MYrhfm+hAE8EOkjgB3+teeko73xNGG31UTW0OBTXCKqFuvXbBQiAVo2\nMQRXprdK3q8YPLdfh8k/Wz+AEWTvQ40+XQLj0eDtaehNGolwC85/1ix/VKSGkg//\nBEVB5UZ0F7hv2hNkpbzATMVCoXdnlBcbxbieZ8OCrAJezh+DWQQwmuPE6X4fokrJ\npeyMgFxWnwY6kO5Jjd78b1UamomT++9wOkiFU/0pLUE/OBCnrn7DgqO9Odv3UCqg\nXKM8LEINAgMBAAECggEAKLBjDifbItYGtpWGMoMPrgcx/IdOZIzB5peWuruF9eXv\nIHkWL8ZFT0HvE7qh0dewuAHfZx16CRhkH1jucp55UFDrQg2tHOKwbfx9FQCSQYRg\nHJ4GZ5h7rdO2LFraxYXpbaeKzMcFsmV6EO8l+0GY7DmFeWymcyNZAd2dehNcwgVn\nVckKr1SWCkNalSlHkETtyjST2OcTbMQisVE6NVR8IVa/WkIA7xUAoyfkqljz5Xrq\nCQ6a0nsIHWE4fuocKQSkYXyBhRUe1eOrBcY2vVmObEC+2jr7TL1IF2teeg/8o3qU\nLaPHYP8shsaiM+TkQtDH49FSFs0g+6K5W2fZTb0vjQKBgQDry2p7cHaK1ysc4RGl\na7vsTfRdE7BBcusCTkxvEGGCtuAjcaT+iAL2jYA5xrStblBZrLaPIgmUGU6rZ5cx\nOHkXoouGBe5dpLsqqWIXh84Ofi1xbtfV+EBqagc1lyL80PJzgBfmZh9ueuiRoy5T\n62bqdljsvvWKGY1yw1HgzjK4UwKBgQDmHsJqoUwg8Mvz7LgdOYMuFzfxXyuYAWjC\nK0wFgwkd8i+SNIeW3UnMKD90V+VrAAYn78TAWGABIavYavZ8mtOa9MzT4Bg/KjZS\nf8EGFitmiBsUQc6Cw7Agf9w2HI6XDG2qPvbBqTcr7qWF8jXjunz1Xse4VW8TXI5N\nMiI/RhpQHwKBgGutcOr96KRurhl6DnzkPeUjlDwNCahZukhLSUxOxrjSmniVJSu3\nIONGqw+3Vjr87WSGIrgqawVeqTZNEBZCG8pXSC/j9X5+A5rvzwO/2LF1nXr3i0kD\nHSd7U999LVUWdiGYlVF5wVDKf/pB8p4QGedoNCOo8KgoExgdaf6nKzJRAoGAQinX\n5kaoF9SEH4cRTL3LfMYKPKkLZLILB8DhI7iQN375tITL81F+tWdhDzdya/hezL7A\niDkgqVKgESJ36k2tx6DY/5YwAoFFiyTWP8TCB8HcX0+oa6qOCloY26oMSVu2cDuY\nQQhBJ61/A+snGWn2Iap1rAdMX3m+JG3ksOKcECsCgYAOgQ9E+k9YSkaFht2NuvXB\nhqnC4rMPOBeY1FU1zkaeQzCy5hOg9WZWEEfQ/rVSn0vIlmPyhEj57oMZ+KekgOOj\n557GF1b5Zy9gZrTzYybq4MRSfTGCmd4oJrrvRrGJ6FxH6fpVpKb2h3hzfmrWYx0V\ncF14RVF3fsyG+ZBT3My/BQ==\n-----END PRIVATE KEY-----\n",
    clientEmail: 'firebase-adminsdk-fbsvc@latam-ve.iam.gserviceaccount.com',
  }),
});

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function getIdToken(uid) {
  const customToken = await admin.auth().createCustomToken(uid);
  const res = await post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    { token: customToken, returnSecureToken: true }
  );
  if (!res.body.idToken) throw new Error(`No idToken: ${JSON.stringify(res.body)}`);
  return res.body.idToken;
}

async function createFirebaseUser(email, password) {
  try {
    const u = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(u.uid, { emailVerified: true });
    return u.uid;
  } catch {
    const u = await admin.auth().createUser({ email, password, emailVerified: true });
    return u.uid;
  }
}

async function registerPassenger(email, password, name, phone) {
  console.log(`\nCreando pasajero: ${email}`);
  const uid = await createFirebaseUser(email, password);
  const idToken = await getIdToken(uid);
  const res = await post(`${BACKEND_URL}/auth/register/passenger`, {
    firebaseToken: idToken,
    name,
    phone,
    language: 'es',
    stateCode: 'DC',
  });
  if (res.status === 201) {
    console.log(`  OK — pasajero creado`);
  } else {
    console.log(`  ERROR ${res.status}: ${JSON.stringify(res.body)}`);
  }
}

async function registerDriver(email, password, name, phone) {
  console.log(`\nCreando conductor: ${email}`);
  const uid = await createFirebaseUser(email, password);
  const idToken = await getIdToken(uid);
  const res = await post(`${BACKEND_URL}/auth/register/driver`, {
    firebaseToken: idToken,
    name,
    phone,
    language: 'es',
    stateCode: 'DC',
  });
  if (res.status === 201) {
    console.log(`  OK — conductor creado`);
  } else {
    console.log(`  ERROR ${res.status}: ${JSON.stringify(res.body)}`);
  }
}

const PASS = 'Test1234!';

await registerPassenger('pasajero1@vride.test', PASS, 'Ana García',    '+58 412 111 0001');
await registerPassenger('pasajero2@vride.test', PASS, 'Carlos López',  '+58 412 111 0002');
await registerPassenger('pasajero3@vride.test', PASS, 'María Pérez',   '+58 412 111 0003');

await registerDriver('conductor1@vride.test', PASS, 'Juan Rodríguez',      '+58 424 222 0001');
await registerDriver('conductor2@vride.test', PASS, 'Pedro Martínez',     '+58 424 222 0002');
await registerDriver('conductor3@vride.test', PASS, 'Luis González',      '+58 424 222 0003');
await registerDriver('conductor4@vride.test', PASS, 'Miguel Suárez Peña', '+58 426 123 4004');
await registerDriver('conductor5@vride.test', PASS, 'Patricia Sosa López','+58 426 123 4005');
await registerDriver('conductor6@vride.test', PASS, 'Ricardo Torres Vega','+58 426 123 4006');
await registerDriver('conductor7@vride.test', PASS, 'Carlos Díaz Mora',   '+58 426 123 4007');
await registerDriver('conductor8@vride.test', PASS, 'Andrés Castillo Vera','+58 426 123 4008');
await registerDriver('conductor9@vride.test', PASS, 'José Mendoza Ríos',  '+58 426 123 4009');

console.log('\nListo. Contraseña de todos: Test1234!');
process.exit(0);
