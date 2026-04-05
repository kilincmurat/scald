'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';

interface DashboardShellProps {
  children: React.ReactNode;
  locale: string;
}

export function DashboardShell({ children, locale }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        locale={locale}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
      />
      <div
        className="flex flex-1 flex-col transition-all duration-300"
        style={{ paddingLeft: collapsed ? '64px' : '256px' }}
      >
        {children}
      </div>
    </div>
  );
}
