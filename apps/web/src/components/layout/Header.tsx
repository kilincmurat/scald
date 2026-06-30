'use client';

import { Bell, User } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <button className="relative rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </button>

        <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
            <User className="h-3.5 w-3.5 text-emerald-700" />
          </div>
          <span className="font-medium">Admin</span>
        </button>
      </div>
    </header>
  );
}
