import 'dotenv/config';
import { db } from '../src/config/database';

const MEMBERSHIP_ID = '0a068489-f680-4c75-bf94-9beb39e5c5b9';
const RATE_VES      = 772.54;
const IVA_RATE      = 0.16;

async function run() {
  const { rows } = await db.query(
    `SELECT invoice_number, amount_usd, invoice_amount_ves FROM driver_memberships WHERE id = $1`,
    [MEMBERSHIP_ID]
  );
  const m = rows[0];
  if (!m) { console.error('Membresía no encontrada'); process.exit(1); }

  console.log(`Factura: ${m.invoice_number}`);
  console.log(`Monto USD: $${m.amount_usd}  |  VES actual: ${m.invoice_amount_ves}`);

  const amountUsd = Number(m.amount_usd);
  const amountVes = parseFloat((amountUsd * RATE_VES).toFixed(2));
  const ivaVes    = parseFloat((amountVes * IVA_RATE).toFixed(2));
  const totalVes  = parseFloat((amountVes + ivaVes).toFixed(2));

  console.log(`Calculando con tasa ${RATE_VES} Bs/$:`);
  console.log(`  Base Imponible: Bs. ${amountVes}`);
  console.log(`  IVA 16%:        Bs. ${ivaVes}`);
  console.log(`  Total:          Bs. ${totalVes}`);

  await db.query(
    `UPDATE driver_memberships
     SET invoice_rate_ves   = $2,
         invoice_amount_ves = $3,
         invoice_iva_ves    = $4,
         invoice_total_ves  = $5
     WHERE id = $1`,
    [MEMBERSHIP_ID, RATE_VES, amountVes, ivaVes, totalVes]
  );

  console.log('Valores VES actualizados en BD.');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
