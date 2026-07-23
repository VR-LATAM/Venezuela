import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Contact Us — Verona Ride' };

export default function ContactPage() {
  return (
    <section style={{ maxWidth: 780, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 800, marginBottom: 12 }}>Contact Us</h1>
      <p style={{ color: '#6b7280', fontSize: 17, marginBottom: 56, lineHeight: 1.7 }}>
        We're here to help. Reach out with any questions about our service, the app, or becoming a driver.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 24, marginBottom: 64 }}>
        {[
          { icon: '📧', title: 'General Support', desc: 'For questions about rides, your account, or the app.', value: 'support@veronaride.app', href: 'mailto:support@veronaride.app' },
          { icon: '🚗', title: 'Become a Driver', desc: 'Interested in driving with Verona Ride? We want to hear from you.', value: 'drivers@veronaride.app', href: 'mailto:drivers@veronaride.app' },
          { icon: '🏢', title: 'Business Inquiries', desc: 'Partnerships, media, and corporate transportation.', value: 'business@veronaride.app', href: 'mailto:business@veronaride.app' },
        ].map(card => (
          <div key={card.title} style={{ backgroundColor: '#f9fafb', borderRadius: 16, padding: '28px 24px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 32, marginBottom: 14 }}>{card.icon}</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{card.title}</h3>
            <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{card.desc}</p>
            <a href={card.href} style={{ color: '#1A73E8', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>{card.value}</a>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: '#f0f7ff', borderRadius: 16, padding: '32px 28px', border: '1px solid #bfdbfe' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Frequently Asked Questions</h2>
        {[
          { q: 'Where is Verona Ride available?', a: 'We are currently operating in Texas and expanding to other states. Check the app for real-time coverage in your area.' },
          { q: 'Is the app free to download?', a: 'Yes. Downloading the Verona Ride app is completely free for both passengers and drivers.' },
          { q: 'How are drivers verified?', a: 'Every driver undergoes a thorough background check, DMV record review, and in-person vehicle inspection before being approved.' },
          { q: 'Can I schedule a ride in advance?', a: 'Yes. You can schedule rides up to 7 days in advance directly from the app.' },
          { q: 'What if I need a wheelchair-accessible vehicle?', a: 'Select "Accessible" when booking and we will match you with a vehicle equipped for your needs.' },
        ].map(({ q, a }) => (
          <div key={q} style={{ borderBottom: '1px solid #dbeafe', paddingBottom: 20, marginBottom: 20 }}>
            <p style={{ fontWeight: 600, marginBottom: 6, color: '#1e40af' }}>{q}</p>
            <p style={{ color: '#374151', fontSize: 15, lineHeight: 1.7 }}>{a}</p>
          </div>
        ))}
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 8 }}>
          Still have questions? Email us at{' '}
          <a href="mailto:support@veronaride.app" style={{ color: '#1A73E8' }}>support@veronaride.app</a>.
        </p>
      </div>
    </section>
  );
}
