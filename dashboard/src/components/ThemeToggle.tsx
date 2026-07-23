// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useTheme } from './ThemeProvider';
import { Sun, Moon, Monitor } from 'lucide-react';

const OPTIONS = [
  { value: 'light',  icon: Sun,     label: 'Claro' },
  { value: 'dark',   icon: Moon,    label: 'Oscuro' },
  { value: 'system', icon: Monitor, label: 'Sistema' },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          title={label}
          onClick={() => setTheme(value)}
          className={`rounded-md p-1.5 transition ${
            theme === value
              ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
