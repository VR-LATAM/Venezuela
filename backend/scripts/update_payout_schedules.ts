// Script: actualizar schedule de pago a todos los conductores con cuenta Stripe Connect
// Ejecutar UNA SOLA VEZ desde la raíz del backend:
//   npx ts-node scripts/update_payout_schedules.ts

import 'dotenv/config';
import Stripe from 'stripe';
import { db } from '../src/config/database';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

async function main() {
  const { rows } = await db.query<{ id: string; stripe_account_id: string; email: string }>(
    `SELECT id, stripe_account_id, email FROM drivers
     WHERE stripe_account_id IS NOT NULL
     ORDER BY created_at`
  );

  console.log(`Conductores con cuenta Stripe: ${rows.length}`);

  let ok = 0, fail = 0;

  for (const driver of rows) {
    try {
      await stripe.accounts.update(driver.stripe_account_id, {
        settings: {
          payouts: {
            schedule: {
              interval:      'weekly',
              weekly_anchor: 'tuesday',
            },
          },
        },
      });
      console.log(`✅ ${driver.email} (${driver.stripe_account_id})`);
      ok++;
    } catch (err: any) {
      console.error(`❌ ${driver.email} — ${err.message}`);
      fail++;
    }
  }

  console.log(`\nFinalizado: ${ok} actualizados, ${fail} errores`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
