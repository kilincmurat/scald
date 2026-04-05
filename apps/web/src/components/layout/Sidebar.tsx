'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Leaf,
  BrainCircuit,
  FileBarChart2,
  Map,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  locale: string;
}

export function Sidebar({ locale }: SidebarProps) {
  const t = useTranslations('navigation');
  const pathname = usePathname();

  const navItems = [
    { href: `/${locale}`, label: t('overview'), icon: LayoutDashboard, exact: true },
    { href: `/${locale}/efct`, label: t('efct'), icon: Leaf },
    { href: `/${locale}/ai-dss`, label: t('aiDss'), icon: BrainCircuit },
    { href: `/${locale}/ai-rt`, label: t('aiRt'), icon: FileBarChart2 },
    { href: `/${locale}/map`, label: t('map'), icon: Map },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-700/50 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
          <Leaf className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">SCALD</p>
          <p className="text-[10px] text-slate-400 leading-tight">Decision Support</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    active
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {active && <ChevronRight className="h-3 w-3 opacity-60" />}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 border-t border-slate-700/50 pt-4">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Sistem
          </p>
          <Link
            href={`/${locale}/settings`}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-slate-800 hover:text-white"
          >
            <Settings className="h-4 w-4" />
            <span>{t('settings')}</span>
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700/50 p-4">
        <div className="rounded-lg bg-slate-800 p-3">
          <p className="text-xs font-medium text-white">Demo Belediyesi</p>
          <p className="mt-0.5 text-[10px] text-slate-400">Türkiye · Nüfus: 284,000</p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-emerald-400">Bağlı</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
