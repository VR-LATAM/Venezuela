import 'dotenv/config';
import { db } from '../src/config/database';
import { generateMembershipInvoice } from '../src/services/membershipInvoiceService';
import { emailService } from '../src/services/emailService';

const MEMBERSHIP_ID = '0a068489-f680-4c75-bf94-9beb39e5c5b9';

async function run() {
  const { rows } = await db.query(
    `SELECT dm.id, dm.driver_id, dm.amount_usd, dm.vehicle_type,
            dm.period_start, dm.period_end, dm.status, dm.approved_at,
            u.name, u.email, u.cedula
     FROM driver_memberships dm
     JOIN users u ON u.id = dm.driver_id
     WHERE dm.id = $1`,
    [MEMBERSHIP_ID]
  );

  const m = rows[0];
  if (!m) { console.error('Membresía no encontrada'); process.exit(1); }
  console.log(`Conductor: ${m.name} <${m.email}>`);
  console.log(`Período: ${m.period_start} → ${m.period_end} | Monto: $${m.amount_usd}`);

  const toDateStr = (v: Date | string) =>
    v instanceof Date ? v.toISOString().split('T')[0] : String(v).split('T')[0];

  const invoice = await generateMembershipInvoice({
    membershipId: m.id,
    amountUsd:    m.amount_usd,
    vehicleType:  m.vehicle_type,
    periodStart:  toDateStr(m.period_start),
    periodEnd:    toDateStr(m.period_end),
    driverName:   m.name,
    driverEmail:  m.email,
    driverCedula: m.cedula,
    approvedAt:   m.approved_at ? new Date(m.approved_at) : new Date(),
  });

  console.log(`Factura generada: ${invoice.invoiceNumber}`);

  await emailService.sendMembershipInvoice({
    toEmail:     m.email,
    toName:      m.name,
    invoice,
    vehicleType: m.vehicle_type,
    periodStart: m.period_start,
    periodEnd:   m.period_end,
  });

  console.log(`Email enviado a ${m.email}`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
