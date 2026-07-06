'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { useProfile } from '@/hooks/useProfile';
import { useDataEntry } from '@/stores/data-entry';
import { useEffectiveWeights } from '@/stores/weights';
import { computeCategoryScores, computeSetScores, SET_THEME, scoreBand } from '@/lib/scores';
import { INDICATORS, type SetCode } from '@/lib/scald-indicators';
import { clsx } from 'clsx';

export default function MyMunicipalityPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { profile } = useProfile();
  const loadMunicipality = useDataEntry((s) => s.loadMunicipality);
  const currentMunicipalityId = useDataEntry((s) => s.municipalityId);
  const entries = useDataEntry((s) => s.entries);

  useEffect(() => {
    if (!mounted) return;
    if (profile?.municipalityId && profile.municipalityId !== currentMunicipalityId) {
      void loadMunicipality(profile.municipalityId);
    }
  }, [mounted, profile?.municipalityId, currentMunicipalityId, loadMunicipality]);

  const weights = useEffectiveWeights();
  const catScores = useMemo(() => computeCategoryScores(entries, weights), [entries, weights]);
  const setScores = useMemo(() => computeSetScores(entries, weights), [entries, weights]);
  const municipality = profile?.municipality;

  return (
    <main id="main-content" className="flex-1">
      <Header
        title={municipality?.name ?? 'My Municipality'}
        subtitle="Detailed community view — set and category scores"
      />
      {!mounted ? (
        <div className="p-6">
          <div className="h-40 rounded-xl bg-slate-100 animate-pulse" />
        </div>
      ) : !municipality ? (
        <div className="p-6 text-sm text-slate-500">No municipality on your profile.</div>
      ) : (
        <div className="p-4 lg:p-6 space-y-5">
          {/* Set scores */}
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {(['ES', 'SS', 'MS', 'ECS'] as SetCode[]).map((sc) => {
              const s = setScores[sc];
              const theme = SET_THEME[sc];
              const b = scoreBand(s.score);
              return (
                <div key={sc} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <span className={clsx('rounded px-1.5 py-0.5 text-[10px] font-bold', theme.chip)}>
                    {sc}
                  </span>
                  <p className="mt-2 text-xs font-medium text-slate-600">{theme.fullName}</p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-slate-900">
                      {s.score > 0 ? s.score : '—'}
                    </span>
                    <span className="text-xs text-slate-400">/ 100</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={clsx('h-full rounded-full bg-gradient-to-r', theme.gradient)}
                      style={{ width: `${s.score}%` }}
                    />
                  </div>
                  <p className={clsx('mt-2 text-[10px] font-medium', b.color)}>
                    {s.score > 0 ? b.label : 'No data'}
                  </p>
                </div>
              );
            })}
          </section>

          {/* Category grid */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">All 24 Categories</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {catScores.map((cs) => {
                const theme = SET_THEME[cs.setCode];
                const b = scoreBand(cs.score);
                return (
                  <div
                    key={cs.code}
                    className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2 shadow-sm"
                  >
                    <span className={clsx('rounded px-1.5 py-0.5 text-[10px] font-bold', theme.chip)}>
                      {cs.code}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-800 truncate">{cs.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {cs.entered}/{cs.total} indicators
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={clsx(
                          'h-2 w-2 rounded-full',
                          cs.entered > 0 ? b.chipColor : 'bg-slate-200',
                        )}
                      />
                      <span className="w-6 text-right text-xs font-semibold text-slate-700">
                        {cs.entered > 0 ? cs.score : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
