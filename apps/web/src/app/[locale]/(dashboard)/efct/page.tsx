import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { IndicatorBarChart } from '@/components/dashboard/EcologicalChart';
import { CheckCircle2, Circle, AlertCircle, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const mainIndicators = [
  { id: 1, nameKey: 'indicatorEnergy', layer: 1, status: 'validated', score: 62, unit: 'kWh/kişi/yıl', value: '3.850', subCount: 8 },
  { id: 2, nameKey: 'indicatorWater', layer: 1, status: 'validated', score: 71, unit: 'L/kişi/gün', value: '145', subCount: 6 },
  { id: 3, nameKey: 'indicatorWaste', layer: 1, status: 'estimated', score: 45, unit: 'kg/kişi/yıl', value: '412', subCount: 7 },
  { id: 4, nameKey: 'indicatorTransport', layer: 1, status: 'estimated', score: 38, unit: 'km/kişi/yıl', value: '8.200', subCount: 9 },
  { id: 5, nameKey: 'indicatorGreenSpace', layer: 1, status: 'validated', score: 58, unit: 'm²/kişi', value: '12,4', subCount: 5 },
  { id: 6, nameKey: 'indicatorPopulation', layer: 1, status: 'validated', score: 100, unit: 'kişi', value: '284.000', subCount: 4 },
  { id: 7, nameKey: 'indicatorClimate', layer: 1, status: 'validated', score: 100, unit: '°C / mm', value: 'automatic', subCount: 6 },
  { id: 8, nameKey: 'indicatorAirQuality', layer: 2, status: 'estimated', score: 66, unit: 'µg/m³ PM2.5', value: '18,4', subCount: 5 },
  { id: 9, nameKey: 'indicatorFloodRisk', layer: 2, status: 'pilot', score: 0, unit: 'riskIndex', value: '—', subCount: 7 },
  { id: 10, nameKey: 'indicatorBiodiversity', layer: 2, status: 'pilot', score: 42, unit: 'tür/km²', value: '124', subCount: 8 },
];

export default async function EfctPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'efct' });

  const statusConfig = {
    validated: { label: t('validated'), color: 'text-emerald-700 bg-emerald-100', icon: CheckCircle2 },
    estimated: { label: t('estimated'), color: 'text-amber-700 bg-amber-100', icon: AlertCircle },
    pilot: { label: t('pilot'), color: 'text-purple-700 bg-purple-100', icon: Circle },
  };

  const layerConfig: Record<number, { label: string; color: string }> = {
    1: { label: t('layerShort1'), color: 'bg-blue-100 text-blue-700' },
    2: { label: t('layerShort2'), color: 'bg-violet-100 text-violet-700' },
    3: { label: t('layerShort3'), color: 'bg-orange-100 text-orange-700' },
  };

  const validatedCount = mainIndicators.filter((i) => i.status === 'validated').length;
  const totalScore = Math.round(
    mainIndicators.filter((i) => i.score > 0).reduce((acc, i) => acc + i.score, 0) /
      mainIndicators.filter((i) => i.score > 0).length
  );

  return (
    <main id="main-content" className="flex-1">
      <Header locale={locale} title={t('title')} subtitle={t('subtitle')} />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{t('averageScore')}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{totalScore}</p>
            <p className="mt-1 text-xs text-slate-400">{t('outOf100')}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{t('mainIndicators')}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">15</p>
            <p className="mt-1 text-xs text-slate-400">{mainIndicators.length} {t('active')}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{t('subIndicators')}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">80</p>
            <p className="mt-1 text-xs text-emerald-600">
              {mainIndicators.reduce((a, i) => a + i.subCount, 0)} {t('dataPoints')}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{t('validatedData')}</p>
            <p className="mt-1 text-3xl font-bold text-emerald-600">
              %{Math.round((validatedCount / mainIndicators.length) * 100)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {validatedCount}/{mainIndicators.length} {t('indicatorSuffix')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Indicator Table */}
          <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{t('mainIndicators')}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{t('mainIndicatorsDesc')}</p>
              </div>
              <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700">
                {t('addDataBtn')}
              </button>
            </div>

            <div className="divide-y divide-slate-50">
              {mainIndicators.map((indicator) => {
                const status = statusConfig[indicator.status as keyof typeof statusConfig];
                const layer = layerConfig[indicator.layer];
                const StatusIcon = status.icon;
                const displayValue = indicator.value === 'automatic' ? t('automatic') : indicator.value;
                const displayUnit = indicator.unit === 'riskIndex' ? t('riskIndex') : indicator.unit;

                return (
                  <div
                    key={indicator.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-slate-800">
                          {t(indicator.nameKey as any)}
                        </p>
                        <span className={clsx('rounded-full px-1.5 py-0.5 text-[10px] font-medium', layer.color)}>
                          {layer.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {displayValue} {displayUnit} · {indicator.subCount} {t('subIndicatorSuffix')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Score bar */}
                      <div className="hidden sm:flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={clsx(
                              'h-full rounded-full',
                              indicator.score >= 65 ? 'bg-emerald-500' :
                              indicator.score >= 40 ? 'bg-amber-500' : 'bg-slate-300'
                            )}
                            style={{ width: `${indicator.score}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 w-6 text-right">
                          {indicator.score > 0 ? indicator.score : '—'}
                        </span>
                      </div>

                      <span className={clsx('flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', status.color)}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>

                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bar Chart */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-900">{t('performanceScore')}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{t('performanceDesc')}</p>
            </div>
            <IndicatorBarChart locale={locale} />

            {/* Legend */}
            <div className="mt-4 flex items-center justify-center gap-4 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                <span className="text-xs text-slate-500">{t('good')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                <span className="text-xs text-slate-500">{t('moderate')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
                <span className="text-xs text-slate-500">{t('weak')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
