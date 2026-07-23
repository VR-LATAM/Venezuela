// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio de recibos PDF — una sola página A4
// ═══════════════════════════════════════════════════════════════

import PDFDocument from 'pdfkit';
import { Ride } from '@vride/shared';

export interface RideReceiptData {
  ride: Ride & {
    passenger_name:   string;
    passenger_email:  string;
    driver_name:      string;
    driver_vehicle:   string;
    pickup_lat:       number;
    pickup_lng:       number;
    dropoff_lat:      number;
    dropoff_lng:      number;
  };
}

const C = {
  primary: '#2563EB',
  dark:    '#1E293B',
  muted:   '#64748B',
  line:    '#CBD5E1',
  bg:      '#F8FAFC',
  green:   '#22C55E',
  white:   '#FFFFFF',
};

const M  = 40;          // margen lateral
const PW = 595;         // ancho A4
const PH = 842;         // alto A4
const W  = PW - M * 2; // ancho útil = 515

export const receiptService = {

  generatePDFBuffer: (data: RideReceiptData): Promise<Buffer> =>
    new Promise((resolve, reject) => {
      const doc = receiptService.generatePDF(data);
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end',  () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    }),

  generatePDF: (data: RideReceiptData): PDFKit.PDFDocument => {
    const { ride } = data;
    const doc = new PDFDocument({ size: 'A4', margin: M, autoFirstPage: true, info: {
      Title:  `Verona Ride Receipt — ${ride.id.slice(0, 8).toUpperCase()}`,
      Author: 'Verona Ride',
    }});

    let y = 0;

    // ── HEADER (altura 70) ────────────────────────────────────────
    doc.rect(0, 0, PW, 70).fill(C.primary);
    doc.fontSize(24).font('Helvetica-Bold').fillColor(C.white).text('V-RIDE', M, 16);
    doc.fontSize(10).font('Helvetica').fillColor('rgba(255,255,255,0.7)').text('Trip Receipt', M, 44);
    doc.fontSize(9).fillColor('rgba(255,255,255,0.55)')
       .text('support@veronaride.app', PW - M - 130, 44, { width: 130, align: 'right' });

    y = 82;

    // ── RECEIPT # + DATE ──────────────────────────────────────────
    const rideDate = new Date(ride.completed_at ?? ride.created_at)
      .toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    doc.fontSize(9).font('Helvetica').fillColor(C.muted)
       .text(`Receipt #${ride.id.slice(0, 8).toUpperCase()}`, M, y);
    doc.fontSize(9).fillColor(C.muted)
       .text(rideDate, M, y, { width: W, align: 'right' });
    y += 16;
    hLine(doc, y); y += 12;

    // ── PASSENGER / DRIVER ────────────────────────────────────────
    const half = W / 2 - 8;

    doc.fontSize(7).font('Helvetica-Bold').fillColor(C.muted)
       .text('PASSENGER', M, y);
    doc.fontSize(7).font('Helvetica-Bold').fillColor(C.muted)
       .text('DRIVER', M + W / 2, y);
    y += 12;

    doc.fontSize(12).font('Helvetica-Bold').fillColor(C.dark)
       .text(ride.passenger_name ?? '—', M, y, { width: half, lineBreak: false });
    doc.fontSize(12).font('Helvetica-Bold').fillColor(C.dark)
       .text(ride.driver_name ?? '—', M + W / 2, y, { width: half, lineBreak: false });
    y += 15;

    doc.fontSize(9).font('Helvetica').fillColor(C.muted)
       .text(ride.passenger_email ?? '', M, y, { width: half, lineBreak: false });
    doc.fontSize(9).font('Helvetica').fillColor(C.muted)
       .text(ride.driver_vehicle ?? '', M + W / 2, y, { width: half, lineBreak: false });
    y += 18;

    hLine(doc, y); y += 12;

    // ── ROUTE ─────────────────────────────────────────────────────
    doc.fontSize(7).font('Helvetica-Bold').fillColor(C.muted).text('ROUTE', M, y);
    y += 12;

    doc.circle(M + 5, y + 4, 4).fill(C.green);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.muted)
       .text('PICKUP', M + 16, y, { width: 50, lineBreak: false });
    doc.fontSize(10).font('Helvetica').fillColor(C.dark)
       .text(ride.pickup_address ?? '—', M + 70, y, { width: W - 70, lineBreak: false });
    y += 16;

    doc.rect(M + 2, y + 2, 6, 6).fill(C.primary);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.muted)
       .text('DROP-OFF', M + 16, y, { width: 50, lineBreak: false });
    doc.fontSize(10).font('Helvetica').fillColor(C.dark)
       .text(ride.dropoff_address ?? '—', M + 70, y, { width: W - 70, lineBreak: false });
    y += 20;

    hLine(doc, y); y += 12;

    // ── TRIP DETAILS ──────────────────────────────────────────────
    doc.fontSize(7).font('Helvetica-Bold').fillColor(C.muted).text('TRIP DETAILS', M, y);
    y += 11;

    const bw = Math.floor(W / 3) - 5;
    metricBox(doc, M,              y, bw, `${Number(ride.distance_km ?? 0).toFixed(2)} mi`, 'Distance');
    metricBox(doc, M + W/3,        y, bw, `${Number(ride.duration_minutes ?? 0)} min`,      'Duration');
    metricBox(doc, M + (W/3) * 2,  y, bw, (ride.service_type ?? '').toUpperCase(),          'Service');
    y += 52;

    hLine(doc, y); y += 12;

    // ── FARE BREAKDOWN ────────────────────────────────────────────
    doc.fontSize(7).font('Helvetica-Bold').fillColor(C.muted).text('FARE BREAKDOWN', M, y);
    y += 13;

    y = fareRow(doc, y, 'Base fare',     ride.base_fare);
    y = fareRow(doc, y, 'Distance fare', ride.distance_fare);
    y = fareRow(doc, y, 'Time fare',     ride.time_fare);

    // Mostrar subtotal antes de multiplicadores
    const baseSum = Number(ride.base_fare ?? 0) + Number(ride.distance_fare ?? 0) + Number(ride.time_fare ?? 0);

    // Dashed separator
    doc.moveTo(M, y).lineTo(M + W, y).dash(2, { space: 3 }).lineWidth(0.5).strokeColor(C.line).stroke();
    doc.undash(); y += 8;

    if (Number(ride.surge_multiplier ?? 1) > 1) {
      const surgeAdded = Number(ride.subtotal) - baseSum;
      y = fareRow(doc, y, 'Subtotal', baseSum);
      y = fareRow(doc, y, `Surge ×${Number(ride.surge_multiplier).toFixed(2)}`, surgeAdded, false, true);
      hLine(doc, y); y += 8;
      y = fareRow(doc, y, 'After surge', Number(ride.subtotal), true);
    } else if (Number(ride.service_multiplier ?? 1) > 1) {
      const label = (ride.service_type ?? 'Service').charAt(0).toUpperCase() + (ride.service_type ?? '').slice(1);
      const multiplierAdded = Number(ride.subtotal) - baseSum;
      y = fareRow(doc, y, 'Subtotal', baseSum);
      y = fareRow(doc, y, `${label} ×${Number(ride.service_multiplier).toFixed(2)}`, multiplierAdded, false, true);
      hLine(doc, y); y += 8;
      y = fareRow(doc, y, 'After multiplier', Number(ride.subtotal), true);
    } else {
      y = fareRow(doc, y, 'Subtotal', ride.subtotal, true);
    }

    y += 6;

    // ── TOTAL BOX ─────────────────────────────────────────────────
    doc.rect(M, y, W, 40).fill(C.primary);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(C.white)
       .text('TOTAL CHARGED', M + 14, y + 13, { width: W / 2, lineBreak: false });
    doc.fontSize(20).font('Helvetica-Bold').fillColor(C.white)
       .text(`$${Number(ride.total_charged ?? 0).toFixed(2)}`, M, y + 10, { width: W - 14, align: 'right', lineBreak: false });
    y += 48;

    // ── PAYMENT STATUS ────────────────────────────────────────────
    const payOk = ride.payment_status === 'completed';
    const sc = payOk ? C.green : '#EF4444';
    doc.rect(M, y, W, 26).fill(payOk ? '#F0FDF4' : '#FEF2F2');
    doc.moveTo(M, y).lineTo(M, y + 26).lineWidth(3).strokeColor(sc).stroke();
    doc.fontSize(10).font('Helvetica-Bold').fillColor(sc)
       .text(
         payOk ? '✓  Payment processed successfully' : '✗  Payment pending',
         M + 10, y + 8, { width: W - 14, lineBreak: false }
       );
    y += 34;

    // ── FOOTER ────────────────────────────────────────────────────
    hLine(doc, y); y += 8;
    doc.fontSize(7.5).font('Helvetica').fillColor(C.muted)
       .text(
         'This is an official payment receipt issued by Verona Ride LLC.  ·  Disputes must be reported to support@veronaride.app within 7 days.',
         M, y, { width: W, align: 'center', lineBreak: false }
       );

    doc.end();
    return doc;
  },
};

// ── Helpers ───────────────────────────────────────────────────

function hLine(doc: PDFKit.PDFDocument, y: number): void {
  doc.moveTo(M, y).lineTo(M + W, y).lineWidth(0.5).strokeColor(C.line).stroke();
}

function fareRow(
  doc:      PDFKit.PDFDocument,
  y:        number,
  label:    string,
  amount?:  number | null,
  bold?:    boolean,
  additive?: boolean,
): number {
  const font  = bold ? 'Helvetica-Bold' : 'Helvetica';
  const amtW  = 80;
  const lblW  = W - amtW;

  doc.fontSize(10).font(font).fillColor(bold ? C.dark : C.muted)
     .text(label, M, y, { width: lblW, lineBreak: false });

  if (amount !== undefined && amount !== null) {
    const formatted = additive ? `+$${Number(amount).toFixed(2)}` : `$${Number(amount).toFixed(2)}`;
    doc.fontSize(10).font(font).fillColor(additive ? C.green : C.dark)
       .text(formatted, M + lblW, y, { width: amtW, align: 'right', lineBreak: false });
  }

  return y + 16;
}

function metricBox(
  doc:   PDFKit.PDFDocument,
  x:     number,
  y:     number,
  w:     number,
  value: string,
  label: string
): void {
  doc.rect(x, y, w, 44).fillAndStroke(C.bg, C.line);
  doc.fontSize(14).font('Helvetica-Bold').fillColor(C.dark)
     .text(value, x + 4, y + 6, { width: w - 8, align: 'center', lineBreak: false });
  doc.fontSize(8).font('Helvetica').fillColor(C.muted)
     .text(label, x + 4, y + 28, { width: w - 8, align: 'center', lineBreak: false });
}
