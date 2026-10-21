'use client';

import { Cloud, CloudOff, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useDataEntry } from '@/stores/data-entry';

/**
 * Small save-state badge. Before, it read only `syncStatus`, which every
 * failed write reset to "idle" (the service swallowed errors) — so it showed
 * "Synced with server" even when nothing had been saved.
 */
export function SyncStatusPill({ initialized }: { initialized: boolean }) {
  const status = useDataEntry((s) => s.syncStatus);
  const pendingCount = useDataEntry((s) => Object.keys(s.pending).length);
  const lastError = useDataEntry((s) => s.lastError);

  if (status === 'loading' || !initialized) {
    return (
      <Pill tone="slate" icon={<Loader2 className="h-3 w-3 animate-spin" />}>
        Loading from server…
      </Pill>
    );
  }
  if (status === 'syncing') {
    return (
      <Pill tone="blue" icon={<Loader2 className="h-3 w-3 animate-spin" />}>
        Saving…
      </Pill>
    );
  }
  if (lastError) {
    return (
      <Pill tone="red" icon={<AlertTriangle className="h-3 w-3" />}>
        Not saved
      </Pill>
    );
  }
  if (pendingCount > 0) {
    return (
      <Pill tone="amber" icon={<CloudOff className="h-3 w-3" />}>
        {pendingCount} not saved yet
      </Pill>
    );
  }
  if (status === 'error') {
    return (
      <Pill tone="amber" icon={<CloudOff className="h-3 w-3" />}>
        Can’t reach server
      </Pill>
    );
  }
  return (
    <Pill tone="emerald" icon={<Cloud className="h-3 w-3" />}>
      Synced with server
    </Pill>
  );
}

/**
 * Full-width explanation when something is wrong, shown on both the
 * data-entry overview and the category screen — where values are actually
 * typed. Renders nothing while everything is saved.
 */
export function SyncBanner() {
  const status = useDataEntry((s) => s.syncStatus);
  const pendingCount = useDataEntry((s) => Object.keys(s.pending).length);
  const lastError = useDataEntry((s) => s.lastError);
  const municipalityId = useDataEntry((s) => s.municipalityId);
  const flushPending = useDataEntry((s) => s.flushPending);
  const loadMunicipality = useDataEntry((s) => s.loadMunicipality);

  if (lastError) {
    return (
      <Banner tone="red">
        <strong>A change was not saved.</strong> {lastError}
      </Banner>
    );
  }
  if (pendingCount > 0) {
    return (
      <Banner
        tone="amber"
        action={
          <ActionButton busy={status === 'syncing'} onClick={() => void flushPending()}>
            Try again now
          </ActionButton>
        }
      >
        <strong>
          {pendingCount} change{pendingCount === 1 ? '' : 's'} not saved to the server yet.
        </strong>{' '}
        They are kept on this computer and sent automatically when the connection is back. Keep this page open
        until this message disappears.
      </Banner>
    );
  }
  if (status === 'error' && municipalityId) {
    return (
      <Banner
        tone="amber"
        action={<ActionButton onClick={() => void loadMunicipality(municipalityId)}>Try again</ActionButton>}
      >
        <strong>Couldn’t reach the server.</strong> You are seeing the values saved on this computer. Check your
        internet connection.
      </Banner>
    );
  }
  return null;
}

const PILL = {
  slate: 'border-slate-200 bg-white text-slate-500',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  red: 'border-red-200 bg-red-50 text-red-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
} as const;

function Pill({ tone, icon, children }: { tone: keyof typeof PILL; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${PILL[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

const BANNER = {
  red: 'border-red-200 bg-red-50 text-red-900',
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
} as const;

function Banner({ tone, action, children }: { tone: keyof typeof BANNER; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className={`flex flex-col gap-3 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center ${BANNER[tone]}`}
    >
      <AlertTriangle className="hidden h-5 w-5 shrink-0 sm:block" />
      <p className="flex-1 leading-relaxed">{children}</p>
      {action}
    </div>
  );
}

function ActionButton({ onClick, busy, children }: { onClick: () => void; busy?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
    >
      <RefreshCw className={busy ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
      {children}
    </button>
  );
}
