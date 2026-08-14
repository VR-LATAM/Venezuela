// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio de email — envío de recibos PDF con nodemailer
// Usa SMTP configurable; en desarrollo imprime el preview URL
// ═══════════════════════════════════════════════════════════════

import nodemailer from 'nodemailer';
import { receiptService, RideReceiptData } from './receiptService';
import { logger } from '../utils/logger';
import type { InvoiceResult } from './membershipInvoiceService';

async function createTransport(): Promise<nodemailer.Transporter> {
  // Gmail con App Password
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    });
  }

  // SMTP genérico
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
    });
  }

  // Sin credenciales → Ethereal (cuenta de prueba automática, muestra preview URL)
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
}

export const emailService = {

  sendEmergencyAlert: async (params: {
    toEmail: string;
    toName: string;
    passengerName: string;
    address: string;
    mapLink: string;
    time: string;
  }): Promise<void> => {
    const { toEmail, toName, passengerName, address, mapLink, time } = params;
    try {
      const transport = await createTransport();
      const from = process.env.GMAIL_USER ?? process.env.SMTP_USER ?? 'noreply@vride.com';
      await transport.sendMail({
        from:    `"Verona Ride Safety" <${from}>`,
        to:      toEmail,
        subject: `🚨 EMERGENCY ALERT — ${passengerName} activated SOS`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1E293B">
            <div style="background:#DC2626;padding:28px 32px;border-radius:12px 12px 0 0">
              <h1 style="margin:0;color:#fff;font-size:22px">🚨 EMERGENCY ALERT</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px">Verona Ride Safety System</p>
            </div>
            <div style="background:#FFF5F5;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #FECACA;border-top:none">
              <p style="font-size:16px;margin-bottom:16px">Hi <strong>${toName}</strong>,</p>
              <p style="font-size:15px;margin-bottom:20px;color:#DC2626;font-weight:600">
                ${passengerName} has activated the Emergency SOS button in their Verona Ride app.
              </p>
              <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">
                <tr><td style="padding:8px 0;color:#64748B">Passenger</td><td style="color:#1E293B;font-weight:600">${passengerName}</td></tr>
                <tr><td style="padding:8px 0;color:#64748B">Last known location</td><td style="color:#1E293B">${address}</td></tr>
                <tr><td style="padding:8px 0;color:#64748B">Time</td><td style="color:#1E293B">${time}</td></tr>
              </table>
              <a href="${mapLink}" style="display:block;background:#DC2626;color:#fff;text-align:center;padding:14px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;margin-bottom:16px">
                📍 View Location on Map
              </a>
              <p style="font-size:13px;color:#64748B">
                The Verona Ride safety team has also been notified and is responding.
                If you cannot reach ${passengerName}, please call 911 immediately.
              </p>
            </div>
          </div>
        `,
      });
    } catch (err) {
      logger.error('Failed to send emergency alert email:', err);
    }
  },

  sendReceipt: async (data: RideReceiptData): Promise<void> => {
    const { ride } = data;
    const transport = createTransport();

    const rideDate = new Date(ride.completed_at ?? ride.created_at)
      .toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const subject = `Your Verona Ride receipt — $${Number(ride.total_charged ?? 0).toFixed(2)}`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1E293B">
        <div style="background:#2563EB;padding:28px 32px;border-radius:12px 12px 0 0">
          <h1 style="margin:0;color:#fff;font-size:24px;letter-spacing:-0.5px">V-RIDE</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px">Trip receipt</p>
        </div>
        <div style="background:#F8FAFC;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #E2E8F0;border-top:none">
          <p style="margin:0 0 4px;font-size:14px;color:#64748B">Hi <strong style="color:#1E293B">${ride.passenger_name}</strong>,</p>
          <p style="margin:0 0 24px;font-size:14px;color:#64748B">Here's your receipt for your trip on ${rideDate}.</p>

          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><td style="padding:6px 0;font-size:14px;color:#64748B">From</td>
                <td style="padding:6px 0;font-size:14px;color:#1E293B;text-align:right">${ride.pickup_address}</td></tr>
            <tr><td style="padding:6px 0;font-size:14px;color:#64748B">To</td>
                <td style="padding:6px 0;font-size:14px;color:#1E293B;text-align:right">${ride.dropoff_address}</td></tr>
            <tr><td style="padding:6px 0;font-size:14px;color:#64748B">Driver</td>
                <td style="padding:6px 0;font-size:14px;color:#1E293B;text-align:right">${ride.driver_name}</td></tr>
            <tr><td style="padding:6px 0;font-size:14px;color:#64748B">Distance</td>
                <td style="padding:6px 0;font-size:14px;color:#1E293B;text-align:right">${Number(ride.distance_km ?? 0).toFixed(2)} mi</td></tr>
            <tr><td style="padding:6px 0;font-size:14px;color:#64748B">Duration</td>
                <td style="padding:6px 0;font-size:14px;color:#1E293B;text-align:right">${ride.duration_minutes ?? 0} min</td></tr>
          </table>

          <div style="background:#2563EB;border-radius:10px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center">
            <span style="color:#fff;font-size:15px;font-weight:600">Total charged</span>
            <span style="color:#fff;font-size:22px;font-weight:700">$${Number(ride.total_charged ?? 0).toFixed(2)}</span>
          </div>

          <p style="margin:24px 0 0;font-size:12px;color:#94A3B8;text-align:center">
            The PDF receipt is attached to this email.<br>
            Questions? Contact us at support@veronaride.app
          </p>
        </div>
      </div>
    `;

    const filename = `receipt-vride-${ride.id.slice(0, 8).toUpperCase()}.pdf`;

    try {
      const [transport, pdfBuffer] = await Promise.all([
        createTransport(),
        receiptService.generatePDFBuffer(data),
      ]);

      const from = process.env.GMAIL_USER ?? process.env.SMTP_USER ?? 'noreply@vride.com';
      const info = await transport.sendMail({
        from:        `"Verona Ride" <${from}>`,
        to:          ride.passenger_email,
        subject,
        html,
        attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }],
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info(`📧 Receipt email preview (Ethereal): ${previewUrl}`);
      } else {
        logger.info(`Receipt email sent to ${ride.passenger_email} for ride ${ride.id}`);
      }
    } catch (err) {
      logger.error(`Failed to send receipt email for ride ${ride.id}:`, err);
    }
  },

  sendMembershipInvoice: async (params: {
    toEmail:       string;
    toName:        string;
    invoice:       InvoiceResult;
    vehicleType:   string;
    periodStart:   string;
    periodEnd:     string;
  }): Promise<void> => {
    const { toEmail, toName, invoice, vehicleType, periodStart, periodEnd } = params;

    const vehicleLabel: Record<string, string> = { moto: 'Moto', sedan: 'Sedán', suv: 'SUV' };
    const vLabel = vehicleLabel[vehicleType] ?? vehicleType.toUpperCase();

    const fmt = (iso: string) => iso.split('-').reverse().join('/');
    const fmtVes = (n: number) => `Bs. ${n.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;

    const subject = `Tu comprobante de membresía V-Ride — ${invoice.invoiceNumber}`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;color:#1E293B">
        <div style="background:#1a2e4a;padding:28px 32px;border-radius:12px 12px 0 0;border-bottom:4px solid #c8a84b">
          <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:-0.5px">V-RIDE</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.65);font-size:12px">VERONA - Technology Group C.A.  ·  RIF J-00000000-0</p>
          <p style="margin:8px 0 0;color:#c8a84b;font-size:13px;font-weight:700">COMPROBANTE ELECTRÓNICO</p>
        </div>

        <div style="background:#F8FAFC;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #E2E8F0;border-top:none">
          <p style="margin:0 0 4px;font-size:14px">Hola <strong>${toName}</strong>,</p>
          <p style="margin:0 0 24px;font-size:13px;color:#64748B">
            Tu membresía semanal <strong>${vLabel}</strong> ha sido aprobada y activada.<br>
            Período: <strong>${fmt(periodStart)} al ${fmt(periodEnd)}</strong>
          </p>

          <table style="width:100%;border-collapse:collapse;margin-bottom:4px">
            <tr style="background:#1a2e4a">
              <td style="padding:8px 10px;color:#fff;font-size:12px;font-weight:700">DESCRIPCIÓN</td>
              <td style="padding:8px 10px;color:#fff;font-size:12px;font-weight:700;text-align:right">MONTO</td>
            </tr>
            <tr style="background:#fff">
              <td style="padding:10px;font-size:14px;color:#1E293B">Membresía Semanal — ${vLabel}<br>
                <span style="font-size:11px;color:#64748B">Período: ${fmt(periodStart)} al ${fmt(periodEnd)}</span>
              </td>
              <td style="padding:10px;font-size:14px;color:#1E293B;text-align:right;font-weight:700">${fmtVes(invoice.amountVes)}</td>
            </tr>
            <tr style="background:#F8FAFC">
              <td style="padding:8px 10px;font-size:13px;color:#64748B">IVA (16%)</td>
              <td style="padding:8px 10px;font-size:13px;color:#64748B;text-align:right">${fmtVes(invoice.ivaVes)}</td>
            </tr>
            <tr style="background:#1a2e4a">
              <td style="padding:10px 10px;color:#fff;font-size:14px;font-weight:700">TOTAL</td>
              <td style="padding:10px 10px;color:#c8a84b;font-size:18px;font-weight:700;text-align:right">${fmtVes(invoice.totalVes)}</td>
            </tr>
          </table>

          <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:12px 14px;margin:16px 0;font-size:12px;color:#78350F">
            <strong>Nota informativa (USD):</strong><br>
            Base: $${invoice.amountUsd.toFixed(2)} + IVA: $${invoice.ivaUsd.toFixed(2)} = <strong>Total: $${invoice.totalUsd.toFixed(2)}</strong><br>
            Tasa BCV aplicada: 1 USD = Bs. ${invoice.rateVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
          </div>

          <p style="font-size:12px;color:#94A3B8;text-align:center;margin-top:20px">
            El comprobante en PDF está adjunto a este correo.<br>
            N° de control: <strong>${invoice.invoiceNumber}</strong><br>
            También puedes descargarlo desde la app en cualquier momento.
          </p>
        </div>
      </div>
    `;

    try {
      const [transport] = await Promise.all([createTransport()]);
      const from     = process.env.GMAIL_USER ?? process.env.SMTP_USER ?? 'noreply@vride.com';
      const filename = `factura-membresia-${invoice.invoiceNumber}.pdf`;
      const info = await transport.sendMail({
        from:        `"V-Ride Venezuela" <${from}>`,
        to:          toEmail,
        subject,
        html,
        attachments: [{ filename, content: invoice.pdfBuffer, contentType: 'application/pdf' }],
      });
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info(`📧 Invoice email preview (Ethereal): ${previewUrl}`);
      } else {
        logger.info(`Invoice email sent to ${toEmail} — ${invoice.invoiceNumber}`);
      }
    } catch (err) {
      logger.error(`Failed to send membership invoice email to ${toEmail}:`, err);
    }
  },
};
