'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
  MessageSquare,
  Shield,
  Building2,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { createClient } from '@/lib/supabase/client';
import { canRespondFeedback, ROLE_BADGE_COLOR, ROLE_LABELS } from '@/lib/roles';
import { clsx } from 'clsx';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const router = useRouter();
  const { profile } = useProfile();
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const canInbox = profile ? canRespondFeedback(profile.role) : false;

  // Load pending feedback count for inbox roles.
  useEffect(() => {
    if (!canInbox) return;
    let cancelled = false;
    const load = async () => {
      try {
        const supabase = createClient();
        const { count } = await supabase
          .from('feedback')
          .select('id', { count: 'exact', head: true })
          .in('status', ['new', 'seen', 'in_progress']);
        if (!cancelled) setPendingCount(count ?? 0);
      } catch {
        if (!cancelled) setPendingCount(0);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [canInbox, profile?.municipalityId]);

  // Close dropdowns on outside click / Escape.
  useEffect(() => {
    if (!notifOpen && !userMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNotifOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [notifOpen, userMenuOpen]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  const displayName =
    profile?.fullName?.trim() || profile?.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');

  const hasBadge = pendingCount !== null && pendingCount > 0;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:h-16 lg:px-6 lg:py-0">
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold text-slate-900 lg:text-lg">{title}</h1>
        {subtitle && <p className="truncate text-[11px] text-slate-500 lg:text-xs">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2 lg:gap-3">
        {canInbox && (
          <div ref={notifRef} className="relative">
            <button
              type="button"
              aria-label={
                pendingCount === null
                  ? 'Notifications'
                  : `Notifications (${pendingCount} pending)`
              }
              aria-expanded={notifOpen}
              aria-haspopup="menu"
              onClick={() => {
                setNotifOpen((v) => !v);
                setUserMenuOpen(false);
              }}
              className="relative rounded-lg border border-slate-200 p-2 text-slate-500 outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              <Bell className="h-4 w-4" />
              {hasBadge && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                  {pendingCount! > 9 ? '9+' : pendingCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
              >
                <div className="flex items-center justify-between px-3 pt-2 pb-1">
                  <p className="text-xs font-semibold text-slate-900">Notifications</p>
                  {pendingCount !== null && (
                    <span className="text-[10px] text-slate-500">
                      {pendingCount} pending
                    </span>
                  )}
                </div>
                {pendingCount === null ? (
                  <div className="flex items-center gap-2 px-3 py-6 text-xs text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Checking inbox…
                  </div>
                ) : pendingCount === 0 ? (
                  <div className="flex flex-col items-center gap-1 py-6 text-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <p className="text-xs font-medium text-slate-700">All caught up</p>
                    <p className="text-[10px] text-slate-500">No new feedback for now.</p>
                  </div>
                ) : (
                  <Link
                    href="/feedback"
                    onClick={() => setNotifOpen(false)}
                    className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition hover:bg-slate-50"
                    role="menuitem"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900">
                        {pendingCount} feedback item{pendingCount === 1 ? '' : 's'} awaiting review
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Open the inbox to respond.
                      </p>
                    </div>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        <div ref={userMenuRef} className="relative">
          <button
            type="button"
            aria-label="Account menu"
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            onClick={() => {
              setUserMenuOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-300 lg:pl-2 lg:pr-2.5"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[11px] font-bold text-white">
              {initials || '?'}
            </div>
            <span className="hidden max-w-[140px] truncate font-medium sm:inline">
              {displayName}
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:inline" />
          </button>

          {userMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
            >
              <div className="px-3 py-2">
                <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                {profile?.email && (
                  <p className="truncate text-[11px] text-slate-500">{profile.email}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {profile?.role && (
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
                        ROLE_BADGE_COLOR[profile.role],
                      )}
                    >
                      <Shield className="h-2.5 w-2.5" />
                      {ROLE_LABELS[profile.role]}
                    </span>
                  )}
                  {profile?.municipality && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                      <Building2 className="h-2.5 w-2.5" />
                      {profile.municipality.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="my-1 h-px bg-slate-100" />

              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <SettingsIcon className="h-4 w-4 text-slate-400" />
                Settings
              </Link>

              <button
                role="menuitem"
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-wait"
              >
                {signingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : (
                  <LogOut className="h-4 w-4 text-slate-400" />
                )}
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
