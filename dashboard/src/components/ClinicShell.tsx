// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ClipboardList, PlusCircle, LogOut, Loader2 } from 'lucide-react';

interface ClinicData {
  id:           string;
  name:         string;
  contact_name: string | null;
  plan:         string;
}

const NAV = [
  { href: '/clinic/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/clinic/requests',  icon: ClipboardList,   label: 'Requests' },
  { href: '/clinic/requests/new', icon: PlusCircle,   label: 'New Request' },
];

interface ClinicShellProps {
  title:    string;
  subtitle?: string;
  action?:  React.ReactNode;
  children: React.ReactNode;
}

export function ClinicShell({ title, subtitle, action, children }: ClinicShellProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const [clinic, setClinic] = useState<ClinicData | null>(null);
  const [ready,  setReady]  = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('clinic_token');
    const data  = localStorage.getItem('clinic_data');
    if (!token || !data) {
      router.replace('/clinic/login');
      return;
    }
    try {
      setClinic(JSON.parse(data) as ClinicData);
    } catch {
      router.replace('/clinic/login');
      return;
    }
    setReady(true);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('clinic_token');
    localStorage.removeItem('clinic_data');
    router.replace('/clinic/login');
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  const PLAN_COLORS: Record<string, string> = {
    basic:        'bg-gray-100 text-gray-700',
    professional: 'bg-blue-100 text-blue-700',
    enterprise:   'bg-purple-100 text-purple-700',
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 shadow-sm">
        {/* Logo */}
        <div className="flex flex-col items-center px-4 py-4 border-b border-gray-100 dark:border-gray-800">
          <Image src="/logo.png" alt="Verona Ride" width={160} height={80} style={{ objectFit: 'contain' }} priority />
          <p className="text-xs text-gray-400 mt-1">Clinic Portal</p>
        </div>

        {/* Clinic info */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-primary-50 dark:bg-primary-900/20">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{clinic?.name}</p>
          {clinic?.contact_name && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{clinic.contact_name}</p>
          )}
          <span className={cn('mt-1 inline-block text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
            PLAN_COLORS[clinic?.plan ?? 'basic'] ?? PLAN_COLORS.basic)}>
            {clinic?.plan}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href;
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
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col" style={{ marginLeft: '256px' }}>
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>

        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
