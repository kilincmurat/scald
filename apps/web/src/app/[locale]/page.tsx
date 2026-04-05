import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { EcologicalRadarChart, FootprintTrendChart } from '@/components/dashboard/EcologicalChart';
import {
  Zap,
  Droplets,
  Recycle,
  Trees,
  Wind,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const recentActivities = [
  { type: 'success', label: 'Enerji tüketim verisi güncellendi', time: '2 saat önce' },
  { type: 'pending', label: 'Su kullanım raporu bekleniyor', time: '5 saat önce' },
  { type: 'warning', label: 'Atık verileri eksik — Q3 2024', time: '1 gün önce' },
  { type: 'success', label: '12 yeni strateji üretildi', time: '2 gün önce' },
  { type: 'success', label: 'Yıllık rapor oluşturuldu', time: '3 gün önce' },
];

export default async function DashboardPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard' });

  return (
    <main id="main-content" className="flex-1">
      <Header
        locale={locale}
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard
            title="Ekolojik Ayak İzi"
            value="3.7"
            unit="gHa/kişi"
            trend="up"
            trendLabel="−0.2 yıllık"
            target="2.8 gHa"
            color="green"
            icon={Trees}
          />
          <StatCard
            title="Karbon Emisyonu"
            value="4.2"
            unit="ton CO₂"
            trend="up"
            trendLabel="−8% geçen yıl"
            target="3.5 ton"
            color="blue"
            icon={Wind}
          />
          <StatCard
            title="Su Kullanımı"
            value="145"
            unit="L/gün kişi"
            trend="stable"
            trendLabel="Stabil"
            target="120 L"
            color="blue"
            icon={Droplets}
          />
          <StatCard
            title="Geri Dönüşüm"
            value="34"
            unit="%"
            trend="down"
            trendLabel="+2% hedefin altı"
            target="%50"
            color="amber"
            icon={Recycle}
          />
          <StatCard
            title="Enerji Tüketimi"
            value="3.850"
            unit="kWh/yıl"
            trend="up"
            trendLabel="−5% geçen yıl"
            target="3.200 kWh"
            color="purple"
            icon={Zap}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Radar Chart */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Gösterge Performansı</h2>
              <p className="text-xs text-slate-500 mt-0.5">Mevcut durum vs 2030 hedefi</p>
            </div>
            <EcologicalRadarChart locale={locale} />
          </div>

          {/* Trend Chart */}
          <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Ekolojik Ayak İzi Trendi</h2>
                <p className="text-xs text-slate-500 mt-0.5">6 yıllık tarihsel veri (gHa/kişi)</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                ↓ İyileşiyor
              </span>
            </div>
            <FootprintTrendChart locale={locale} />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent Activity */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Son Aktiviteler</h2>
              <button className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                Tümünü Gör
              </button>
            </div>
            <ul className="space-y-3">
              {recentActivities.map((activity, i) => (
                <li key={i} className="flex items-start gap-3">
                  {activity.type === 'success' && (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  )}
                  {activity.type === 'pending' && (
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  )}
                  {activity.type === 'warning' && (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{activity.label}</p>
                    <p className="text-xs text-slate-400">{activity.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Hızlı İşlemler</h2>
            <div className="space-y-2">
              <Link
                href={`/${locale}/efct`}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
              >
                <span className="font-medium">Veri Gir</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={`/${locale}/ai-dss`}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                <span className="font-medium">Strateji Üret</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={`/${locale}/ai-rt`}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm text-slate-700 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700"
              >
                <span className="font-medium">Rapor Oluştur</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Summary Stats */}
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Aktif Belediyeler</span>
                <span className="font-semibold text-slate-900">1</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Aktif Stratejiler</span>
                <span className="font-semibold text-slate-900">24</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Veri Kalitesi</span>
                <span className="font-semibold text-emerald-600">%78 Doğrulanmış</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Son Güncelleme</span>
                <span className="font-semibold text-slate-900">Bugün, 14:32</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
