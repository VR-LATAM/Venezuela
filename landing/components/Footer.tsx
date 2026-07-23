import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer style={{ backgroundColor: '#111827', color: '#9ca3af', padding: '48px 24px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, marginBottom: 40 }}>
          <div style={{ flex: '1 1 240px' }}>
            <Image src="/logo.png" alt="Verona Ride" width={140} height={56} style={{ objectFit: 'contain', marginBottom: 12 }} />
            <p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 280 }}>
              Safe, reliable, and accessible transportation for seniors and people with disabilities across the United States.
            </p>
          </div>

          <div style={{ flex: '1 1 160px' }}>
            <p style={{ color: '#fff', fontWeight: 600, marginBottom: 16, fontSize: 15 }}>Company</p>
            {[['/#about', 'About Us'], ['/contact', 'Contact Us']].map(([href, label]) => (
              <Link key={href} href={href} style={{ display: 'block', color: '#9ca3af', textDecoration: 'none', fontSize: 14, marginBottom: 10 }}>{label}</Link>
            ))}
          </div>

          <div style={{ flex: '1 1 160px' }}>
            <p style={{ color: '#fff', fontWeight: 600, marginBottom: 16, fontSize: 15 }}>Legal</p>
            {[['/privacy', 'Privacy Policy'], ['/legal', 'Legal Notice']].map(([href, label]) => (
              <Link key={href} href={href} style={{ display: 'block', color: '#9ca3af', textDecoration: 'none', fontSize: 14, marginBottom: 10 }}>{label}</Link>
            ))}
          </div>

          <div style={{ flex: '1 1 160px' }}>
            <p style={{ color: '#fff', fontWeight: 600, marginBottom: 16, fontSize: 15 }}>Contact</p>
            <p style={{ fontSize: 14, marginBottom: 8 }}>support@veronaride.app</p>
            <p style={{ fontSize: 14 }}>Texas, United States</p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #1f2937', paddingTop: 24, display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 13 }}>© {new Date().getFullYear()} Verona Ride LLC. All rights reserved.</p>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link href="/privacy" style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>Privacy</Link>
            <Link href="/legal"   style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>Legal</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
