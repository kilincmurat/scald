'use client';

import { useState } from 'react';
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
  ChevronDown,
  Sprout,
  PanelLeftClose,
  PanelLeftOpen,
  ClipboardList,
  X,
  ShieldCheck,
  Users2,
  MessageSquare,
  Home,
  Building2,
  Download,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { ROLE_BADGE_COLOR, ROLE_LABELS, type Role } from '@/lib/roles';
import { AdminMunicipalityPicker } from './AdminMunicipalityPicker';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
}

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: string;
};

type NavStructure = {
  top: NavItem[];
  userScreens?: NavItem[];
  bottom: NavItem[];
};

function buildNav(role: Role, t: (k: string) => string): NavStructure {
  switch (role) {
    case 'admin':
      return {
        top: [
          { href: '/admin', label: 'Admin Panel', icon: ShieldCheck, exact: true },
          { href: '/', label: t('overview'), icon: LayoutDashboard, exact: true },
        ],
        userScreens: [
          { href: '/data-entry', label: t('dataEntry'), icon: ClipboardList },
          { href: '/efct', label: t('efct'), icon: Leaf },
          { href: '/ai-dss', label: t('aiDss'), icon: BrainCircuit },
          { href: '/ai-rt', label: t('aiRt'), icon: FileBarChart2 },
          { href: '/exports', label: 'Data Exports', icon: Download },
          { href: '/map', label: t('map'), icon: Map },
        ],
        bottom: [{ href: '/feedback', label: 'Feedback', icon: MessageSquare }],
      };
    case 'data_entry':
      return {
        top: [
          { href: '/data-entry', label: t('dataEntry'), icon: ClipboardList },
          { href: '/efct', label: t('efct'), icon: Leaf, badge: 'read' },
          { href: '/map', label: t('map'), icon: Map },
        ],
        bottom: [],
      };
    case 'decision_maker':
      return {
        top: [
          { href: '/', label: t('overview'), icon: LayoutDashboard, exact: true },
          { href: '/data-entry', label: t('dataEntry'), icon: ClipboardList, badge: 'read' },
          { href: '/efct', label: t('efct'), icon: Leaf },
          { href: '/ai-dss', label: t('aiDss'), icon: BrainCircuit },
          { href: '/ai-rt', label: t('aiRt'), icon: FileBarChart2 },
          { href: '/map', label: t('map'), icon: Map },
          { href: '/exports', label: 'Data Exports', icon: Download },
        ],
        bottom: [{ href: '/feedback', label: 'Feedback', icon: MessageSquare }],
      };
    case 'citizen':
      return {
        top: [
          { href: '/public', label: 'Home', icon: Home, exact: true },
          { href: '/my-municipality', label: 'My Municipality', icon: Building2 },
          { href: '/map', label: t('map'), icon: Map },
        ],
        bottom: [{ href: '/feedback', label: 'Feedback', icon: MessageSquare }],
      };
    case 'researcher':
      return {
        top: [
          { href: '/', label: t('overview'), icon: LayoutDashboard, exact: true },
        ],
        userScreens: [
          { href: '/map', label: t('map'), icon: Map },
        ],
        bottom: [],
      };
  }
}

export function Sidebar({ collapsed, mobileOpen, onToggle, onMobileClose }: SidebarProps) {
  const t = useTranslations('navigation');
  const pathname = usePathname();
  const { profile } = useProfile();
  const role: Role = profile?.role ?? 'data_entry';
  const municipality = profile?.municipality;
  const nav = buildNav(role, t);
  const [userScreensOpen, setUserScreensOpen] = useState(true);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 transition-all duration-300',
        'lg:translate-x-0',
        collapsed ? 'lg:w-16' : 'lg:w-64',
        'w-64',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}
    >
      <div className="flex items-center justify-between flex-shrink-0 px-3 py-4">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-3">
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
          <Link
            href="/"
            className="hidden lg:flex h-9 w-9 mx-auto items-center justify-center rounded-xl bg-emerald-500/20"
          >
            <Sprout className="h-5 w-5 text-emerald-400" />
          </Link>
        )}

        {!collapsed && (
          <button
            onClick={onToggle}
            className="hidden lg:flex ml-auto h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-800 hover:text-white"
            title={t('closeMenuTitle')}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}

        <button
          onClick={onMobileClose}
          className="lg:hidden ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Role + municipality badge */}
      {!collapsed && profile && (
        <div className="mx-3 mb-2 flex flex-col gap-1.5">
          <span
            className={clsx(
              'inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
              ROLE_BADGE_COLOR[role],
            )}
          >
            {ROLE_LABELS[role]}
          </span>
          {municipality && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="text-base leading-none">{municipality.flag}</span>
              <span>{municipality.name}</span>
            </span>
          )}
        </div>
      )}

      <div className="mx-3 border-t border-slate-700/60" />

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-1">
          {nav.top.map((item) => (
            <NavRow
              key={item.href}
              item={item}
              active={isActive(item.href, item.exact)}
              collapsed={collapsed}
              mobileOpen={mobileOpen}
            />
          ))}
        </ul>

        {nav.userScreens && nav.userScreens.length > 0 && (
          <div className="mt-4">
            {!collapsed && (
              <div className="mb-1 px-1">
                <button
                  type="button"
                  onClick={() => setUserScreensOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 transition hover:text-slate-300"
                  aria-expanded={userScreensOpen}
                >
                  <span>User Screens</span>
                  <ChevronDown
                    className={clsx(
                      'h-3 w-3 transition',
                      !userScreensOpen && '-rotate-90',
                    )}
                  />
                </button>
                <p className="mt-1 px-2 text-[10px] text-slate-500">
                  Browse any municipality's user-side pages.
                </p>
                <div className="mt-2 px-1">
                  <AdminMunicipalityPicker collapsed={false} />
                </div>
              </div>
            )}
            {collapsed && (
              <div className="mb-2 flex justify-center">
                <AdminMunicipalityPicker collapsed={true} />
              </div>
            )}

            {(userScreensOpen || collapsed) && (
              <ul className="space-y-1">
                {nav.userScreens.map((item) => (
                  <NavRow
                    key={item.href}
                    item={item}
                    active={isActive(item.href, item.exact)}
                    collapsed={collapsed}
                    mobileOpen={mobileOpen}
                    inGroup
                  />
                ))}
              </ul>
            )}
          </div>
        )}

        {nav.bottom.length > 0 && (
          <ul className="mt-4 space-y-1 border-t border-slate-700/50 pt-3">
            {nav.bottom.map((item) => (
              <NavRow
                key={item.href}
                item={item}
                active={isActive(item.href, item.exact)}
                collapsed={collapsed}
                mobileOpen={mobileOpen}
              />
            ))}
          </ul>
        )}

        <div className="mt-4 border-t border-slate-700/50 pt-3">
          {!collapsed && (
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {t('system')}
            </p>
          )}
          <Link
            href="/settings"
            title={collapsed ? t('settings') : undefined}
            className={clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-slate-800 hover:text-white',
              collapsed && 'lg:justify-center lg:px-0',
            )}
          >
            <Settings className="h-4 w-4" />
            {(!collapsed || mobileOpen) && (
              <span className={clsx(collapsed && 'lg:hidden')}>{t('settings')}</span>
            )}
          </Link>
        </div>
      </nav>

      <div className="border-t border-slate-700/50 p-3">
        {collapsed ? (
          <button
            onClick={onToggle}
            className="hidden lg:flex w-full items-center justify-center rounded-lg py-2 text-slate-500 transition hover:bg-slate-800 hover:text-white"
            title={t('openMenuTitle')}
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        ) : (
          <div className="rounded-lg bg-slate-800 p-3">
            <p className="text-xs font-medium text-white">
              {profile?.fullName || profile?.email?.split('@')[0] || t('demoMunicipality')}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-slate-400">
              {profile?.email || t('countryPopulation')}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-emerald-400">{t('connected')}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function NavRow({
  item,
  active,
  collapsed,
  mobileOpen,
  inGroup,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  mobileOpen: boolean;
  inGroup?: boolean;
}) {
  return (
    <li>
      <Link
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={clsx(
          'group flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all',
          inGroup ? 'pl-4 pr-3' : 'px-3',
          collapsed && 'lg:justify-center lg:px-0',
          active
            ? 'bg-emerald-600 text-white'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white',
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {(!collapsed || mobileOpen) && (
          <>
            <span className={clsx('flex-1', collapsed && 'lg:hidden')}>{item.label}</span>
            {item.badge && !collapsed && (
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-400">
                {item.badge}
              </span>
            )}
            {active && !item.badge && (
              <ChevronRight
                className={clsx('h-3 w-3 opacity-60', collapsed && 'lg:hidden')}
              />
            )}
          </>
        )}
      </Link>
    </li>
  );
}
