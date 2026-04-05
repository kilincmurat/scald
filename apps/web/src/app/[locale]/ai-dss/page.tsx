import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { ClimateAdaptationChart } from '@/components/dashboard/ClimateChart';
import { ArrowUpRight, Zap, Droplets, Trees, Wind, Bus, Recycle } from 'lucide-react';
import { clsx } from 'clsx';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const strategies = [
  {
    id: 1,
    title: 'Yenilenebilir Enerji Geçiş Programı',
    titleEn: 'Renewable Energy Transition Program',
    category: 'energy',
    priority: 'high',
    impact: 88,
    feasibility: 72,
    cost: 'Yüksek',
    timeframe: 'longTerm',
    risk: 'medium',
    description:
      'Belediye binalarında güneş paneli kurulumu ve rüzgar enerjisi alım sözleşmeleri ile enerji tüketiminin %60\'ını yenilenebilir kaynaklardan karşılama.',
    descriptionEn:
      'Install solar panels on municipal buildings and wind energy purchase agreements to cover 60% of energy consumption from renewable sources.',
    icon: Zap,
    iconColor: 'text-yellow-600 bg-yellow-50',
  },
  {
    id: 2,
    title: 'Akıllı Su Yönetim Sistemi',
    titleEn: 'Smart Water Management System',
    category: 'water',
    priority: 'high',
    impact: 75,
    feasibility: 85,
    cost: 'Orta',
    timeframe: 'mediumTerm',
    risk: 'low',
    description:
      'IoT sensörler ve akıllı sayaçlarla su kayıplarını %30 azaltma, yağmur suyu hasadı sistemleri kurma.',
    descriptionEn:
      'Reduce water losses by 30% with IoT sensors and smart meters, install rainwater harvesting systems.',
    icon: Droplets,
    iconColor: 'text-blue-600 bg-blue-50',
  },
  {
    id: 3,
    title: 'Kent Ormanlaştırma Programı',
    titleEn: 'Urban Forestation Program',
    category: 'greenSpace',
    priority: 'high',
    impact: 65,
    feasibility: 90,
    cost: 'Düşük',
    timeframe: 'shortTerm',
    risk: 'low',
    description:
      '5 yıl içinde 50.000 ağaç dikimi, yeşil çatı ve dikey bahçe uygulamaları ile kişi başı yeşil alanı 12\'den 18 m²\'ye çıkarma.',
    descriptionEn:
      'Plant 50,000 trees in 5 years, green roof and vertical garden applications to increase green space per capita from 12 to 18 m².',
    icon: Trees,
    iconColor: 'text-emerald-600 bg-emerald-50',
  },
  {
    id: 4,
    title: 'Sıfır Emisyonlu Toplu Taşıma Filosu',
    titleEn: 'Zero-Emission Public Transit Fleet',
    category: 'transport',
    priority: 'medium',
    impact: 82,
    feasibility: 55,
    cost: 'Çok Yüksek',
    timeframe: 'longTerm',
    risk: 'high',
    description:
      'Mevcut dizel otobüs filosunun 2030\'a kadar tamamen elektrikli araçlarla değiştirilmesi.',
    descriptionEn:
      'Complete replacement of the existing diesel bus fleet with electric vehicles by 2030.',
    icon: Bus,
    iconColor: 'text-indigo-600 bg-indigo-50',
  },
  {
    id: 5,
    title: 'Hava Kalitesi İyileştirme Paketi',
    titleEn: 'Air Quality Improvement Package',
    category: 'air',
    priority: 'medium',
    impact: 70,
    feasibility: 78,
    cost: 'Orta',
    timeframe: 'mediumTerm',
    risk: 'low',
    description:
      'Düşük emisyon bölgeleri oluşturma, baca filtresi zorunluluğu ve bisiklet yolu genişletme.',
    descriptionEn:
      'Create low emission zones, mandatory chimney filters, and bicycle lane expansion.',
    icon: Wind,
    iconColor: 'text-cyan-600 bg-cyan-50',
  },
  {
    id: 6,
    title: 'Döngüsel Ekonomi Atık Programı',
    titleEn: 'Circular Economy Waste Program',
    category: 'waste',
    priority: 'medium',
    impact: 60,
    feasibility: 80,
    cost: 'Düşük',
    timeframe: 'shortTerm',
    risk: 'low',
    description:
      'Kapıdan kapıya organik atık toplama, biyogaz tesisi kurulumu ile geri dönüşüm oranını %34\'ten %65\'e çıkarma.',
    descriptionEn:
      'Door-to-door organic waste collection, biogas plant installation to increase recycling rate from 34% to 65%.',
    icon: Recycle,
    iconColor: 'text-green-600 bg-green-50',
  },
];

const priorityConfig = {
  high: { label: 'Yüksek Öncelik', labelEn: 'High Priority', color: 'bg-red-100 text-red-700' },
  medium: { label: 'Orta Öncelik', labelEn: 'Medium Priority', color: 'bg-amber-100 text-amber-700' },
  low: { label: 'Düşük Öncelik', labelEn: 'Low Priority', color: 'bg-slate-100 text-slate-600' },
};

const timeframeConfig = {
  shortTerm: { label: 'Kısa Vadeli (1–2 yıl)', labelEn: 'Short Term (1–2 years)' },
  mediumTerm: { label: 'Orta Vadeli (3–5 yıl)', labelEn: 'Medium Term (3–5 years)' },
  longTerm: { label: 'Uzun Vadeli (5+ yıl)', labelEn: 'Long Term (5+ years)' },
};

export default async function AiDssPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'aiDss' });

  return (
    <main id="main-content" className="flex-1">
      <Header locale={locale} title={t('title')} subtitle={t('subtitle')} />

      <div className="p-6 space-y-6">
        {/* Summary + Chart */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 content-start">
            <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">İklim Adaptasyon Skoru</p>
              <div className="mt-2 flex items-end gap-2">
                <p className="text-4xl font-bold text-emerald-600">64</p>
                <p className="mb-1 text-sm text-slate-500">/ 100</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[64%] rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">Ulusal ortalama: 51 · AB ortalaması: 72</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Toplam Strateji</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">30</p>
              <p className="mt-0.5 text-xs text-emerald-600">24 aktif</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Yüksek Öncelik</p>
              <p className="mt-1 text-2xl font-bold text-red-600">
                {strategies.filter((s) => s.priority === 'high').length}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">strateji</p>
            </div>
          </div>

          {/* Climate Adaptation Chart */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-slate-900">İklim Adaptasyon Skoru Projeksiyonu</h2>
              <p className="text-xs text-slate-500 mt-0.5">Mevcut politika vs önerilen stratejiler</p>
            </div>
            <ClimateAdaptationChart locale={locale} />
          </div>
        </div>

        {/* Strategy List */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Strateji Önerileri</h2>
              <p className="text-xs text-slate-500 mt-0.5">AI tarafından ekolojik veriler analiz edilerek üretildi</p>
            </div>
            <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700">
              Yeniden Üret
            </button>
          </div>

          <div className="divide-y divide-slate-50">
            {strategies.map((strategy) => {
              const priority = priorityConfig[strategy.priority as keyof typeof priorityConfig];
              const timeframe = timeframeConfig[strategy.timeframe as keyof typeof timeframeConfig];
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
                          {locale === 'en' ? strategy.titleEn : strategy.title}
                        </h3>
                        <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0', priority.color)}>
                          {locale === 'en' ? priority.labelEn : priority.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {locale === 'en' ? strategy.descriptionEn : strategy.description}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        {/* Impact */}
                        <div>
                          <p className="text-[10px] text-slate-400 mb-1">Etki</p>
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
                          <p className="text-[10px] text-slate-400 mb-1">Fizibilite</p>
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
                          <span className="font-medium text-slate-700">Maliyet: </span>
                          {strategy.cost}
                        </div>
                        <div className="text-xs text-slate-500">
                          <span className="font-medium text-slate-700">Süre: </span>
                          {locale === 'en' ? timeframe.labelEn : timeframe.label}
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
