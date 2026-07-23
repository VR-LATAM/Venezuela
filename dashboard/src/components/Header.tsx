// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useSession } from 'next-auth/react';
import { Bell } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useI18n } from '@/i18n';

interface HeaderProps {
  title:    string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { data: session } = useSession();
  const { locale, setLocale } = useI18n();

  return (
    <header className="flex items-center justify-between px-8 py-5 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Language toggle */}
        <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5">
          {(['es', 'en'] as const).map(lang => (
            <button
              key={lang}
              onClick={() => setLocale(lang)}
              className={`rounded-md px-2 py-1 text-xs font-bold transition ${
                locale === lang
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        <ThemeToggle />

        <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition">
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold text-white">
            {session?.user?.name?.charAt(0).toUpperCase() ?? 'A'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-none">
              {session?.user?.name ?? 'Admin'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Administrador</p>
          </div>
        </div>
      </div>
    </header>
  );
}
