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
  Sprout,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  locale: string;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ locale, collapsed, onToggle }: SidebarProps) {
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
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo + Toggle */}
      <div className="flex items-center justify-between flex-shrink-0 px-3 py-4">
        {!collapsed && (
          <Link href={`/${locale}`} className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
              <Sprout className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-wide text-white leading-tight">SCALD</p>
              <p className="text-[10px] text-slate-500 leading-none">Climate Adaption</p>
            </div>
          </Link>
        )}

        {collapsed && (
          <Link href={`/${locale}`} className="flex h-9 w-9 mx-auto items-center justify-center rounded-xl bg-emerald-500/20">
            <Sprout className="h-5 w-5 text-emerald-400" />
          </Link>
        )}

        {!collapsed && (
          <button
            onClick={onToggle}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-800 hover:text-white"
            title="Menüyü kapat"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mx-3 border-t border-slate-700/60" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={clsx(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    collapsed && 'justify-center px-0',
                    active
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {active && <ChevronRight className="h-3 w-3 opacity-60" />}
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 border-t border-slate-700/50 pt-3">
          {!collapsed && (
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Sistem
            </p>
          )}
          <Link
            href={`/${locale}/settings`}
            title={collapsed ? t('settings') : undefined}
            className={clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-slate-800 hover:text-white',
              collapsed && 'justify-center px-0'
            )}
          >
            <Settings className="h-4 w-4" />
            {!collapsed && <span>{t('settings')}</span>}
          </Link>
        </div>
      </nav>

      {/* Footer / Toggle açma butonu */}
      <div className="border-t border-slate-700/50 p-3">
        {collapsed ? (
          <button
            onClick={onToggle}
            className="flex w-full items-center justify-center rounded-lg py-2 text-slate-500 transition hover:bg-slate-800 hover:text-white"
            title="Menüyü aç"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        ) : (
          <div className="rounded-lg bg-slate-800 p-3">
            <p className="text-xs font-medium text-white">Demo Belediyesi</p>
            <p className="mt-0.5 text-[10px] text-slate-400">Türkiye · Nüfus: 284,000</p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-emerald-400">Bağlı</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
