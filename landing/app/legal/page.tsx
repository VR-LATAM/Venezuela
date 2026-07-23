import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Legal Notice — Verona Ride' };

export default function LegalNotice() {
  return (
    <article style={{ maxWidth: 820, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 800, marginBottom: 8 }}>Legal Notice</h1>
      <p style={{ color: '#6b7280', marginBottom: 48 }}>Last updated: April 24, 2025</p>

      <Section title="1. Company Information">
        <b>Verona Ride LLC</b><br />
        State of incorporation: Texas, United States<br />
        Email: <a href="mailto:support@veronaride.app" style={{ color: '#1A73E8' }}>support@veronaride.app</a>
      </Section>

      <Section title="2. Nature of Service">
        Verona Ride operates a technology platform that connects passengers — particularly seniors and people with disabilities — with independent transportation providers (drivers). Verona Ride is a technology intermediary and is not itself a transportation company. Drivers using the Verona Ride platform are independent contractors, not employees of Verona Ride LLC.
      </Section>

      <Section title="3. Limitation of Liability">
        To the fullest extent permitted by applicable law, Verona Ride LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including but not limited to personal injury, property damage, or loss of data. Our total liability to you for any claim arising out of your use of the Service shall not exceed the amount you paid to Verona Ride in the three (3) months preceding the claim.
      </Section>

      <Section title="4. Disclaimer of Warranties">
        The Service is provided on an "as is" and "as available" basis without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components.
      </Section>

      <Section title="5. User Responsibilities">
        By using Verona Ride, you agree to:
        <ul>
          <li>Provide accurate and complete registration information</li>
          <li>Use the Service only for lawful purposes</li>
          <li>Not misuse the platform, including attempting unauthorized access</li>
          <li>Treat drivers with respect and dignity</li>
          <li>Comply with all applicable federal, state, and local laws</li>
        </ul>
      </Section>

      <Section title="6. Driver Responsibilities">
        Drivers using the Verona Ride platform are independent contractors and are solely responsible for:
        <ul>
          <li>Holding a valid driver's license and vehicle registration</li>
          <li>Maintaining adequate vehicle insurance as required by law</li>
          <li>Complying with all applicable transportation regulations</li>
          <li>The safety and quality of the transportation service they provide</li>
        </ul>
      </Section>

      <Section title="7. Intellectual Property">
        All content on the Verona Ride platform — including the logo, brand name, application design, and written content — is the exclusive property of Verona Ride LLC and is protected by United States intellectual property laws. Unauthorized use, reproduction, or distribution is strictly prohibited.
      </Section>

      <Section title="8. Governing Law">
        This Legal Notice and any disputes arising from the use of the Verona Ride Service shall be governed by the laws of the State of Texas, United States, without regard to its conflict of law provisions.
      </Section>

      <Section title="9. Dispute Resolution">
        Any dispute arising out of or relating to these terms or the Service shall first be addressed through good-faith negotiation. If not resolved within 30 days, disputes shall be submitted to binding arbitration in accordance with the rules of the American Arbitration Association, in the State of Texas.
      </Section>

      <Section title="10. Changes to This Notice">
        We reserve the right to update this Legal Notice at any time. Significant changes will be communicated via email or in-app notification. Continued use of the Service following changes constitutes acceptance of the updated terms.
      </Section>

      <Section title="11. Contact">
        For legal inquiries, please contact:<br /><br />
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
