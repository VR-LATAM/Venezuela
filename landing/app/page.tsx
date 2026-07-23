import Image from 'next/image';
import Link from 'next/link';

const features = [
  { icon: '♿', title: 'Fully Accessible', desc: 'Vehicles equipped for wheelchairs, walkers, and special mobility needs.' },
  { icon: '🛡️', title: 'Safe & Verified', desc: 'All drivers are background-checked and trained for elder care.' },
  { icon: '📍', title: 'Nationwide Coverage', desc: 'Available across the United States, starting in Texas.' },
  { icon: '📞', title: '24/7 Support', desc: 'Emergency SOS button and live support available at all times.' },
  { icon: '💳', title: 'Easy Payments', desc: 'Pay securely by card. No cash needed, no hidden fees.' },
  { icon: '⏰', title: 'Schedule in Advance', desc: 'Book rides ahead of time for appointments and important events.' },
];

const steps = [
  { n: '1', title: 'Download the App', desc: 'Available on iOS and Android. Free to download.' },
  { n: '2', title: 'Book Your Ride', desc: 'Enter your destination and select your vehicle type.' },
  { n: '3', title: 'Ride Safely', desc: 'A verified driver picks you up and takes you to your destination.' },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section style={{ background: 'linear-gradient(135deg,#1A73E8 0%,#0d5ec7 100%)', color: '#fff', padding: '80px 24px 100px', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <Image src="/logo.png" alt="Verona Ride" width={280} height={140} style={{ objectFit: 'contain', marginBottom: 32 }} priority />
          <h1 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 800, lineHeight: 1.2, marginBottom: 20 }}>
            Accessible Transport<br />for Everyone
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.7, opacity: 0.9, maxWidth: 520, margin: '0 auto 40px' }}>
            Safe, reliable rides designed for seniors and people with disabilities. Your independence, our commitment.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/contact" style={{ backgroundColor: '#34A853', color: '#fff', padding: '14px 32px', borderRadius: 12, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
              Get the App
            </Link>
            <Link href="/#about" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', padding: '14px 32px', borderRadius: 12, fontWeight: 600, fontSize: 16, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.3)' }}>
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 24px', backgroundColor: '#f9fafb' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(24px,4vw,36px)', fontWeight: 700, marginBottom: 12 }}>Why Choose Verona Ride?</h2>
          <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 17, marginBottom: 56 }}>Built from the ground up for accessibility and safety.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 28 }}>
            {features.map(f => (
              <div key={f.title} style={{ backgroundColor: '#fff', borderRadius: 16, padding: '28px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>{f.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Us */}
      <section id="about" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: 700, marginBottom: 32, textAlign: 'center' }}>About Us</h2>
          <div style={{ fontSize: 17, lineHeight: 1.85, color: '#374151' }}>
            <p style={{ marginBottom: 20 }}>
              Verona Ride was founded with a simple but powerful mission: to ensure that seniors and people with disabilities have access to safe, dignified, and reliable transportation — no matter where they are in the United States.
            </p>
            <p style={{ marginBottom: 20 }}>
              Our platform connects passengers who need accessible transport with trained, background-verified drivers. Every vehicle in our network is equipped to accommodate mobility devices, and every driver receives specific training in elder and disability care.
            </p>
            <p style={{ marginBottom: 20 }}>
              We are a family-owned company built on values of trust, respect, and community. The name Verona Ride reflects our commitment to a reliable and premium experience for every rider — because everyone deserves to move freely.
            </p>
            <p>
              Headquartered in Texas, we are expanding nationally to serve communities that have historically been underserved by traditional rideshare platforms.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 24px', backgroundColor: '#f9fafb' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(24px,4vw,36px)', fontWeight: 700, marginBottom: 56 }}>How It Works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 32 }}>
            {steps.map(s => (
              <div key={s.n} style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#1A73E8', color: '#fff', fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>{s.n}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{s.title}</h3>
                <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'linear-gradient(135deg,#34A853 0%,#2d9447 100%)', color: '#fff', padding: '64px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: 700, marginBottom: 16 }}>Ready to ride?</h2>
        <p style={{ fontSize: 17, opacity: 0.9, marginBottom: 32 }}>Download the Verona Ride app and book your first ride today.</p>
        <Link href="/contact" style={{ backgroundColor: '#fff', color: '#1A73E8', padding: '14px 36px', borderRadius: 12, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
          Contact Us
        </Link>
      </section>
    </>
  );
}
