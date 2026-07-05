'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { createClient } from '@/lib/supabase/client';
import { useDataEntry } from '@/stores/data-entry';
import { useThresholds } from '@/stores/thresholds';

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const clearLocal = useDataEntry((s) => s.clearLocal);
  const loadOverrides = useThresholds((s) => s.loadOverrides);
  const overridesLoaded = useThresholds((s) => s.loaded);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Load admin threshold overrides once
  useEffect(() => {
    if (!overridesLoaded) void loadOverrides();
  }, [overridesLoaded, loadOverrides]);

  // Wire up auth listener: on sign-out, wipe local data-entry cache so a
  // different user doesn't see the previous session's data.
  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const supabase = createClient();
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
          clearLocal();
        }
      });
      unsub = () => data.subscription.unsubscribe();
    } catch {
      // Supabase not configured — nothing to wire up.
    }
    return () => unsub?.();
  }, [clearLocal]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setCollapsed((c) => !c)}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        className="flex flex-1 flex-col transition-all duration-300 lg:pl-[var(--sidebar-w)]"
        style={
          {
            ['--sidebar-w' as string]: collapsed ? '64px' : '256px',
          } as React.CSSProperties
        }
      >
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="text-sm font-bold tracking-wide text-slate-900">SCALD</span>
          <span className="ml-auto text-[10px] text-slate-400">Climate Adaption</span>
        </div>

        {children}
      </div>
    </div>
  );
}
