import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const user = await client.query(`SELECT id, firebase_uid, email FROM users WHERE email = 'conductor1@vride.test'`);
const { firebase_uid } = user.rows[0];
console.log('Firebase UID:', firebase_uid);

const attempts = await client.query(`
  SELECT qa.score, qa.passed, qa.attempted_at, tm.code, tm.passing_score, tm.total_questions
  FROM driver_quiz_attempts qa
  JOIN training_modules tm ON tm.id = qa.module_id
  WHERE qa.driver_id = $1
  ORDER BY qa.attempted_at DESC
`, [firebase_uid]);
console.log('\nINTENTOS QUIZ:');
if (attempts.rows.length === 0) console.log('  (ninguno)');
attempts.rows.forEach(r => console.log(' ', r.code, 'score:', r.score + '/' + r.total_questions, 'passed:', r.passed, r.attempted_at));

const certs = await client.query(`
  SELECT service_type, certified_at, is_active
  FROM driver_service_certifications
  WHERE driver_id = $1
`, [firebase_uid]);
console.log('\nCERTIFICACIONES:');
if (certs.rows.length === 0) console.log('  (ninguna)');
certs.rows.forEach(r => console.log(' ', r.service_type, r.certified_at, 'activa:', r.is_active));

const progress = await client.query(`
  SELECT dtp.status, dtp.attempts, dtp.last_score, tm.code
  FROM driver_training_progress dtp
  JOIN training_modules tm ON tm.id = dtp.module_id
  WHERE dtp.driver_id = $1
`, [firebase_uid]);
console.log('\nPROGRESO:');
if (progress.rows.length === 0) console.log('  (ninguno)');
progress.rows.forEach(r => console.log(' ', r.code, 'status:', r.status, 'intentos:', r.attempts, 'último score:', r.last_score));

await client.end();
