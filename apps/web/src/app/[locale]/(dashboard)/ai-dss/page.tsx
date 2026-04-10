import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { ClimateAdaptationChart } from '@/components/dashboard/ClimateChart';
import { ArrowUpRight, Zap, Droplets, Trees, Wind, Bus, Recycle } from 'lucide-react';
import { clsx } from 'clsx';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const strategies = [
  { id: 1, titleKey: 'strategy1Title', descKey: 'strategy1Desc', category: 'energy', priority: 'high', impact: 88, feasibility: 72, costKey: 'costHigh', timeframeKey: 'longTermYears', risk: 'medium', icon: Zap, iconColor: 'text-yellow-600 bg-yellow-50' },
  { id: 2, titleKey: 'strategy2Title', descKey: 'strategy2Desc', category: 'water', priority: 'high', impact: 75, feasibility: 85, costKey: 'costMedium', timeframeKey: 'mediumTermYears', risk: 'low', icon: Droplets, iconColor: 'text-blue-600 bg-blue-50' },
  { id: 3, titleKey: 'strategy3Title', descKey: 'strategy3Desc', category: 'greenSpace', priority: 'high', impact: 65, feasibility: 90, costKey: 'costLow', timeframeKey: 'shortTermYears', risk: 'low', icon: Trees, iconColor: 'text-emerald-600 bg-emerald-50' },
  { id: 4, titleKey: 'strategy4Title', descKey: 'strategy4Desc', category: 'transport', priority: 'medium', impact: 82, feasibility: 55, costKey: 'costVeryHigh', timeframeKey: 'longTermYears', risk: 'high', icon: Bus, iconColor: 'text-indigo-600 bg-indigo-50' },
  { id: 5, titleKey: 'strategy5Title', descKey: 'strategy5Desc', category: 'air', priority: 'medium', impact: 70, feasibility: 78, costKey: 'costMedium', timeframeKey: 'mediumTermYears', risk: 'low', icon: Wind, iconColor: 'text-cyan-600 bg-cyan-50' },
  { id: 6, titleKey: 'strategy6Title', descKey: 'strategy6Desc', category: 'waste', priority: 'medium', impact: 60, feasibility: 80, costKey: 'costLow', timeframeKey: 'shortTermYears', risk: 'low', icon: Recycle, iconColor: 'text-green-600 bg-green-50' },
];

export default async function AiDssPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'aiDss' });

  const priorityConfig = {
    high: { label: t('highPriority'), color: 'bg-red-100 text-red-700' },
    medium: { label: t('mediumPriority'), color: 'bg-amber-100 text-amber-700' },
    low: { label: t('lowPriority'), color: 'bg-slate-100 text-slate-600' },
  };

  return (
    <main id="main-content" className="flex-1">
      <Header locale={locale} title={t('title')} subtitle={t('subtitle')} />

      <div className="p-6 space-y-6">
        {/* Summary + Chart */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 content-start">
            <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">{t('climateScore')}</p>
              <div className="mt-2 flex items-end gap-2">
                <p className="text-4xl font-bold text-emerald-600">64</p>
                <p className="mb-1 text-sm text-slate-500">/ 100</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[64%] rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">{t('nationalEuAvg')}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">{t('totalStrategies')}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">30</p>
              <p className="mt-0.5 text-xs text-emerald-600">24 {t('activeCount')}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">{t('highPriority')}</p>
              <p className="mt-1 text-2xl font-bold text-red-600">
                {strategies.filter((s) => s.priority === 'high').length}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">{t('strategyUnit')}</p>
            </div>
          </div>

          {/* Climate Adaptation Chart */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-slate-900">{t('projectionTitle')}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{t('projectionSubtitle')}</p>
            </div>
            <ClimateAdaptationChart locale={locale} />
          </div>
        </div>

        {/* Strategy List */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{t('strategyRecommendations')}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{t('strategyRecommendationsDesc')}</p>
            </div>
            <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700">
              {t('regenerate')}
            </button>
          </div>

          <div className="divide-y divide-slate-50">
            {strategies.map((strategy) => {
              const priority = priorityConfig[strategy.priority as keyof typeof priorityConfig];
              const Icon = strategy.icon;

              return (
                <div key={strategy.id} className="p-5 hover:bg-slate-50 transition cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className={clsx('mt-0.5 rounded-lg p-2.5 shrink-0', strategy.iconColor)}>
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {t(strategy.titleKey as any)}
                        </h3>
                        <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0', priority.color)}>
                          {priority.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {t(strategy.descKey as any)}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        {/* Impact */}
                        <div>
                          <p className="text-[10px] text-slate-400 mb-1">{t('impact')}</p>
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${strategy.impact}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-700">{strategy.impact}</span>
                          </div>
                        </div>
                        {/* Feasibility */}
                        <div>
                          <p className="text-[10px] text-slate-400 mb-1">{t('feasibility')}</p>
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-blue-500"
                                style={{ width: `${strategy.feasibility}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-700">{strategy.feasibility}</span>
                          </div>
                        </div>
                        <div className="text-xs text-slate-500">
                          <span className="font-medium text-slate-700">{t('costLabel')} </span>
                          {t(strategy.costKey as any)}
                        </div>
                        <div className="text-xs text-slate-500">
                          <span className="font-medium text-slate-700">{t('durationLabel')} </span>
                          {t(strategy.timeframeKey as any)}
                        </div>
                      </div>
                    </div>

                    <button className="shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:border-slate-300 hover:text-slate-600">
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
