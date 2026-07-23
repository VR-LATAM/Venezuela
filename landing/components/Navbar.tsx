'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export function Navbar() {
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/#about',   label: 'About Us' },
    { href: '/privacy',  label: 'Privacy Policy' },
    { href: '/legal',    label: 'Legal Notice' },
    { href: '/contact',  label: 'Contact Us' },
  ];

  return (
    <nav style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <Link href="/">
          <Image src="/logo.png" alt="Verona Ride" width={140} height={56} style={{ objectFit: 'contain' }} priority />
        </Link>

        {/* Desktop nav */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }} className="hidden-mobile">
          {links.map(l => (
            <Link key={l.href} href={l.href} style={{ fontSize: 15, fontWeight: 500, color: '#374151', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#1A73E8')}
              onMouseLeave={e => (e.currentTarget.style.color = '#374151')}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }} aria-label="Menu">
          <div style={{ width: 22, height: 2, background: '#374151', marginBottom: 5 }} />
          <div style={{ width: 22, height: 2, background: '#374151', marginBottom: 5 }} />
          <div style={{ width: 22, height: 2, background: '#374151' }} />
        </button>
      </div>

      {open && (
        <div style={{ backgroundColor: '#fff', borderTop: '1px solid #e5e7eb', padding: '16px 24px' }}>
          {links.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              style={{ display: 'block', padding: '12px 0', fontSize: 16, fontWeight: 500, color: '#374151', textDecoration: 'none', borderBottom: '1px solid #f3f4f6' }}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
