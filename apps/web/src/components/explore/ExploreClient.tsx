'use client';

/**
 * Public, no-login sustainability explorer — a full-width, one-page experience
 * built around a large interactive map. Anyone can click a city (or pick one
 * from the strip) and see its public sustainability scores; the page also shows
 * a cross-city ranking and explains what SCALD measures.
 *
 * Data is loaded with the Supabase anon role (migration 014 / 015 +
 * public-stats-service) — read-only, public summary level.
 */

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import {
  LogIn,
  Users,
  TrendingUp,
  TrendingDown,
  Info,
  Layers,
  MousePointerClick,
  Leaf,
  HeartHandshake,
  Landmark,
  Coins,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  MUNICIPALITIES,
  MAPPABLE_MUNICIPALITIES,
  getMunicipalityById,
} from '@/lib/pilot-municipalities';
import { SET_THEME, scoreBand } from '@/lib/scores';
import type { SetCode } from '@/lib/scald-indicators';
import { fetchPublicStats, type PublicCityStats } from '@/lib/public-stats-service';
import type { PartnerMunicipality } from '@/components/map/MapView';

const MapView = dynamic(() => import('@/components/map/MapView').then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-slate-100">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
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

const DIMENSION_INFO: { code: SetCode; icon: typeof Leaf; blurb: string }[] = [
  { code: 'ES', icon: Leaf, blurb: 'Green space, energy, water, waste, air quality and climate resilience.' },
  { code: 'SS', icon: HeartHandshake, blurb: 'Health, education, equity, participation and quality of urban life.' },
  { code: 'MS', icon: Landmark, blurb: 'Governance, planning, transparency and institutional capacity.' },
  { code: 'ECS', icon: Coins, blurb: 'Local economy, resource efficiency and financial sustainability.' },
];

export function ExploreClient() {
  const [stats, setStats] = useState<Record<string, PublicCityStats>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(MUNICIPALITIES[0]?.id ?? '');
  const [layer, setLayer] = useState<'total' | SetCode>('total');

  useEffect(() => {
    let cancelled = false;
    fetchPublicStats(MUNICIPALITIES.map((m) => m.id))
      .then((r) => {
        if (cancelled) return;
        setStats(r);
        setLoading(false);
        const firstWithData = MUNICIPALITIES.find((m) => r[m.id]?.hasData);
        if (firstWithData) setSelectedId(firstWithData.id);
      })
      .catch(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = getMunicipalityById(selectedId) ?? MUNICIPALITIES[0];
  const s = stats[selectedId];

  const mapMunicipalities: PartnerMunicipality[] = useMemo(
    () =>
      MAPPABLE_MUNICIPALITIES.map((m) => {
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

  // Ranking across the real cities that have published data.
  const ranking = useMemo(
    () =>
      MAPPABLE_MUNICIPALITIES.map((m) => ({ m, st: stats[m.id] }))
        .filter((x) => x.st?.hasData)
        .sort((a, b) => (b.st?.overall.score ?? 0) - (a.st?.overall.score ?? 0)),
    [stats],
  );

  const scored = (s?.categoryScores ?? []).filter((c) => c.entered > 0);
  const strengths = [...scored].sort((a, b) => b.score - a.score).slice(0, 4);
  const focus = [...scored].sort((a, b) => a.score - b.score).slice(0, 4);
  const band = s ? scoreBand(s.overall.score) : null;
  const countries = Array.from(new Set(MAPPABLE_MUNICIPALITIES.map((m) => m.country)));

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
              <Image
                src="/small-logo.png"
                alt="SCALD"
                width={32}
                height={32}
                className="h-full w-full object-contain"
                priority
              />
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

      {/* Hero */}
      <section className="border-b border-slate-100 bg-gradient-to-b from-emerald-50/60 to-white">
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Open Sustainability Data
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight lg:text-6xl">
            How sustainable is <span className="text-emerald-600">your city</span>?
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
            SCALD scores partner municipalities across four dimensions —
            environmental, social, managerial and economic sustainability.
            Click a city on the map to explore its public results.
          </p>
          <div className="mt-8 flex flex-wrap gap-8">
            {[
              { k: String(MAPPABLE_MUNICIPALITIES.length), v: 'Municipalities' },
              { k: '4', v: 'Dimensions' },
              { k: String(countries.length), v: 'Countries' },
            ].map((x) => (
              <div key={x.v}>
                <p className="text-3xl font-bold tabular-nums lg:text-4xl">{x.k}</p>
                <p className="text-xs font-medium text-slate-500">{x.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Big map */}
      <section className="relative">
        <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur">
          <Layers className="ml-1 h-3.5 w-3.5 shrink-0 text-slate-400" />
          {LAYERS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLayer(l.id)}
              className={clsx(
                'shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition',
                layer === l.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100',
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="h-[62vh] min-h-[440px] w-full bg-slate-100">
          <MapView
            municipalities={mapMunicipalities}
            activeLayer={layer}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1.5 text-[11px] font-medium text-white">
          <MousePointerClick className="h-3.5 w-3.5" />
          Click a city marker to see its scores
        </div>
      </section>

      {/* City strip */}
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl overflow-x-auto px-5 py-3 lg:px-8">
          <div className="flex gap-2">
            {MUNICIPALITIES.map((m) => {
              const active = m.id === selectedId;
              const has = stats[m.id]?.hasData;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  className={clsx(
                    'flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
                    active
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300',
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
      </div>

      {/* Selected city detail */}
      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl leading-none">{selected.flag}</span>
            <div>
              <h2 className="text-2xl font-bold leading-tight lg:text-3xl">{selected.name}</h2>
              <p className="flex flex-wrap items-center gap-x-3 text-sm text-slate-500">
                <span>{selected.region}, {selected.country}</span>
                {selected.population > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {selected.population.toLocaleString('en-GB')}
                  </span>
                )}
              </p>
            </div>
          </div>
          {s?.hasData && s.year && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Reporting year {s.year}
            </span>
          )}
        </div>

        {loading ? (
          <div className="mt-6 h-64 animate-pulse rounded-2xl bg-slate-100" />
        ) : !s?.hasData ? (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
            <Info className="h-7 w-7 text-slate-400" />
            <p className="text-base font-semibold text-slate-700">No public data published yet</p>
            <p className="max-w-sm text-sm text-slate-500">
              {selected.name} hasn&apos;t published sustainability results yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {/* Overall */}
            <div className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3.2" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    className={clsx(band?.chipColor?.replace('bg-', 'text-'))}
                    style={{ stroke: 'currentColor' }}
                    strokeWidth="3.2"
                    strokeDasharray={`${s.overall.score}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold tabular-nums">{s.overall.score}</span>
                  <span className="text-[10px] text-slate-400">/ 100</span>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Overall score
                </p>
                {band && <p className={clsx('mt-1 text-2xl font-bold', band.color)}>{band.label}</p>}
                <p className="mt-1 text-xs text-slate-500">
                  {s.overall.entered} of {s.overall.total} indicators
                </p>
              </div>
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-2 gap-3 lg:col-span-2">
              {SET_ORDER.map((sc) => {
                const theme = SET_THEME[sc];
                const val = s.setScores[sc].score;
                return (
                  <div key={sc} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className={clsx('rounded px-1.5 py-0.5 text-[10px] font-bold', theme.chip)}>
                        {sc}
                      </span>
                      <span className="text-2xl font-bold tabular-nums">{val > 0 ? val : '—'}</span>
                    </div>
                    <p className="mt-1 text-xs font-medium text-slate-500">{theme.fullName}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={clsx('h-full rounded-full bg-gradient-to-r', theme.gradient)}
                        style={{ width: `${val}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Strengths & focus */}
            <HighlightCard title="Strengths" icon={<TrendingUp className="h-4 w-4" />} accent="text-emerald-600" items={strengths} />
            <HighlightCard title="Focus areas" icon={<TrendingDown className="h-4 w-4" />} accent="text-amber-600" items={focus} />
          </div>
        )}
      </section>

      {/* City ranking */}
      {ranking.length > 0 && (
        <section className="border-t border-slate-100 bg-slate-50">
          <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
            <h2 className="text-lg font-bold">City ranking</h2>
            <p className="mb-5 text-sm text-slate-500">Overall sustainability score, highest first.</p>
            <div className="space-y-2.5">
              {ranking.map(({ m, st }, i) => {
                const val = st?.overall.score ?? 0;
                const b = scoreBand(val);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className={clsx(
                      'flex w-full items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left shadow-sm transition hover:border-emerald-300',
                      m.id === selectedId ? 'border-emerald-400' : 'border-slate-200',
                    )}
                  >
                    <span className="w-5 shrink-0 text-center text-sm font-bold text-slate-400">{i + 1}</span>
                    <span className="text-lg leading-none">{m.flag}</span>
                    <span className="w-40 shrink-0 truncate text-sm font-semibold">{m.name}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className={clsx('h-full rounded-full', b.chipColor)} style={{ width: `${val}%` }} />
                    </div>
                    <span className="w-8 shrink-0 text-right text-sm font-bold tabular-nums">{val}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* What SCALD measures */}
      <section className="border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <h2 className="text-lg font-bold">What SCALD measures</h2>
          <p className="mb-6 text-sm text-slate-500">Four dimensions of urban sustainability.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DIMENSION_INFO.map(({ code, icon: Icon, blurb }) => {
              const theme = SET_THEME[code];
              return (
                <div key={code} className={clsx('rounded-2xl border bg-white p-5 shadow-sm', theme.border)}>
                  <div className={clsx('flex h-10 w-10 items-center justify-center rounded-xl', theme.chip)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className={clsx('mt-3 text-sm font-bold', theme.color)}>{theme.fullName}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{blurb}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-5 py-8 text-center lg:px-8">
          <Image src="/images/logo.jpeg" alt="SCALD" width={100} height={24} className="h-6 w-auto object-contain" />
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={clsx('mb-3 flex items-center gap-1.5 text-sm font-bold', accent)}>
        {icon}
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">Not enough data yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((c) => (
            <li key={c.code} className="flex items-center gap-2">
              <span className={clsx('rounded px-1.5 py-0.5 text-[9px] font-bold', SET_THEME[c.setCode].chip)}>
                {c.code}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-slate-700">{c.name}</span>
              <span className="text-sm font-bold tabular-nums">{c.score}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
