'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useDataEntry } from '@/stores/data-entry';
import { useEffectiveWeights } from '@/stores/weights';
import { useEffectiveMunicipality } from '@/hooks/useEffectiveMunicipality';
import { computeSetScores, SET_THEME } from '@/lib/scores';
import {
  fetchApprovedMunicipalityScores,
  type MunicipalityEntries,
} from '@/lib/data-entry-service';
import { MUNICIPALITIES } from '@/lib/pilot-municipalities';
import type { SetCode } from '@/lib/scald-indicators';
import {
  Layers,
  Filter,
  BarChart3,
  Globe2,
  MapIcon,
  X,
  Info,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { PartnerMunicipality } from './MapView';

const MapView = dynamic(() => import('./MapView').then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-slate-100">
      <div className="text-center">
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="text-sm text-slate-500">Loading map…</p>
      </div>
    </div>
  ),
});

const SET_LAYERS: { id: 'total' | SetCode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'total', label: 'Overall', icon: BarChart3 },
  { id: 'ES', label: 'Environmental', icon: MapIcon },
  { id: 'SS', label: 'Social', icon: MapIcon },
  { id: 'MS', label: 'Managerial', icon: MapIcon },
  { id: 'ECS', label: 'Economic', icon: MapIcon },
];

const ZERO_SCORES: Record<SetCode, number> = { ES: 0, SS: 0, MS: 0, ECS: 0 };

export function MapPageClient() {
  const { municipalityId } = useEffectiveMunicipality();
  const selectedYear = useDataEntry((s) => s.selectedYear);
  const weights = useEffectiveWeights();

  // Real, current scores: the approved data for each municipality in the
  // selected year. RLS scopes what we can read (researchers/admin see every
  // partner; a decision maker sees only their own). Municipalities without
  // approved data for the year simply show no score — no demo/placeholder.
  const [approved, setApproved] = useState<MunicipalityEntries>({});
  useEffect(() => {
    let cancelled = false;
    void fetchApprovedMunicipalityScores(selectedYear).then((data) => {
      if (!cancelled) setApproved(data);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  const partners: PartnerMunicipality[] = useMemo(() => {
    return MUNICIPALITIES.filter((m) => !m.demo).map((m) => {
      const muniEntries = approved[m.id];
      const ss = muniEntries ? computeSetScores(muniEntries, weights) : null;
      const scores: Record<SetCode, number> = ss
        ? { ES: ss.ES.score, SS: ss.SS.score, MS: ss.MS.score, ECS: ss.ECS.score }
        : ZERO_SCORES;
      const withData = [scores.ES, scores.SS, scores.MS, scores.ECS].filter((v) => v > 0);
      const total =
        withData.length === 0 ? 0 : Math.round(withData.reduce((s, v) => s + v, 0) / withData.length);

      return {
        id: m.id,
        name: m.name,
        country: m.country,
        countryCode: m.countryCode,
        lat: m.lat,
        lng: m.lng,
        population: m.population,
        partner: `${m.region} · ${m.country}`,
        scores,
        total,
        isMine: m.id === municipalityId,
      };
    });
  }, [approved, weights, municipalityId]);

  const [activeLayer, setActiveLayer] = useState<'total' | SetCode>('total');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [showPanel, setShowPanel] = useState(true);

  // Auto-hide panel on mobile
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1024px)');
    if (media.matches) setShowPanel(false);
  }, []);

  const toggleCountry = (code: string) => {
    setSelectedCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const filtered = useMemo(
    () =>
      selectedCountries.length === 0
        ? partners
        : partners.filter((m) => selectedCountries.includes(m.countryCode)),
    [selectedCountries, partners],
  );

  const activeValue = (m: PartnerMunicipality) => {
    if (activeLayer === 'total') return m.total;
    return m.scores[activeLayer];
  };

  // Only municipalities that actually have a score for the active layer count
  // toward the summary — municipalities with no approved data aren't "worst = 0".
  const scored = useMemo(() => filtered.filter((m) => activeValue(m) > 0), [filtered, activeLayer]);

  const avgScore = useMemo(
    () =>
      scored.length === 0
        ? 0
        : Math.round(scored.reduce((s, m) => s + activeValue(m), 0) / scored.length),
    [scored, activeLayer],
  );

  const bestCity = useMemo(
    () =>
      scored.length === 0
        ? undefined
        : scored.reduce((best, m) => (activeValue(m) > activeValue(best) ? m : best), scored[0]),
    [scored, activeLayer],
  );

  const worstCity = useMemo(
    () =>
      scored.length === 0
        ? undefined
        : scored.reduce((worst, m) => (activeValue(m) < activeValue(worst) ? m : worst), scored[0]),
    [scored, activeLayer],
  );

  return (
    <div className="relative flex flex-1 overflow-hidden">
      {/* Panel */}
      <div
        className={clsx(
          'absolute inset-y-0 left-0 z-30 flex w-80 flex-col gap-4 overflow-y-auto border-r border-slate-200 bg-white p-4 shadow-lg transition-transform duration-300 lg:relative lg:z-0 lg:w-72 lg:shadow-none',
          showPanel ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:hidden',
        )}
      >
        <div className="flex items-center justify-between lg:hidden">
          <p className="text-sm font-bold text-slate-900">Filters</p>
          <button onClick={() => setShowPanel(false)} className="rounded-lg p-1 text-slate-500">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Layer selector */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Layers className="h-4 w-4 text-slate-400" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Layer
            </p>
          </div>
          <div className="flex flex-col gap-1">
            {SET_LAYERS.map((layer) => {
              const Icon = layer.icon;
              const isActive = activeLayer === layer.id;
              const theme = layer.id !== 'total' ? SET_THEME[layer.id] : null;
              return (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  className={clsx(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {theme ? (
                    <span className={clsx('h-3 w-3 rounded-full bg-gradient-to-br', theme.gradient)} />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span className="flex-1 text-left">{layer.label}</span>
                  {theme && (
                    <span className="text-[10px] font-bold uppercase opacity-60">{layer.id}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Country filter */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-slate-400" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Country Filter
            </p>
          </div>
          <div className="flex flex-col gap-1">
            {['TR', 'GR', 'RO', 'MK'].map((c) => {
              const m = partners.find((p) => p.countryCode === c);
              if (!m) return null;
              return (
                <button
                  key={c}
                  onClick={() => toggleCountry(c)}
                  className={clsx(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition',
                    selectedCountries.includes(c)
                      ? 'bg-blue-50 font-semibold text-blue-700 ring-1 ring-blue-200'
                      : 'text-slate-600 hover:bg-slate-50',
                  )}
                >
                  <span className="text-base">
                    {c === 'TR' ? '🇹🇷' : c === 'GR' ? '🇬🇷' : c === 'RO' ? '🇷🇴' : '🇲🇰'}
                  </span>
                  <span className="flex-1 text-left">{m.country}</span>
                  <span className="text-xs text-slate-400">{m.name}</span>
                </button>
              );
            })}
            {selectedCountries.length > 0 && (
              <button
                onClick={() => setSelectedCountries([])}
                className="mt-1 text-xs text-slate-400 underline hover:text-slate-600"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>

        {/* Summary */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Summary
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[10px] text-slate-500">Avg. score</p>
              <p
                className="mt-1 text-lg font-bold"
                style={{
                  color: avgScore >= 65 ? '#16a34a' : avgScore >= 50 ? '#d97706' : '#dc2626',
                }}
              >
                {avgScore}
                <span className="ml-1 text-xs font-normal text-slate-400">/ 100</span>
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[10px] text-slate-500">Municipalities</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{filtered.length}</p>
            </div>
          </div>

          {bestCity && (
            <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-[10px] font-semibold text-emerald-600">Best Performance</p>
              <p className="mt-0.5 font-semibold text-slate-900">{bestCity.name}</p>
              <p className="text-xs text-slate-500">
                {bestCity.country} · {activeValue(bestCity)} points
              </p>
            </div>
          )}

          {worstCity && bestCity && worstCity.id !== bestCity.id && (
            <div className="mt-2 rounded-lg border border-red-100 bg-red-50 p-3">
              <p className="text-[10px] font-semibold text-red-500">Needs Attention</p>
              <p className="mt-0.5 font-semibold text-slate-900">{worstCity.name}</p>
              <p className="text-xs text-slate-500">
                {worstCity.country} · {activeValue(worstCity)} points
              </p>
            </div>
          )}
        </div>

        {/* Partner list */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Partners
          </p>
          <div className="space-y-1.5">
            {partners.map((m) => {
              const val = activeValue(m);
              const color = val >= 65 ? '#16a34a' : val >= 50 ? '#d97706' : val > 0 ? '#dc2626' : '#94a3b8';
              return (
                <div key={m.id} className="rounded-lg border border-slate-100 p-2">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {m.name}
                        {m.isMine && (
                          <span className="ml-1.5 rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-bold text-emerald-700">
                            YOU
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400">{m.partner}</p>
                    </div>
                    <span className="font-bold" style={{ color }}>
                      {val || '—'}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${val}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <p className="text-[10px] leading-relaxed text-slate-500">
            Scores are the official (approved) figures for the selected year — “—” means a
            municipality hasn’t had its data approved yet. Cross-municipality comparison is visible
            to researchers and admins; a decision maker sees their own municipality.
          </p>
        </div>
      </div>

      {/* Map area */}
      <div className="relative flex-1">
        {/* Mobile toggle */}
        {!showPanel && (
          <button
            onClick={() => setShowPanel(true)}
            className="absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-md lg:hidden"
          >
            <Filter className="h-3.5 w-3.5" /> Filters
          </button>
        )}
        <MapView
          municipalities={filtered}
          activeLayer={activeLayer}
        />
      </div>
    </div>
  );
}
