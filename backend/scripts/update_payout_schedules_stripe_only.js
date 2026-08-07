// Lista y actualiza todas las cuentas Connect directamente desde Stripe
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_KEY, { apiVersion: '2023-10-16' });

async function main() {
  const accounts = [];
  let hasMore = true;
  let startingAfter = undefined;

  while (hasMore) {
    const page = await stripe.accounts.list({ limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
    accounts.push(...page.data);
    hasMore = page.has_more;
    if (page.data.length > 0) startingAfter = page.data[page.data.length - 1].id;
  }

  console.log(`Cuentas Connect encontradas en Stripe: ${accounts.length}`);
  let ok = 0, fail = 0;

  for (const account of accounts) {
    try {
      await stripe.accounts.update(account.id, {
        settings: { payouts: { schedule: { interval: 'weekly', weekly_anchor: 'tuesday' } } },
      });
      console.log(`✅  ${account.email ?? 'sin email'}  (${account.id})`);
      ok++;
    } catch (err) {
      console.error(`❌  ${account.id}  — ${err.message}`);
      fail++;
    }
  }

  console.log(`\nFinalizado: ${ok} actualizados, ${fail} errores`);
}

main().catch(err => { console.error(err); process.exit(1); });
