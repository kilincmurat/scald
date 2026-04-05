import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { IndicatorBarChart } from '@/components/dashboard/EcologicalChart';
import { CheckCircle2, Circle, AlertCircle, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const mainIndicators = [
  {
    id: 1,
    name: 'Enerji Tüketimi',
    nameEn: 'Energy Consumption',
    layer: 1,
    status: 'validated',
    score: 62,
    unit: 'kWh/kişi/yıl',
    value: '3.850',
    subCount: 8,
  },
  {
    id: 2,
    name: 'Su Kullanımı',
    nameEn: 'Water Usage',
    layer: 1,
    status: 'validated',
    score: 71,
    unit: 'L/kişi/gün',
    value: '145',
    subCount: 6,
  },
  {
    id: 3,
    name: 'Atık Yönetimi',
    nameEn: 'Waste Management',
    layer: 1,
    status: 'estimated',
    score: 45,
    unit: 'kg/kişi/yıl',
    value: '412',
    subCount: 7,
  },
  {
    id: 4,
    name: 'Ulaşım & Mobilite',
    nameEn: 'Transport & Mobility',
    layer: 1,
    status: 'estimated',
    score: 38,
    unit: 'km/kişi/yıl',
    value: '8.200',
    subCount: 9,
  },
  {
    id: 5,
    name: 'Yeşil Alan & Arazi Kullanımı',
    nameEn: 'Green Space & Land Use',
    layer: 1,
    status: 'validated',
    score: 58,
    unit: 'm²/kişi',
    value: '12,4',
    subCount: 5,
  },
  {
    id: 6,
    name: 'Nüfus & Demografik',
    nameEn: 'Population & Demographics',
    layer: 1,
    status: 'validated',
    score: 100,
    unit: 'kişi',
    value: '284.000',
    subCount: 4,
  },
  {
    id: 7,
    name: 'İklim Verileri (API)',
    nameEn: 'Climate Data (API)',
    layer: 1,
    status: 'validated',
    score: 100,
    unit: '°C / mm',
    value: 'Otomatik',
    subCount: 6,
  },
  {
    id: 8,
    name: 'Hava Kalitesi',
    nameEn: 'Air Quality',
    layer: 2,
    status: 'estimated',
    score: 66,
    unit: 'µg/m³ PM2.5',
    value: '18,4',
    subCount: 5,
  },
  {
    id: 9,
    name: 'Taşkın & İklim Riski',
    nameEn: 'Flood & Climate Risk',
    layer: 2,
    status: 'pilot',
    score: 0,
    unit: 'risk indeksi',
    value: '—',
    subCount: 7,
  },
  {
    id: 10,
    name: 'Biyolojik Çeşitlilik',
    nameEn: 'Biodiversity',
    layer: 2,
    status: 'pilot',
    score: 42,
    unit: 'tür/km²',
    value: '124',
    subCount: 8,
  },
];

const statusConfig = {
  validated: { label: 'Doğrulanmış', labelEn: 'Validated', color: 'text-emerald-700 bg-emerald-100', icon: CheckCircle2 },
  estimated: { label: 'Tahmini', labelEn: 'Estimated', color: 'text-amber-700 bg-amber-100', icon: AlertCircle },
  pilot: { label: 'Pilot', labelEn: 'Pilot', color: 'text-purple-700 bg-purple-100', icon: Circle },
};

const layerConfig = {
  1: { label: 'Katman 1', color: 'bg-blue-100 text-blue-700' },
  2: { label: 'Katman 2', color: 'bg-violet-100 text-violet-700' },
  3: { label: 'Katman 3', color: 'bg-orange-100 text-orange-700' },
};

export default async function EfctPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'efct' });

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
            <p className="text-xs font-medium text-slate-500">Ortalama Skor</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{totalScore}</p>
            <p className="mt-1 text-xs text-slate-400">100 üzerinden</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Ana Göstergeler</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">15</p>
            <p className="mt-1 text-xs text-slate-400">{mainIndicators.length} aktif</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Alt Göstergeler</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">80</p>
            <p className="mt-1 text-xs text-emerald-600">
              {mainIndicators.reduce((a, i) => a + i.subCount, 0)} veri noktası
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Doğrulanmış Veri</p>
            <p className="mt-1 text-3xl font-bold text-emerald-600">
              %{Math.round((validatedCount / mainIndicators.length) * 100)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {validatedCount}/{mainIndicators.length} gösterge
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Indicator Table */}
          <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{t('mainIndicators')}</h2>
                <p className="text-xs text-slate-500 mt-0.5">15 ana gösterge · 80 alt gösterge</p>
              </div>
              <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700">
                + Veri Gir
              </button>
            </div>

            <div className="divide-y divide-slate-50">
              {mainIndicators.map((indicator) => {
                const status = statusConfig[indicator.status as keyof typeof statusConfig];
                const layer = layerConfig[indicator.layer as keyof typeof layerConfig];
                const StatusIcon = status.icon;

                return (
                  <div
                    key={indicator.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-slate-800">
                          {locale === 'en' ? indicator.nameEn : indicator.name}
                        </p>
                        <span className={clsx('rounded-full px-1.5 py-0.5 text-[10px] font-medium', layer.color)}>
                          {layer.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {indicator.value} {indicator.unit} · {indicator.subCount} alt gösterge
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
                        {locale === 'en' ? status.labelEn : status.label}
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
              <h2 className="text-sm font-semibold text-slate-900">Performans Skoru</h2>
              <p className="text-xs text-slate-500 mt-0.5">Ana göstergeler bazında (0–100)</p>
            </div>
            <IndicatorBarChart locale={locale} />

            {/* Legend */}
            <div className="mt-4 flex items-center justify-center gap-4 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                <span className="text-xs text-slate-500">İyi (≥65)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                <span className="text-xs text-slate-500">Orta (40–64)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
                <span className="text-xs text-slate-500">Zayıf (&lt;40)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
