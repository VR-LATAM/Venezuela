// Ejecutar desde D:\apps\v-ride\backend con la clave LIVE de Stripe:
//
//   $env:STRIPE_KEY="sk_live_TU_CLAVE"  (PowerShell)
//   node scripts/update_payout_schedules.js
//
const { Client } = require('pg');
const Stripe     = require('stripe');

const stripeKey = process.env.STRIPE_KEY || process.env.STRIPE_SECRET_KEY;
if (!stripeKey || stripeKey.startsWith('sk_test_')) {
  console.error('ERROR: Debes pasar la clave LIVE de Stripe.');
  console.error('  $env:STRIPE_KEY="sk_live_..." ; node scripts/update_payout_schedules.js');
  process.exit(1);
}

const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

const db = new Client({
  connectionString: 'postgresql://postgres:J8aFMP1Qz2nd4ceoAw3iz3WtEc0fsQqi@db.nkiwlxoedjizniseabga.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await db.connect();

  const { rows } = await db.query(
    `SELECT id, stripe_account_id, email FROM drivers
     WHERE stripe_account_id IS NOT NULL ORDER BY created_at`
  );

  console.log(`Conductores con cuenta Stripe Connect: ${rows.length}`);
  let ok = 0, fail = 0;

  for (const driver of rows) {
    try {
      await stripe.accounts.update(driver.stripe_account_id, {
        settings: { payouts: { schedule: { interval: 'weekly', weekly_anchor: 'tuesday' } } },
      });
      console.log(`✅  ${driver.email}  (${driver.stripe_account_id})`);
      ok++;
    } catch (err) {
      console.error(`❌  ${driver.email}  — ${err.message}`);
      fail++;
    }
  }

  console.log(`\nFinalizado: ${ok} actualizados, ${fail} errores`);
  await db.end();
}

main().catch(err => { console.error(err); process.exit(1); });
