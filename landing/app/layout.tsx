import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Verona Ride — Accessible Transport for All',
  description: 'Verona Ride provides safe, reliable, and accessible transportation for seniors and people with disabilities across the United States.',
  openGraph: {
    title: 'Verona Ride — Accessible Transport for All',
    description: 'Safe and reliable rides for seniors and people with disabilities.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
