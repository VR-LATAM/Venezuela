// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Car, DollarSign, MapPin,
  Bell, BarChart2, LogOut, UserCheck, AlertTriangle, Tag, Siren, Cross,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/drivers',     icon: Car,             label: 'Drivers' },
  { href: '/rides',       icon: MapPin,          label: 'Rides' },
  { href: '/passengers',  icon: Users,           label: 'Passengers' },
  { href: '/clinics',     icon: Cross,           label: 'Clinics' },
  { href: '/finance',     icon: DollarSign,      label: 'Finance' },
  { href: '/states',      icon: UserCheck,       label: 'Fares by state' },
  { href: '/analytics',   icon: BarChart2,       label: 'Analytics' },
  { href: '/disputes',    icon: AlertTriangle,   label: 'Disputes' },
  { href: '/promos',      icon: Tag,             label: 'Promo Codes' },
  { href: '/sos',         icon: Siren,           label: 'SOS Alerts' },
  { href: '/settings',    icon: Bell,            label: 'Notifications' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 shadow-sm">
      {/* Logo */}
      <div className="flex flex-col items-center px-4 py-4 border-b border-gray-100 dark:border-gray-800">
        <Image
          src="/logo.png"
          alt="Verona Ride"
          width={160}
          height={80}
          style={{ objectFit: 'contain' }}
          priority
        />
        <p className="text-xs text-gray-400 mt-1">National Admin</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-primary-600 dark:text-primary-400' : '')} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-100 dark:border-gray-800 p-3">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
