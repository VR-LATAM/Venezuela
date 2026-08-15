import PDFDocument from 'pdfkit';
import { db } from '../config/database';
import { convertToVES } from './exchangeRateService';
import { logger } from '../utils/logger';

const IVA_RATE = 0.16;

const EMISOR = {
  nombre:    'VERONA - Technology Group C.A.',
  rif:       'J-00000000-0',
  direccion: ['Av. 8 Santa Rita, C. 60, No. 7-58,', 'Edificio UCEZ (Al lado del Liceo U.E. Udón Pérez)', 'Maracaibo, Estado Zulia, CP 4002. Venezuela.'],
  telefono:  '',
  email:     'admin@veronaride.app',
};

/* ─── Colores ─────────────────────────────────────────────────── */
const C = {
  primary: '#1a2e4a',
  gold:    '#c8a84b',
  dark:    '#1E293B',
  muted:   '#64748B',
  line:    '#CBD5E1',
  bg:      '#F8FAFC',
  red:     '#DC2626',
  white:   '#FFFFFF',
};

const M  = 42;
const PW = 612;
const W  = PW - M * 2;

/* ─── Número correlativo ──────────────────────────────────────── */
async function nextInvoiceNumber(): Promise<string> {
  const { rows } = await db.query<{ nextval: string }>(
    `SELECT nextval('membership_invoice_seq') AS nextval`
  );
  const seq  = String(rows[0].nextval).padStart(6, '0');
  const year = new Date().getFullYear();
  return `VRV-${year}-${seq}`;
}

/* ─── Guardar datos en BD ─────────────────────────────────────── */
async function saveInvoiceData(
  membershipId: string,
  invoiceNumber: string,
  rateVes:      number,
  amountVes:    number,
  ivaVes:       number,
  totalVes:     number,
): Promise<void> {
  await db.query(
    `UPDATE driver_memberships
     SET invoice_number       = $2,
         invoice_rate_ves     = $3,
         invoice_amount_ves   = $4,
         invoice_iva_ves      = $5,
         invoice_total_ves    = $6,
         invoice_generated_at = now()
     WHERE id = $1`,
    [membershipId, invoiceNumber, rateVes, amountVes, ivaVes, totalVes]
  );
}

/* ─── Helpers PDF ─────────────────────────────────────────────── */
function hLine(doc: PDFKit.PDFDocument, y: number, thick = false): void {
  doc.moveTo(M, y).lineTo(M + W, y)
    .lineWidth(thick ? 1.2 : 0.5)
    .strokeColor(thick ? C.primary : C.line)
    .stroke();
}

function row(
  doc: PDFKit.PDFDocument,
  y: number,
  label: string,
  value: string,
  opts: { bold?: boolean; color?: string; large?: boolean } = {}
): number {
  const fs   = opts.large ? 12 : 10;
  const font = opts.bold  ? 'Helvetica-Bold' : 'Helvetica';
  const col  = opts.color ?? C.dark;
  doc.fontSize(fs).font(font).fillColor(col)
     .text(label, M, y, { width: W * 0.62, lineBreak: false });
  doc.fontSize(fs).font(font).fillColor(col)
     .text(value, M + W * 0.62, y, { width: W * 0.38, align: 'right', lineBreak: false });
  return y + (opts.large ? 18 : 16);
}

function formatVes(n: number): string {
  return `Bs. ${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatUsd(n: number): string {
  return `$ ${n.toFixed(2)}`;
}

/* ─── Generador principal ─────────────────────────────────────── */
export interface InvoiceInput {
  membershipId:  string;
  amountUsd:     number;
  vehicleType:   string;
  periodStart:   string;
  periodEnd:     string;
  driverName:    string;
  driverEmail:   string;
  driverCedula?: string | null;
  approvedAt:    Date;
}

export interface InvoiceResult {
  invoiceNumber: string;
  pdfBuffer:     Buffer;
  amountUsd:     number;
  ivaUsd:        number;
  totalUsd:      number;
  amountVes:     number;
  ivaVes:        number;
  totalVes:      number;
  rateVes:       number;
}

export async function generateMembershipInvoice(input: InvoiceInput): Promise<InvoiceResult> {
  const { membershipId, amountUsd, vehicleType, driverName, driverEmail, driverCedula, approvedAt } = input;
  const toDateStr = (v: Date | string): string =>
    v instanceof Date ? v.toISOString().split('T')[0] : String(v).split('T')[0];
  const periodStart = toDateStr(input.periodStart as any);
  const periodEnd   = toDateStr(input.periodEnd as any);

  const amountUsdN = Number(amountUsd);
  const ivaUsd   = parseFloat((amountUsdN * IVA_RATE).toFixed(2));
  const totalUsd = parseFloat((amountUsdN + ivaUsd).toFixed(2));

  const { ves: amountVes, rate: rateVes } = await convertToVES(amountUsdN);
  const ivaVes   = parseFloat((amountVes * IVA_RATE).toFixed(2));
  const totalVes = parseFloat((amountVes + ivaVes).toFixed(2));

  const invoiceNumber = await nextInvoiceNumber();
  await saveInvoiceData(membershipId, invoiceNumber, rateVes, amountVes, ivaVes, totalVes);

  const vehicleLabel: Record<string, string> = { moto: 'Moto', sedan: 'Sedán', suv: 'SUV' };
  const vLabel = vehicleLabel[vehicleType] ?? vehicleType.toUpperCase();

  const fecha = approvedAt.toLocaleDateString('es-VE', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Caracas',
  });

  const descripcion = `Membresía Semanal — ${vLabel}`;
  const periodo     = `Período: ${periodStart.split('-').reverse().join('/')} al ${periodEnd.split('-').reverse().join('/')}`;

  /* ── PDF ──────────────────────────────────────────────────── */
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const doc    = new PDFDocument({ size: 'LETTER', margin: 0, autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on('data',  (c: Buffer) => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let y = 0;

    /* ── Encabezado empresa ─────────────────────────────────── */
    doc.rect(0, 0, PW, 78).fill(C.primary);

    doc.fontSize(20).font('Helvetica-Bold').fillColor(C.white).text('V-RIDE', M, 14);
    doc.fontSize(8).font('Helvetica').fillColor('rgba(255,255,255,0.65)')
       .text('VERONA Technology Group C.A.', M, 36);
    doc.fontSize(7.5).fillColor('rgba(255,255,255,0.55)')
       .text(EMISOR.direccion[0], M, 46)
       .text(EMISOR.direccion[1], M, 54)
       .text(EMISOR.direccion[2], M, 62);

    /* RIF en el lado derecho */
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.gold)
       .text(`RIF: ${EMISOR.rif}`, M, 18, { width: W, align: 'right', lineBreak: false });

    /* Tipo documento */
    doc.fontSize(13).font('Helvetica-Bold').fillColor(C.white)
       .text('COMPROBANTE ELECTRÓNICO', M, 50, { width: W, align: 'right', lineBreak: false });

    y = 92;

    /* ── Número y fecha ─────────────────────────────────────── */
    const halfW = (W - 16) / 2;
    doc.rect(M, y, halfW, 38).fillAndStroke('#EFF6FF', C.line);
    doc.rect(M + halfW + 16, y, halfW, 38).fillAndStroke('#EFF6FF', C.line);

    doc.fontSize(7.5).font('Helvetica').fillColor(C.muted)
       .text('NÚMERO DE CONTROL', M + 8, y + 5);
    doc.fontSize(14).font('Helvetica-Bold').fillColor(C.primary)
       .text(invoiceNumber, M + 8, y + 15, { width: halfW - 16, lineBreak: false });

    doc.fontSize(7.5).font('Helvetica').fillColor(C.muted)
       .text('FECHA DE EMISIÓN', M + halfW + 24, y + 5);
    doc.fontSize(14).font('Helvetica-Bold').fillColor(C.primary)
       .text(fecha, M + halfW + 24, y + 15, { width: halfW - 16, lineBreak: false });

    y += 50;

    /* ── Datos receptor ─────────────────────────────────────── */
    doc.rect(M, y, W, 2).fill(C.gold);
    y += 6;

    doc.fontSize(7).font('Helvetica-Bold').fillColor(C.muted)
       .text('DATOS DEL RECEPTOR', M, y, { characterSpacing: 1 });
    y += 12;

    doc.fontSize(10).font('Helvetica-Bold').fillColor(C.dark)
       .text(driverName, M, y, { lineBreak: false });
    y += 14;
    doc.fontSize(9).font('Helvetica').fillColor(C.muted)
       .text(`Cédula: ${driverCedula ?? 'No registrada'}    |    ${driverEmail}`, M, y);
    y += 18;

    doc.rect(M, y, W, 2).fill(C.gold);
    y += 12;

    /* ── Cabecera tabla: CANTIDAD | DESCRIPCIÓN | Bs. ─────── */
    const colQty  = 48;
    const colBs   = W * 0.30;
    const colDesc = W - colQty - colBs;

    doc.rect(M, y, W, 22).fill(C.primary);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.white)
       .text('CANT.', M + 4, y + 7, { width: colQty - 4, align: 'center', lineBreak: false });
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.white)
       .text('DESCRIPCIÓN', M + colQty + 4, y + 7, { width: colDesc - 8, lineBreak: false });
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.white)
       .text('Bs.', M + colQty + colDesc, y + 7, { width: colBs - 4, align: 'right', lineBreak: false });
    y += 26;

    /* ── Fila detalle ───────────────────────────────────────── */
    const rowH = 110;
    doc.rect(M, y, W, rowH).fill('#F8FAFC');

    /* Cantidad */
    doc.fontSize(13).font('Helvetica-Bold').fillColor(C.dark)
       .text('1', M + 4, y + 10, { width: colQty - 4, align: 'center', lineBreak: false });

    /* Descripción: concepto + periodo + desglose USD */
    const xDesc = M + colQty + 4;
    doc.fontSize(11).font('Helvetica-Bold').fillColor(C.dark)
       .text(descripcion, xDesc, y + 6, { width: colDesc - 8, lineBreak: false });
    doc.fontSize(9).font('Helvetica').fillColor(C.muted)
       .text(periodo, xDesc, y + 20, { width: colDesc - 8, lineBreak: false });

    const usdLines: [string, string][] = [
      [`Membresía:`,   formatUsd(amountUsdN)],
      [`IVA 16%:`,     formatUsd(ivaUsd)],
      [`Total USD:`,   formatUsd(totalUsd)],
      [`Tasa BCV:`,    `1 USD = Bs. ${rateVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ];
    let yd = y + 36;
    doc.fontSize(8.5).fillColor('#78350F');
    for (const [lbl, val] of usdLines) {
      doc.font('Helvetica').text(lbl, xDesc, yd, { width: colDesc * 0.42, lineBreak: false });
      doc.font('Helvetica-Bold').text(val, xDesc + colDesc * 0.42, yd, { width: colDesc * 0.54, lineBreak: false });
      yd += 13;
    }

    /* Monto en Bs. (alineado al centro vertical de la fila) */
    doc.fontSize(13).font('Helvetica-Bold').fillColor(C.primary)
       .text(formatVes(amountVes), M + colQty + colDesc, y + (rowH / 2) - 8,
             { width: colBs - 4, align: 'right', lineBreak: false });

    y += rowH + 4;

    hLine(doc, y);
    y += 10;

    /* ── Totales en Bs. ─────────────────────────────────────── */
    y = row(doc, y, 'Base imponible', formatVes(amountVes));
    y = row(doc, y, 'IVA (16%)', formatVes(ivaVes), { color: C.muted });
    y += 4;

    hLine(doc, y, true);
    y += 8;

    /* Caja TOTAL en Bs. */
    doc.rect(M, y, W, 44).fill(C.primary);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(C.white)
       .text('TOTAL A PAGAR (Bs.)', M + 12, y + 15, { width: W / 2, lineBreak: false });
    doc.fontSize(22).font('Helvetica-Bold').fillColor(C.gold)
       .text(formatVes(totalVes), M, y + 11, { width: W - 12, align: 'right', lineBreak: false });
    y += 54;

    /* ── Pie de página (posición fija al fondo) ───────────── */
    const footerY = 792 - 40;
    hLine(doc, footerY - 10);
    doc.fontSize(7).font('Helvetica').fillColor(C.muted)
       .text(
         `Este documento es un comprobante electrónico emitido por ${EMISOR.nombre} RIF ${EMISOR.rif}.`,
         M, footerY, { width: W, align: 'center', lineBreak: false }
       );
    doc.fontSize(7).font('Helvetica').fillColor(C.muted)
       .text(
         `Válido sin firma ni sello.  ·  Consultas: ${EMISOR.email}`,
         M, footerY + 12, { width: W, align: 'center', lineBreak: false }
       );

    doc.end();
  });

  logger.info(`Factura membresía generada: ${invoiceNumber} — ${driverName}`);
  return { invoiceNumber, pdfBuffer, amountUsd: amountUsdN, ivaUsd, totalUsd, amountVes, ivaVes, totalVes, rateVes };
}

/* ─── Regenerar PDF desde datos guardados (para descarga) ────── */
export async function getInvoiceForMembership(membershipId: string, driverId: string): Promise<Buffer | null> {
  const { rows } = await db.query<{
    invoice_number:       string | null;
    invoice_rate_ves:     number | null;
    invoice_amount_ves:   number | null;
    invoice_iva_ves:      number | null;
    invoice_total_ves:    number | null;
    invoice_generated_at: string | null;
    amount_usd:           number;
    vehicle_type:         string;
    period_start:         string;
    period_end:           string;
    approved_at:          string | null;
    driver_name:          string;
    driver_email:         string;
    driver_cedula:        string | null;
  }>(
    `SELECT dm.invoice_number, dm.invoice_rate_ves, dm.invoice_amount_ves,
            dm.invoice_iva_ves, dm.invoice_total_ves, dm.invoice_generated_at,
            dm.amount_usd, dm.vehicle_type, dm.period_start, dm.period_end, dm.approved_at,
            u.name AS driver_name, u.email AS driver_email, u.cedula AS driver_cedula
     FROM driver_memberships dm
     JOIN users u ON u.id = dm.driver_id
     WHERE dm.id = $1 AND dm.driver_id = $2 AND dm.invoice_number IS NOT NULL`,
    [membershipId, driverId]
  );

  const m = rows[0];
  if (!m || !m.invoice_number) return null;

  const toStr = (v: Date | string): string =>
    v instanceof Date ? v.toISOString().split('T')[0] : String(v).split('T')[0];
  const vehicleLabel: Record<string, string> = { moto: 'Moto', sedan: 'Sedán', suv: 'SUV' };
  const vLabel = vehicleLabel[m.vehicle_type] ?? m.vehicle_type.toUpperCase();
  const descripcion = `Membresía Semanal — ${vLabel}`;
  const periodo     = `Período: ${toStr(m.period_start as any).split('-').reverse().join('/')} al ${toStr(m.period_end as any).split('-').reverse().join('/')}`;

  const approvedAt = m.approved_at ? new Date(m.approved_at) : new Date();
  const fecha = approvedAt.toLocaleDateString('es-VE', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Caracas',
  });

  const amountVes = Number(m.invoice_amount_ves ?? 0);
  const ivaVes    = Number(m.invoice_iva_ves    ?? 0);
  const totalVes  = Number(m.invoice_total_ves  ?? 0);
  const rateVes   = Number(m.invoice_rate_ves   ?? 0);
  const amountUsd = Number(m.amount_usd);
  const ivaUsd    = parseFloat((amountUsd * IVA_RATE).toFixed(2));
  const totalUsd  = parseFloat((amountUsd + ivaUsd).toFixed(2));

  return new Promise<Buffer>((resolve, reject) => {
    const doc    = new PDFDocument({ size: 'LETTER', margin: 0, autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on('data',  (c: Buffer) => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let y = 0;

    doc.rect(0, 0, PW, 78).fill(C.primary);
    doc.fontSize(20).font('Helvetica-Bold').fillColor(C.white).text('V-RIDE', M, 14);
    doc.fontSize(8).font('Helvetica').fillColor('rgba(255,255,255,0.65)')
       .text('VERONA Technology Group C.A.', M, 36);
    doc.fontSize(7.5).fillColor('rgba(255,255,255,0.55)')
       .text(EMISOR.direccion[0], M, 46)
       .text(EMISOR.direccion[1], M, 54)
       .text(EMISOR.direccion[2], M, 62);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.gold)
       .text(`RIF: ${EMISOR.rif}`, M, 18, { width: W, align: 'right', lineBreak: false });
    doc.fontSize(13).font('Helvetica-Bold').fillColor(C.white)
       .text('COMPROBANTE ELECTRÓNICO', M, 50, { width: W, align: 'right', lineBreak: false });
    y = 92;

    const halfW = (W - 16) / 2;
    doc.rect(M, y, halfW, 38).fillAndStroke('#EFF6FF', C.line);
    doc.rect(M + halfW + 16, y, halfW, 38).fillAndStroke('#EFF6FF', C.line);
    doc.fontSize(7.5).font('Helvetica').fillColor(C.muted).text('NÚMERO DE CONTROL', M + 8, y + 5);
    doc.fontSize(14).font('Helvetica-Bold').fillColor(C.primary).text(m.invoice_number!, M + 8, y + 15, { width: halfW - 16, lineBreak: false });
    doc.fontSize(7.5).font('Helvetica').fillColor(C.muted).text('FECHA DE EMISIÓN', M + halfW + 24, y + 5);
    doc.fontSize(14).font('Helvetica-Bold').fillColor(C.primary).text(fecha, M + halfW + 24, y + 15, { width: halfW - 16, lineBreak: false });
    y += 50;

    doc.rect(M, y, W, 2).fill(C.gold); y += 6;
    doc.fontSize(7).font('Helvetica-Bold').fillColor(C.muted).text('DATOS DEL RECEPTOR', M, y, { characterSpacing: 1 }); y += 12;
    doc.fontSize(10).font('Helvetica-Bold').fillColor(C.dark).text(m.driver_name, M, y, { lineBreak: false }); y += 14;
    doc.fontSize(9).font('Helvetica').fillColor(C.muted)
       .text(`Cédula: ${m.driver_cedula ?? 'No registrada'}    |    ${m.driver_email}`, M, y); y += 18;
    doc.rect(M, y, W, 2).fill(C.gold); y += 12;

    const colQty2  = 48;
    const colBs2   = W * 0.30;
    const colDesc2 = W - colQty2 - colBs2;

    doc.rect(M, y, W, 22).fill(C.primary);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.white)
       .text('CANT.', M + 4, y + 7, { width: colQty2 - 4, align: 'center', lineBreak: false });
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.white)
       .text('DESCRIPCIÓN', M + colQty2 + 4, y + 7, { width: colDesc2 - 8, lineBreak: false });
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.white)
       .text('Bs.', M + colQty2 + colDesc2, y + 7, { width: colBs2 - 4, align: 'right', lineBreak: false });
    y += 26;

    const rowH2 = 110;
    doc.rect(M, y, W, rowH2).fill('#F8FAFC');
    doc.fontSize(13).font('Helvetica-Bold').fillColor(C.dark)
       .text('1', M + 4, y + 10, { width: colQty2 - 4, align: 'center', lineBreak: false });

    const xDesc2 = M + colQty2 + 4;
    doc.fontSize(11).font('Helvetica-Bold').fillColor(C.dark)
       .text(descripcion, xDesc2, y + 6, { width: colDesc2 - 8, lineBreak: false });
    doc.fontSize(9).font('Helvetica').fillColor(C.muted)
       .text(periodo, xDesc2, y + 20, { width: colDesc2 - 8, lineBreak: false });

    let yd2 = y + 36;
    doc.fontSize(8.5).fillColor('#78350F');
    for (const [lbl, val] of [
      [`Membresía:`, formatUsd(amountUsd)],
      [`IVA 16%:`,   formatUsd(ivaUsd)],
      [`Total USD:`, formatUsd(totalUsd)],
      [`Tasa BCV:`,  `1 USD = Bs. ${rateVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ] as [string, string][]) {
      doc.font('Helvetica').text(lbl, xDesc2, yd2, { width: colDesc2 * 0.42, lineBreak: false });
      doc.font('Helvetica-Bold').text(val, xDesc2 + colDesc2 * 0.42, yd2, { width: colDesc2 * 0.54, lineBreak: false });
      yd2 += 13;
    }

    doc.fontSize(13).font('Helvetica-Bold').fillColor(C.primary)
       .text(formatVes(amountVes), M + colQty2 + colDesc2, y + (rowH2 / 2) - 8,
             { width: colBs2 - 4, align: 'right', lineBreak: false });
    y += rowH2 + 4;

    hLine(doc, y); y += 10;
    y = row(doc, y, 'Base imponible', formatVes(amountVes));
    y = row(doc, y, 'IVA (16%)', formatVes(ivaVes), { color: C.muted });
    y += 4; hLine(doc, y, true); y += 8;

    doc.rect(M, y, W, 44).fill(C.primary);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(C.white)
       .text('TOTAL A PAGAR (Bs.)', M + 12, y + 15, { width: W / 2, lineBreak: false });
    doc.fontSize(22).font('Helvetica-Bold').fillColor(C.gold)
       .text(formatVes(totalVes), M, y + 11, { width: W - 12, align: 'right', lineBreak: false });
    y += 54;

    /* ── Pie de página (posición fija al fondo) ───────────── */
    const footerY2 = 792 - 40;
    hLine(doc, footerY2 - 10);
    doc.fontSize(7).font('Helvetica').fillColor(C.muted)
       .text(
         `Este documento es un comprobante electrónico emitido por ${EMISOR.nombre} RIF ${EMISOR.rif}.`,
         M, footerY2, { width: W, align: 'center', lineBreak: false }
       );
    doc.fontSize(7).font('Helvetica').fillColor(C.muted)
       .text(
         `Válido sin firma ni sello.  ·  Consultas: ${EMISOR.email}`,
         M, footerY2 + 12, { width: W, align: 'center', lineBreak: false }
       );

    doc.end();
  });
}
