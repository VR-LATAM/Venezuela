// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AdminShellProps {
  title:     string;
  subtitle?: string;
  action?:   React.ReactNode;
  children:  React.ReactNode;
}

export function AdminShell({ title, subtitle, action, children }: AdminShellProps) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="flex flex-1 flex-col" style={{ marginLeft: '256px' }}>
        <div className="flex items-center justify-between">
          <Header title={title} subtitle={subtitle} />
          {action && <div>{action}</div>}
        </div>
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
