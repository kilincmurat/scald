'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useProfile } from '@/hooks/useProfile';
import { useDataEntry } from '@/stores/data-entry';
import { YearPicker } from '@/components/data-entry/YearPicker';
import { useEffectiveWeights } from '@/stores/weights';
import { computeOverallScore, computeSetScores, scoreBand, SET_THEME } from '@/lib/scores';
import { PILOT_MUNICIPALITIES } from '@/lib/pilot-municipalities';
import { INDICATORS, type SetCode } from '@/lib/scald-indicators';
import { Trees, Sparkles, Users2, ArrowRight, MessageSquare, MapPin } from 'lucide-react';
import { clsx } from 'clsx';

export function PublicDashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { profile } = useProfile();
  const loadMunicipality = useDataEntry((s) => s.loadMunicipality);
  const currentMunicipalityId = useDataEntry((s) => s.municipalityId);
  const entries = useDataEntry((s) => s.entries);

  const municipality = profile?.municipality;

  useEffect(() => {
    if (!mounted) return;
    if (profile?.municipalityId && profile.municipalityId !== currentMunicipalityId) {
      void loadMunicipality(profile.municipalityId);
    }
  }, [mounted, profile?.municipalityId, currentMunicipalityId, loadMunicipality]);

  const weights = useEffectiveWeights();
  const overall = useMemo(() => computeOverallScore(entries, weights), [entries, weights]);
  const setScores = useMemo(() => computeSetScores(entries, weights), [entries, weights]);
  const band = scoreBand(overall.score);

  if (!mounted) {
    return (
      <div className="p-4 lg:p-6">
        <div className="h-40 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (!municipality) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <MapPin className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-4 text-lg font-bold text-slate-900">No municipality selected</h2>
          <p className="mt-1 text-sm text-slate-500">
            Your profile isn't linked to a pilot city yet. Please contact the SCALD team.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 lg:space-y-6">
      <div className="flex justify-end">
        <YearPicker size="sm" />
      </div>
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 shadow-sm lg:p-8">
        <div className="flex items-center gap-3">
          <span className="text-3xl leading-none">{municipality.flag}</span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Your Municipality
            </p>
            <h2 className="text-xl font-bold text-slate-900 lg:text-2xl">
              {municipality.name}, {municipality.country}
            </h2>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sustainability Score
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-6xl font-bold text-slate-900">{overall.score}</span>
              <span className="text-lg text-slate-400">/ 100</span>
            </div>
            <span
              className={clsx(
                'mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ring-1',
                band.color,
                band.bg,
                band.ring,
              )}
            >
              {band.label}
            </span>
            <p className="mt-3 text-xs text-slate-500">
              Based on {overall.entered} of {overall.total} tracked indicators.
            </p>
          </div>
          <div className="lg:pl-6 lg:border-l lg:border-emerald-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Ecological Footprint
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <Trees className="h-6 w-6 text-emerald-600" />
              <span className="text-5xl font-bold text-slate-900">{overall.ef}</span>
              <span className="text-sm text-slate-400">gHa/capita</span>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Global target: 2.5 gHa/capita. Lower is better.
            </p>
          </div>
        </div>
      </section>

      {/* 4 sets simple */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">4 Sustainability Areas</h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
        </div>
      </section>

      {/* Peer comparison */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Partner Cities in the KA220-ADU Project
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PILOT_MUNICIPALITIES.map((m) => (
            <div
              key={m.id}
              className={clsx(
                'rounded-xl border p-3',
                m.id === municipality.id ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl leading-none">{m.flag}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{m.name}</p>
                  <p className="text-[10px] text-slate-500">{m.country}</p>
                </div>
                {m.id === municipality.id && (
                  <span className="ml-auto rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    YOU
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTAs */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Link
          href="/my-municipality"
          className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">More about {municipality.name}</p>
            <p className="text-xs text-slate-500">
              See sub-scores, targets and improvement trends.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5" />
        </Link>

        <Link
          href="/feedback"
          className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Share your feedback</p>
            <p className="text-xs text-slate-500">
              Suggestions, concerns, ideas — sent to your municipality.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5" />
        </Link>
      </section>
    </div>
  );
}
