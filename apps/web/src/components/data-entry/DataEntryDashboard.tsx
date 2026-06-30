'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { INDICATORS, TOTAL_INDICATORS, type SetCode } from '@/lib/scald-indicators';
import { useDataEntry } from '@/stores/data-entry';
import { Lock, CheckCircle2, ChevronRight, Trophy, Sparkles, Flame, Award } from 'lucide-react';
import { clsx } from 'clsx';

const SET_THEME: Record<SetCode, { border: string; chip: string; ring: string; iconBg: string; iconText: string; gradient: string }> = {
  ES: {
    border: 'border-emerald-200',
    chip: 'bg-emerald-100 text-emerald-700',
    ring: 'ring-emerald-200',
    iconBg: 'bg-emerald-500',
    iconText: 'text-emerald-600',
    gradient: 'from-emerald-500 to-green-600',
  },
  SS: {
    border: 'border-rose-200',
    chip: 'bg-rose-100 text-rose-700',
    ring: 'ring-rose-200',
    iconBg: 'bg-rose-500',
    iconText: 'text-rose-600',
    gradient: 'from-rose-500 to-pink-600',
  },
  MS: {
    border: 'border-blue-200',
    chip: 'bg-blue-100 text-blue-700',
    ring: 'ring-blue-200',
    iconBg: 'bg-blue-500',
    iconText: 'text-blue-600',
    gradient: 'from-blue-500 to-indigo-600',
  },
  ECS: {
    border: 'border-orange-200',
    chip: 'bg-orange-100 text-orange-700',
    ring: 'ring-orange-200',
    iconBg: 'bg-orange-500',
    iconText: 'text-orange-600',
    gradient: 'from-orange-500 to-amber-600',
  },
};

export function DataEntryDashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const overall = useDataEntry((s) => s.overallProgress());
  const level = useDataEntry((s) => s.level());
  const xp = useDataEntry((s) => s.xp);
  const badges = useDataEntry((s) => s.badges);
  const completed = useDataEntry((s) => s.completed);
  const categoryProgress = useDataEntry((s) => s.categoryProgress);
  const isUnlocked = useDataEntry((s) => s.isCategoryUnlocked);

  // Compute earned vs available badges
  const setCodes: SetCode[] = ['ES', 'SS', 'MS', 'ECS'];

  // Group categories by set
  const grouped = setCodes.map((sc) => ({
    set: sc,
    meta: INDICATORS.sets[sc],
    categories: INDICATORS.order.filter((c) => INDICATORS.categories[c].set === sc),
  }));

  if (!mounted) {
    return (
      <div className="p-6">
        <div className="h-32 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Player HUD */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Level */}
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-indigo-500 to-purple-600 p-5 text-white shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-80">
            <Sparkles className="h-3.5 w-3.5" /> Level
          </div>
          <p className="mt-2 text-4xl font-bold">{level.level}</p>
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${(level.xpInLevel / level.xpForNext) * 100}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs opacity-80">
              {level.xpInLevel} / {level.xpForNext} XP to next level
            </p>
          </div>
        </div>

        {/* XP */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Flame className="h-3.5 w-3.5 text-orange-500" /> Total XP
          </div>
          <p className="mt-2 text-4xl font-bold text-slate-900">{xp.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-400">+10 per indicator · +50 per category · +200 per set</p>
        </div>

        {/* Overall progress */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Trophy className="h-3.5 w-3.5 text-emerald-500" /> Overall Progress
          </div>
          <p className="mt-2 text-4xl font-bold text-slate-900">{overall.pct}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
              style={{ width: `${overall.pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            {overall.done} / {overall.total} indicators completed
          </p>
        </div>

        {/* Badges */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Award className="h-3.5 w-3.5 text-amber-500" /> Set Badges
          </div>
          <p className="mt-2 text-4xl font-bold text-slate-900">
            {badges.length}
            <span className="text-base font-normal text-slate-400"> / 4</span>
          </p>
          <div className="mt-3 flex gap-2">
            {setCodes.map((sc) => {
              const earned = badges.includes(sc);
              return (
                <div
                  key={sc}
                  className={clsx(
                    'flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold transition',
                    earned
                      ? `text-white bg-gradient-to-br ${SET_THEME[sc].gradient} shadow`
                      : 'bg-slate-100 text-slate-300',
                  )}
                  title={earned ? `${INDICATORS.sets[sc].name} — complete` : `${INDICATORS.sets[sc].name} — locked`}
                >
                  {sc.slice(0, 2)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sets and categories */}
      {grouped.map((group) => {
        const theme = SET_THEME[group.set];
        const setDone = group.categories.every((c) => completed[c]);
        const setProgress = group.categories.reduce(
          (acc, c) => {
            const p = categoryProgress(c);
            return { done: acc.done + p.done, total: acc.total + p.total };
          },
          { done: 0, total: 0 },
        );
        const setPct = setProgress.total ? Math.round((setProgress.done / setProgress.total) * 100) : 0;

        return (
          <section key={group.set} className="space-y-3">
            <div className="flex items-end justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    'flex h-9 items-center justify-center rounded-lg px-2.5 text-xs font-bold text-white',
                    `bg-gradient-to-br ${theme.gradient}`,
                  )}
                >
                  {group.set}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{group.meta.name} Sustainability</h2>
                  <p className="text-xs text-slate-500">
                    {group.categories.length} categories · {setProgress.total} indicators · {setPct}% complete
                    {setDone && ' · ✓ Badge earned'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {group.categories.map((catCode) => {
                const cat = INDICATORS.categories[catCode];
                const prog = categoryProgress(catCode);
                const isDone = !!completed[catCode];
                const unlocked = isUnlocked(catCode);

                return (
                  <CategoryCard
                    key={catCode}
                    code={catCode}
                    name={cat.name}
                    count={cat.indicators.length}
                    done={prog.done}
                    pct={prog.pct}
                    completed={isDone}
                    unlocked={unlocked}
                    theme={theme}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

interface CardProps {
  code: string;
  name: string;
  count: number;
  done: number;
  pct: number;
  completed: boolean;
  unlocked: boolean;
  theme: (typeof SET_THEME)[SetCode];
}

function CategoryCard({ code, name, count, done, pct, completed, unlocked, theme }: CardProps) {
  const body = (
    <div
      className={clsx(
        'group relative h-full rounded-xl border bg-white p-4 shadow-sm transition',
        completed && `${theme.border} ring-1 ${theme.ring}`,
        !completed && 'border-slate-200',
        unlocked && 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer',
        !unlocked && 'opacity-60 cursor-not-allowed',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className={clsx('inline-block rounded px-1.5 py-0.5 text-[10px] font-bold', theme.chip)}>
            {code}
          </span>
          <h3 className="mt-2 text-sm font-semibold text-slate-900 leading-tight line-clamp-2">{name}</h3>
        </div>
        {completed ? (
          <CheckCircle2 className={clsx('h-5 w-5 shrink-0', theme.iconText)} />
        ) : !unlocked ? (
          <Lock className="h-5 w-5 shrink-0 text-slate-300" />
        ) : (
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-medium text-slate-700">
            {done} / {count}
          </span>
          <span className="text-slate-400">{pct}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={clsx(
              'h-full rounded-full transition-all',
              completed ? `bg-gradient-to-r ${theme.gradient}` : 'bg-slate-300',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <p className="mt-3 text-[10px] text-slate-400">{count} indicators</p>
    </div>
  );

  if (!unlocked) return body;
  return (
    <Link href={`/data-entry/${code}`} className="block">
      {body}
    </Link>
  );
}
