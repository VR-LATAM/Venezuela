import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy — Verona Ride' };

export default function PrivacyPolicy() {
  return (
    <article style={{ maxWidth: 820, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 800, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: '#6b7280', marginBottom: 48 }}>Last updated: April 24, 2025</p>

      <Section title="1. Introduction">
        Verona Ride LLC ("Verona Ride", "we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website (collectively, the "Service"). Please read this policy carefully.
      </Section>

      <Section title="2. Information We Collect">
        <b>Personal Information</b> — When you register or use our Service, we may collect:
        <ul>
          <li>Full name, email address, and phone number</li>
          <li>Date of birth and government-issued ID (for driver verification)</li>
          <li>Profile photo</li>
          <li>Payment information (processed securely through Stripe — we do not store card numbers)</li>
          <li>Special mobility needs or disability-related preferences (only if you choose to provide them)</li>
        </ul>
        <b>Location Information</b> — We collect real-time GPS data when the app is in use to match you with nearby drivers and calculate routes. Drivers share location continuously during active trips.
        <br /><br />
        <b>Usage Data</b> — We collect information about how you interact with our app, including log data, device type, operating system, and app features used.
      </Section>

      <Section title="3. How We Use Your Information">
        We use the information we collect to:
        <ul>
          <li>Provide, operate, and improve the Service</li>
          <li>Match passengers with available drivers</li>
          <li>Process payments and issue receipts</li>
          <li>Send trip updates, notifications, and safety alerts</li>
          <li>Respond to customer support requests</li>
          <li>Comply with legal obligations</li>
          <li>Detect and prevent fraud or abuse</li>
        </ul>
        We do not sell your personal information to third parties.
      </Section>

      <Section title="4. Sharing of Information">
        We may share your information with:
        <ul>
          <li><b>Drivers/Passengers</b> — Limited trip details are shared between matched parties to facilitate the ride.</li>
          <li><b>Service Providers</b> — We use trusted third-party services (Stripe for payments, Google Maps for navigation, Firebase for notifications) that process data on our behalf under strict confidentiality agreements.</li>
          <li><b>Legal Authorities</b> — We may disclose information when required by law or to protect the safety of our users.</li>
        </ul>
      </Section>

      <Section title="5. Data Retention">
        We retain your personal information for as long as your account is active or as needed to provide the Service. Trip records are kept for up to 7 years for legal and accounting purposes. You may request deletion of your account and associated data by contacting us.
      </Section>

      <Section title="6. Security">
        We implement industry-standard security measures including encrypted data transmission (HTTPS/TLS), secure cloud infrastructure, and access controls. However, no method of transmission over the internet is 100% secure.
      </Section>

      <Section title="7. Children's Privacy">
        Our Service is not directed to children under 18. We do not knowingly collect personal information from anyone under 18 years of age.
      </Section>

      <Section title="8. Your Rights">
        Depending on your state of residence, you may have the right to:
        <ul>
          <li>Access the personal information we hold about you</li>
          <li>Correct inaccurate information</li>
          <li>Request deletion of your data</li>
          <li>Opt out of certain data uses</li>
        </ul>
        To exercise these rights, contact us at <a href="mailto:support@veronaride.app" style={{ color: '#1A73E8' }}>support@veronaride.app</a>.
      </Section>

      <Section title="9. Changes to This Policy">
        We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification. Continued use of the Service after changes constitutes acceptance of the updated policy.
      </Section>

      <Section title="10. Contact Us">
        If you have questions about this Privacy Policy, please contact:<br /><br />
        <b>Verona Ride LLC</b><br />
        Texas, United States<br />
        Email: <a href="mailto:support@veronaride.app" style={{ color: '#1A73E8' }}>support@veronaride.app</a>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14, color: '#111827' }}>{title}</h2>
      <div style={{ fontSize: 16, lineHeight: 1.8, color: '#374151' }}>{children}</div>
    </section>
  );
}
