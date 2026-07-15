'use client';

/**
 * Public, no-login sustainability explorer.
 * Anyone can pick a pilot city and see its general sustainability scores plus
 * a map — read-only, at the public summary level. Data is loaded with the
 * Supabase anon role (see migration 014 + public-stats-service).
 */

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sprout,
  LogIn,
  Users,
  TrendingUp,
  TrendingDown,
  Info,
  Layers,
} from 'lucide-react';
import { clsx } from 'clsx';
import { PILOT_MUNICIPALITIES } from '@/lib/pilot-municipalities';
import { SET_THEME, scoreBand } from '@/lib/scores';
import type { SetCode } from '@/lib/scald-indicators';
import { fetchPublicStats, type PublicCityStats } from '@/lib/public-stats-service';
import type { PartnerMunicipality } from '@/components/map/MapView';

const MapView = dynamic(() => import('@/components/map/MapView').then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] items-center justify-center bg-slate-100">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
    </div>
  ),
});

const SET_ORDER: SetCode[] = ['ES', 'SS', 'MS', 'ECS'];
const LAYERS: { id: 'total' | SetCode; label: string }[] = [
  { id: 'total', label: 'Overall' },
  { id: 'ES', label: 'Environmental' },
  { id: 'SS', label: 'Social' },
  { id: 'MS', label: 'Managerial' },
  { id: 'ECS', label: 'Economic' },
];

export function ExploreClient() {
  const [stats, setStats] = useState<Record<string, PublicCityStats>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(PILOT_MUNICIPALITIES[0]?.id ?? '');
  const [layer, setLayer] = useState<'total' | SetCode>('total');

  useEffect(() => {
    let cancelled = false;
    fetchPublicStats(PILOT_MUNICIPALITIES.map((m) => m.id))
      .then((s) => {
        if (cancelled) return;
        setStats(s);
        setLoading(false);
        const firstWithData = PILOT_MUNICIPALITIES.find((m) => s[m.id]?.hasData);
        if (firstWithData) setSelectedId(firstWithData.id);
      })
      .catch(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = PILOT_MUNICIPALITIES.find((m) => m.id === selectedId) ?? PILOT_MUNICIPALITIES[0];
  const s = stats[selectedId];

  const mapMunicipalities: PartnerMunicipality[] = useMemo(
    () =>
      PILOT_MUNICIPALITIES.map((m) => {
        const cs = stats[m.id];
        return {
          id: m.id,
          name: m.name,
          country: m.country,
          countryCode: m.countryCode,
          lat: m.lat,
          lng: m.lng,
          population: m.population,
          partner: m.region,
          scores: {
            ES: cs?.setScores.ES.score ?? 0,
            SS: cs?.setScores.SS.score ?? 0,
            MS: cs?.setScores.MS.score ?? 0,
            ECS: cs?.setScores.ECS.score ?? 0,
          },
          total: cs?.overall.score ?? 0,
          isMine: m.id === selectedId,
        };
      }),
    [stats, selectedId],
  );

  const scored = (s?.categoryScores ?? []).filter((c) => c.entered > 0);
  const strengths = [...scored].sort((a, b) => b.score - a.score).slice(0, 4);
  const focus = [...scored].sort((a, b) => a.score - b.score).slice(0, 4);
  const band = s ? scoreBand(s.overall.score) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 lg:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
              <Sprout className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold">SCALD</p>
              <p className="text-[10px] text-slate-500">Public Explorer</p>
            </div>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <LogIn className="h-3.5 w-3.5" />
            Staff sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 lg:px-6">
        {/* Hero */}
        <section className="py-8 lg:py-10">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600">
            Open Sustainability Data
          </p>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-tight tracking-tight lg:text-4xl">
            See how your city scores on sustainability
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
            SCALD measures partner municipalities across four dimensions —
            environmental, social, managerial and economic sustainability. Pick a
            city to explore its public results.
          </p>
        </section>

        {/* City selector */}
        <div className="-mx-4 mb-8 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <div className="flex gap-2">
            {PILOT_MUNICIPALITIES.map((m) => {
              const active = m.id === selectedId;
              const has = stats[m.id]?.hasData;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  className={clsx(
                    'flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition',
                    active
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                  )}
                >
                  <span className="text-base leading-none">{m.flag}</span>
                  <span className="whitespace-nowrap">{m.name}</span>
                  {!has && !loading && (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400">
                      no data
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Left: stats */}
            <div className="space-y-5 lg:col-span-3">
              {/* City header */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl leading-none">{selected.flag}</span>
                  <div>
                    <h2 className="text-xl font-bold leading-tight">{selected.name}</h2>
                    <p className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{selected.region}, {selected.country}</span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {selected.population.toLocaleString('en-GB')}
                      </span>
                    </p>
                  </div>
                </div>
                {s?.hasData && s.year && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    Reporting year {s.year}
                  </span>
                )}
              </div>

              {!s?.hasData ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
                  <Info className="h-6 w-6 text-slate-400" />
                  <p className="text-sm font-medium text-slate-700">No public data published yet</p>
                  <p className="max-w-sm text-xs text-slate-500">
                    {selected.name} hasn&apos;t published sustainability results yet. Check back soon.
                  </p>
                </div>
              ) : (
                <>
                  {/* Overall score */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-5 p-5">
                      <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                        <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                          <circle
                            cx="18" cy="18" r="15.9" fill="none"
                            stroke={band?.chipColor ? undefined : '#10b981'}
                            className={clsx(band?.chipColor?.replace('bg-', 'text-'))}
                            style={{ stroke: 'currentColor' }}
                            strokeWidth="3"
                            strokeDasharray={`${s.overall.score}, 100`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold tabular-nums">{s.overall.score}</span>
                          <span className="text-[9px] text-slate-400">/ 100</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Overall sustainability score
                        </p>
                        {band && (
                          <p className={clsx('mt-0.5 text-lg font-bold', band.color)}>{band.label}</p>
                        )}
                        <p className="mt-1 text-xs text-slate-500">
                          Based on {s.overall.entered} of {s.overall.total} indicators
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Four dimensions */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {SET_ORDER.map((sc) => {
                      const theme = SET_THEME[sc];
                      const val = s.setScores[sc].score;
                      return (
                        <div key={sc} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                          <span className={clsx('rounded px-1.5 py-0.5 text-[10px] font-bold', theme.chip)}>
                            {sc}
                          </span>
                          <p className="mt-2 text-[11px] font-medium text-slate-500">{theme.fullName}</p>
                          <p className="mt-0.5 text-2xl font-bold tabular-nums">{val > 0 ? val : '—'}</p>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={clsx('h-full rounded-full bg-gradient-to-r', theme.gradient)}
                              style={{ width: `${val}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Strengths & focus areas */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <HighlightCard title="Strengths" icon={<TrendingUp className="h-3.5 w-3.5" />} accent="text-emerald-600" items={strengths} />
                    <HighlightCard title="Focus areas" icon={<TrendingDown className="h-3.5 w-3.5" />} accent="text-amber-600" items={focus} />
                  </div>
                </>
              )}
            </div>

            {/* Right: map */}
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-20">
                <div className="mb-2 flex items-center gap-1.5 overflow-x-auto">
                  <Layers className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  {LAYERS.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setLayer(l.id)}
                      className={clsx(
                        'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
                        layer === l.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
                <div className="h-[420px] overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                  <MapView municipalities={mapMunicipalities} activeLayer={layer} />
                </div>
                <p className="mt-2 text-[10px] text-slate-400">
                  Marker colour reflects the selected layer&apos;s score. Click a city to compare.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 px-4 py-6 text-center lg:px-6">
          <div className="flex items-center gap-2">
            <Image src="/images/logo.jpeg" alt="SCALD" width={90} height={22} className="h-5 w-auto object-contain" />
          </div>
          <p className="text-[11px] text-slate-400">
            Public summary data · SCALD KA220-ADU · EU Funded Project
          </p>
        </div>
      </footer>
    </div>
  );
}

function HighlightCard({
  title,
  icon,
  accent,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  accent: string;
  items: { code: string; name: string; score: number; setCode: SetCode }[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={clsx('mb-2.5 flex items-center gap-1.5 text-xs font-bold', accent)}>
        {icon}
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-slate-400">Not enough data yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li key={c.code} className="flex items-center gap-2">
              <span className={clsx('rounded px-1.5 py-0.5 text-[9px] font-bold', SET_THEME[c.setCode].chip)}>
                {c.code}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-slate-700">{c.name}</span>
              <span className="text-xs font-bold tabular-nums text-slate-900">{c.score}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
