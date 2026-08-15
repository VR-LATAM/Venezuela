import PDFDocument from 'pdfkit';
import { db } from '../config/database';
import { convertToVES } from './exchangeRateService';
import { logger } from '../utils/logger';

const IVA_RATE = 0.16;

const EMISOR = {
  nombre:    'VERONA - Technology Group C.A.',
  rif:       'J-00000000-0',
  actividad: '9609',
  direccion: [
    'Av. 8 Santa Rita, C. 60, No. 7-58,',
    'Edificio UCEZ (Al lado del Liceo U.E. Udón Pérez)',
    'Maracaibo, Estado Zulia, CP 4002. Venezuela.',
  ],
  email: 'admin@veronaride.app',
};

const ESTADOS_VE: Record<string, string> = {
  AM: 'Amazonas',        AN: 'Anzoátegui',    AP: 'Apure',
  AR: 'Aragua',          BA: 'Barinas',        BO: 'Bolívar',
  CA: 'Carabobo',        CO: 'Cojedes',        DA: 'Delta Amacuro',
  DC: 'Distrito Capital',FA: 'Falcón',         GU: 'Guárico',
  LA: 'Lara',            ME: 'Mérida',         MI: 'Miranda',
  MO: 'Monagas',         NE: 'Nueva Esparta',  PO: 'Portuguesa',
  SU: 'Sucre',           TA: 'Táchira',        TR: 'Trujillo',
  VA: 'Vargas',          YA: 'Yaracuy',        ZU: 'Zulia',
};

const SVC_CODE: Record<string, string> = {
  moto: 'VRV-MEM-01', sedan: 'VRV-MEM-02', suv: 'VRV-MEM-03',
};

const C = {
  primary: '#1a2e4a',
  gold:    '#c8a84b',
  dark:    '#1E293B',
  muted:   '#64748B',
  line:    '#CBD5E1',
  bg:      '#F8FAFC',
  white:   '#FFFFFF',
};

const M  = 42;
const PW = 612;
const PH = 792;
const W  = PW - M * 2;  // 528

/* ─── 7 columnas de tabla ─────────────────────────────────────── */
const COL_COD  = 58;
const COL_DESC = 175;
const COL_CANT = 35;
const COL_PU   = 75;
const COL_ALIC = 42;
const COL_DES  = 45;
const COL_MON  = W - COL_COD - COL_DESC - COL_CANT - COL_PU - COL_ALIC - COL_DES; // 98

/* ─── Helpers ─────────────────────────────────────────────────── */
function hLine(doc: PDFKit.PDFDocument, y: number, thick = false): void {
  doc.moveTo(M, y).lineTo(M + W, y)
    .lineWidth(thick ? 1.2 : 0.5)
    .strokeColor(thick ? C.primary : C.line)
    .stroke();
}

function formatVes(n: number): string {
  return `Bs. ${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatUsd(n: number): string {
  return `$ ${n.toFixed(2)}`;
}

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

/* ─── Datos para construir el PDF ─────────────────────────────── */
interface PDFData {
  invoiceNumber: string;
  amountUsdN:    number;
  ivaUsd:        number;
  totalUsd:      number;
  amountVes:     number;
  ivaVes:        number;
  totalVes:      number;
  rateVes:       number;
  vehicleType:   string;
  periodStart:   string;
  periodEnd:     string;
  driverName:    string;
  driverEmail:   string;
  driverCedula?: string | null;
  driverPhone?:  string | null;
  driverState?:  string | null;
  approvedAt:    Date;
}

/* ─── Constructor del PDF (compartido entre generación y descarga) */
function buildPDF(data: PDFData): Promise<Buffer> {
  const {
    invoiceNumber, amountUsdN, ivaUsd, totalUsd,
    amountVes, ivaVes, totalVes, rateVes,
    vehicleType, periodStart, periodEnd,
    driverName, driverEmail, driverCedula, driverPhone, driverState,
    approvedAt,
  } = data;

  const toStr  = (v: string) => String(v).split('T')[0];
  const ps     = toStr(periodStart).split('-').reverse().join('/');
  const pe     = toStr(periodEnd).split('-').reverse().join('/');
  const vLabel = ({ moto: 'Moto', sedan: 'Sedán', suv: 'SUV' } as Record<string, string>)[vehicleType] ?? vehicleType.toUpperCase();
  const svcCode   = SVC_CODE[vehicleType] ?? 'VRV-MEM-00';
  const domicilio = driverState
    ? `${ESTADOS_VE[driverState] ?? driverState}, Venezuela`
    : 'Venezuela';

  const fecha = approvedAt.toLocaleDateString('es-VE', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Caracas',
  });
  const hora = approvedAt.toLocaleTimeString('es-VE', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true, timeZone: 'America/Caracas',
  });
  const rateStr = rateVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalConIgtf = totalVes;

  return new Promise<Buffer>((resolve, reject) => {
    const doc    = new PDFDocument({ size: 'LETTER', margin: 0, autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on('data',  (c: Buffer) => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    /* ── 1. Barra de encabezado empresa ────────────────────── */
    doc.rect(0, 0, PW, 78).fill(C.primary);

    doc.fontSize(20).font('Helvetica-Bold').fillColor(C.white)
       .text('V-RIDE', M, 14);
    doc.fontSize(8).font('Helvetica').fillColor('rgba(255,255,255,0.65)')
       .text('VERONA Technology Group C.A.', M, 36);
    doc.fontSize(7.5).fillColor('rgba(255,255,255,0.55)')
       .text(EMISOR.direccion[0], M, 46)
       .text(EMISOR.direccion[1], M, 54)
       .text(EMISOR.direccion[2], M, 62);

    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.gold)
       .text(`RIF: ${EMISOR.rif}`, M, 14, { width: W, align: 'right', lineBreak: false });
    doc.fontSize(7).font('Helvetica').fillColor('rgba(255,255,255,0.55)')
       .text(`Código de Actividad: ${EMISOR.actividad}`, M, 26, { width: W, align: 'right', lineBreak: false });
    doc.fontSize(13).font('Helvetica-Bold').fillColor(C.white)
       .text('COMPROBANTE ELECTRÓNICO', M, 50, { width: W, align: 'right', lineBreak: false });

    let y = 92;

    /* ── 2. Receptor (izquierda) + Metadatos factura (derecha) */
    const halfW = (W - 16) / 2;  // ~256 cada columna, gap 16
    const BOX_H = 110;

    /* Caja izquierda: Datos del Receptor */
    doc.rect(M, y, halfW, BOX_H).fillAndStroke('#EFF6FF', C.line);

    let yL = y + 7;
    doc.fontSize(7).font('Helvetica-Bold').fillColor(C.muted)
       .text('DATOS DEL RECEPTOR', M + 8, yL, { characterSpacing: 0.5, lineBreak: false });
    yL += 14;
    doc.fontSize(10).font('Helvetica-Bold').fillColor(C.dark)
       .text(driverName, M + 8, yL, { width: halfW - 16, lineBreak: false });
    yL += 14;
    doc.fontSize(8.5).font('Helvetica').fillColor(C.dark)
       .text(`RIF/C.I.: ${driverCedula ?? 'No registrado'}`, M + 8, yL, { width: halfW - 16, lineBreak: false });
    yL += 13;
    doc.fontSize(8.5).font('Helvetica').fillColor(C.dark)
       .text(`Teléfono: ${driverPhone ?? 'No registrado'}`, M + 8, yL, { width: halfW - 16, lineBreak: false });
    yL += 13;
    doc.fontSize(8.5).font('Helvetica').fillColor(C.dark)
       .text(`Domicilio Fiscal: ${domicilio}`, M + 8, yL, { width: halfW - 16, lineBreak: false });
    yL += 13;
    doc.fontSize(8.5).font('Helvetica').fillColor(C.muted)
       .text(`Correo: ${driverEmail}`, M + 8, yL, { width: halfW - 16, lineBreak: false });

    /* Caja derecha: Datos de la Factura */
    const xR = M + halfW + 16;
    doc.rect(xR, y, halfW, BOX_H).fillAndStroke('#EFF6FF', C.line);

    doc.fontSize(7).font('Helvetica-Bold').fillColor(C.muted)
       .text('FACTURA', xR + 8, y + 7, { characterSpacing: 1, lineBreak: false });

    const metaFields: [string, string][] = [
      ['Nº de Documento:',     invoiceNumber],
      ['Fecha de Emisión:',    fecha],
      ['Hora de Emisión:',     hora],
      ['Nº de Control:',       invoiceNumber],
      ['Condiciones de pago:', 'Pago inmediato'],
      ['Tasa de cambio:',      `1 USD = Bs. ${rateStr}`],
      ['Moneda:',              'Bolívares (Bs.)'],
    ];
    let yR = y + 21;
    const lblW = halfW * 0.44;
    const valW = halfW * 0.52;
    for (const [lbl, val] of metaFields) {
      doc.fontSize(7.5).font('Helvetica').fillColor(C.muted)
         .text(lbl, xR + 8, yR, { width: lblW, lineBreak: false });
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C.dark)
         .text(val, xR + 8 + lblW, yR, { width: valW, lineBreak: false });
      yR += 12;
    }

    y += BOX_H + 8;

    /* ── 3. Cabecera de tabla (7 columnas) ──────────────────── */
    doc.rect(M, y, W, 22).fill(C.primary);

    const tHdrs: [string, number, 'left' | 'center' | 'right'][] = [
      ['CÓDIGO',       COL_COD,  'center'],
      ['DESCRIPCIÓN',  COL_DESC, 'left'],
      ['CANT.',        COL_CANT, 'center'],
      ['PRECIO UNIT.', COL_PU,   'right'],
      ['IVA',          COL_ALIC, 'center'],
      ['PROMO.',       COL_DES,  'right'],
      ['MONTO',        COL_MON,  'right'],
    ];
    let xCol = M;
    for (const [lbl, cw, align] of tHdrs) {
      doc.fontSize(7).font('Helvetica-Bold').fillColor(C.white)
         .text(lbl, xCol + 3, y + 8, { width: cw - 6, align, lineBreak: false });
      xCol += cw;
    }
    y += 26;

    /* ── 4. Fila de ítem ────────────────────────────────────── */
    const ROW_H = 88;
    doc.rect(M, y, W, ROW_H).fill(C.bg);

    const mid = y + ROW_H / 2 - 5;

    // Código
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.dark)
       .text(svcCode, M + 3, mid, { width: COL_COD - 6, align: 'center', lineBreak: false });

    // Descripción: igual a YUMI con fechas y hora
    const xDesc2 = M + COL_COD + 4;
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(C.dark)
       .text(
         `Suscripción semanal a la plataforma digital V-Ride para intermediación y coordinación de servicios de transporte — ${vLabel}`,
         xDesc2, y + 8, { width: COL_DESC - 8 }
       );
    doc.fontSize(8).font('Helvetica').fillColor(C.muted)
       .text(
         `de ${toStr(periodStart)} 00:00 a ${toStr(periodEnd)} 23:59`,
         xDesc2, y + 46, { width: COL_DESC - 8, lineBreak: false }
       );
    doc.fontSize(7.5).font('Helvetica').fillColor('#78350F')
       .text(`${formatUsd(amountUsdN)} × Bs. ${rateStr} (BCV)`, xDesc2, y + 58, { width: COL_DESC - 8, lineBreak: false });

    // Cantidad
    const xCant2 = M + COL_COD + COL_DESC;
    doc.fontSize(11).font('Helvetica-Bold').fillColor(C.dark)
       .text('1', xCant2 + 3, mid, { width: COL_CANT - 6, align: 'center', lineBreak: false });

    // Precio Unitario
    const xPU2 = xCant2 + COL_CANT;
    doc.fontSize(8.5).font('Helvetica').fillColor(C.dark)
       .text(formatVes(amountVes), xPU2 + 3, mid, { width: COL_PU - 6, align: 'right', lineBreak: false });

    // Alícuota
    const xAlic2 = xPU2 + COL_PU;
    doc.fontSize(8.5).font('Helvetica').fillColor(C.dark)
       .text('16,00%', xAlic2 + 3, mid, { width: COL_ALIC - 6, align: 'center', lineBreak: false });

    // Descuento
    const xDes2 = xAlic2 + COL_ALIC;
    doc.fontSize(8.5).font('Helvetica').fillColor(C.dark)
       .text('0,00', xDes2 + 3, mid, { width: COL_DES - 6, align: 'right', lineBreak: false });

    // Monto
    const xMon2 = xDes2 + COL_DES;
    doc.fontSize(10).font('Helvetica-Bold').fillColor(C.primary)
       .text(formatVes(amountVes), xMon2 + 3, mid, { width: COL_MON - 6, align: 'right', lineBreak: false });

    y += ROW_H + 6;

    /* ── 5. Totales ─────────────────────────────────────────── */
    hLine(doc, y);
    y += 10;

    /* Nota de tasa BCV (izquierda) */
    doc.fontSize(7).font('Helvetica').fillColor(C.muted)
       .text(
         'Tasa de cambio BCV. Si su pago es en moneda extranjera recuerde\npagar el 3% de IGTF, según Gaceta Oficial N° 42.339 del 17/03/2022.',
         M, y, { width: W * 0.50, lineBreak: true }
       );

    /* Bloque de totales (derecha) */
    const totW = W * 0.46;
    const totX = M + W - totW;

    const totRows: [string, string, boolean, string?][] = [
      ['Promoción:',              formatVes(0),        false],
      ['Base Imponible 16,00%:', formatVes(amountVes), false],
      ['IVA 16,00%:',            formatVes(ivaVes),    false, C.muted],
      ['Total Factura:',         formatVes(totalVes),  true],
      ['Base Imponible IGTF:',   formatVes(0),         false],
      ['IGTF 3,00%:',            formatVes(0),         false, C.muted],
    ];

    let yTot = y;
    for (const [lbl, val, bold, color] of totRows) {
      const font = bold ? 'Helvetica-Bold' : 'Helvetica';
      const col  = color ?? C.dark;
      doc.fontSize(9).font(font).fillColor(col)
         .text(lbl, totX, yTot, { width: totW * 0.58, lineBreak: false });
      doc.fontSize(9).font(font).fillColor(col)
         .text(val, totX + totW * 0.58, yTot, { width: totW * 0.42, align: 'right', lineBreak: false });
      yTot += 16;
    }

    y = yTot + 4;
    hLine(doc, y, true);
    y += 8;

    /* Caja TOTAL CON IGTF */
    doc.rect(M, y, W, 44).fill(C.primary);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(C.white)
       .text('TOTAL CON IGTF 3,00% (Bs.)', M + 12, y + 15, { width: W / 2, lineBreak: false });
    doc.fontSize(22).font('Helvetica-Bold').fillColor(C.gold)
       .text(formatVes(totalConIgtf), M, y + 11, { width: W - 12, align: 'right', lineBreak: false });
    y += 54;

    /* ── 6. Pie de página legal (posición fija) ─────────────── */
    const FOOTER_Y = PH - 120;

    hLine(doc, FOOTER_Y - 4);

    doc.fontSize(6.5).font('Helvetica').fillColor(C.muted)
       .text(
         'El monto reflejado en este documento podrá estar sujeto al pago adicional del 3% por concepto del Impuesto a las ' +
         'Grandes Transacciones Financieras (IGTF), según lo dispuesto en la Providencia Administrativa SNAT/2022/000013 ' +
         '(G.O. N° 42.339 del 17/03/2022), únicamente cuando el pago se efectúe en moneda extranjera. No aplica para pagos en Bolívares.',
         M, FOOTER_Y, { width: W }
       );

    doc.fontSize(6.5).font('Helvetica').fillColor(C.muted)
       .text(
         'Los montos expresados en Bolívares se calculan aplicando el tipo de cambio oficial publicado por el Banco Central ' +
         'de Venezuela (BCV) a la fecha de emisión del presente comprobante, en cumplimiento del artículo 13 numeral 14 de la ' +
         'Providencia SNAT/2011/0071, el artículo 128 de la Ley del BCV, el artículo 25 de la Ley del IVA y el artículo 38 de su Reglamento (RLIVA).',
         M, FOOTER_Y + 24, { width: W }
       );

    doc.fontSize(6.5).font('Helvetica').fillColor(C.muted)
       .text(
         `Documento electrónico generado por ${EMISOR.nombre} · RIF ${EMISOR.rif} · ` +
         'Emitido conforme a la Providencia Administrativa SNAT/2024/000102 del 17/10/2024.',
         M, FOOTER_Y + 56, { width: W, align: 'center', lineBreak: false }
       );

    hLine(doc, PH - 28);
    doc.fontSize(7).font('Helvetica').fillColor(C.muted)
       .text(
         `Válido sin firma ni sello.  ·  Consultas: ${EMISOR.email}`,
         M, PH - 22, { width: W, align: 'center', lineBreak: false }
       );

    doc.end();
  });
}

/* ─── Interfaces públicas ─────────────────────────────────────── */
export interface InvoiceInput {
  membershipId:  string;
  amountUsd:     number;
  vehicleType:   string;
  periodStart:   string;
  periodEnd:     string;
  driverName:    string;
  driverEmail:   string;
  driverCedula?: string | null;
  driverPhone?:  string | null;
  driverState?:  string | null;
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

/* ─── Generación de factura nueva ────────────────────────────── */
export async function generateMembershipInvoice(input: InvoiceInput): Promise<InvoiceResult> {
  const {
    membershipId, amountUsd, vehicleType, driverName, driverEmail,
    driverCedula, driverPhone, driverState, approvedAt,
  } = input;
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

  const pdfBuffer = await buildPDF({
    invoiceNumber, amountUsdN, ivaUsd, totalUsd,
    amountVes, ivaVes, totalVes, rateVes,
    vehicleType, periodStart, periodEnd,
    driverName, driverEmail, driverCedula, driverPhone, driverState,
    approvedAt,
  });

  logger.info(`Factura membresía generada: ${invoiceNumber} — ${driverName}`);
  return { invoiceNumber, pdfBuffer, amountUsd: amountUsdN, ivaUsd, totalUsd, amountVes, ivaVes, totalVes, rateVes };
}

/* ─── Regenerar PDF desde datos guardados (descarga) ─────────── */
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
    driver_phone:         string | null;
    driver_state:         string | null;
  }>(
    `SELECT dm.invoice_number, dm.invoice_rate_ves, dm.invoice_amount_ves,
            dm.invoice_iva_ves, dm.invoice_total_ves, dm.invoice_generated_at,
            dm.amount_usd, dm.vehicle_type, dm.period_start, dm.period_end, dm.approved_at,
            u.name  AS driver_name,
            u.email AS driver_email,
            u.cedula     AS driver_cedula,
            u.phone      AS driver_phone,
            u.state_code AS driver_state
     FROM driver_memberships dm
     JOIN users u ON u.id = dm.driver_id
     WHERE dm.id = $1 AND dm.driver_id = $2 AND dm.invoice_number IS NOT NULL`,
    [membershipId, driverId]
  );

  const m = rows[0];
  if (!m || !m.invoice_number) return null;

  const toStr = (v: Date | string): string =>
    v instanceof Date ? v.toISOString().split('T')[0] : String(v).split('T')[0];

  const amountVes  = Number(m.invoice_amount_ves ?? 0);
  const ivaVes     = Number(m.invoice_iva_ves    ?? 0);
  const totalVes   = Number(m.invoice_total_ves  ?? 0);
  const rateVes    = Number(m.invoice_rate_ves   ?? 0);
  const amountUsdN = Number(m.amount_usd);
  const ivaUsd     = parseFloat((amountUsdN * IVA_RATE).toFixed(2));
  const totalUsd   = parseFloat((amountUsdN + ivaUsd).toFixed(2));
  const approvedAt = m.approved_at ? new Date(m.approved_at) : new Date();

  return buildPDF({
    invoiceNumber: m.invoice_number,
    amountUsdN, ivaUsd, totalUsd,
    amountVes, ivaVes, totalVes, rateVes,
    vehicleType:  m.vehicle_type,
    periodStart:  toStr(m.period_start as any),
    periodEnd:    toStr(m.period_end   as any),
    driverName:   m.driver_name,
    driverEmail:  m.driver_email,
    driverCedula: m.driver_cedula,
    driverPhone:  m.driver_phone,
    driverState:  m.driver_state,
    approvedAt,
  });
}
