// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
// Root layout — carga providers globales
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Verona Ride Admin',
  description: 'Panel de administración nacional Verona Ride',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
