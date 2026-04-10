'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import {
  Layers,
  Filter,
  BarChart3,
  Zap,
  Droplets,
  Trash2,
  Bus,
  Trees,
  Globe2,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Municipality } from '@/components/map/MapView';

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-slate-100">
      <div className="text-center">
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="text-sm text-slate-500">...</p>
      </div>
    </div>
  ),
});

// Demo municipalities for 4 partner countries
const MUNICIPALITIES: Municipality[] = [
  // Türkiye
  { id: 'trabzon', name: 'Trabzon', country: 'Türkiye', countryCode: 'TR', lat: 41.0027, lng: 39.7168, population: 284000, score: 62, energyScore: 58, waterScore: 71, wasteScore: 55, transportScore: 60, greenScore: 68 },
  { id: 'rize', name: 'Rize', country: 'Türkiye', countryCode: 'TR', lat: 41.0201, lng: 40.5234, population: 105000, score: 68, energyScore: 65, waterScore: 78, wasteScore: 60, transportScore: 62, greenScore: 72 },
  { id: 'artvin', name: 'Artvin', country: 'Türkiye', countryCode: 'TR', lat: 41.1828, lng: 41.8183, population: 28000, score: 74, energyScore: 70, waterScore: 82, wasteScore: 68, transportScore: 65, greenScore: 80 },
  // Yunanistan
  { id: 'thessaloniki', name: 'Thessaloniki', country: 'Ελλάδα', countryCode: 'GR', lat: 40.6401, lng: 22.9444, population: 325000, score: 57, energyScore: 52, waterScore: 65, wasteScore: 48, transportScore: 63, greenScore: 55 },
  { id: 'larissa', name: 'Larissa', country: 'Ελλάδα', countryCode: 'GR', lat: 39.6390, lng: 22.4191, population: 145000, score: 53, energyScore: 50, waterScore: 60, wasteScore: 45, transportScore: 55, greenScore: 52 },
  { id: 'volos', name: 'Volos', country: 'Ελλάδα', countryCode: 'GR', lat: 39.3601, lng: 22.9405, population: 86000, score: 60, energyScore: 57, waterScore: 68, wasteScore: 52, transportScore: 60, greenScore: 62 },
  // Romanya
  { id: 'cluj', name: 'Cluj-Napoca', country: 'România', countryCode: 'RO', lat: 46.7712, lng: 23.6236, population: 322000, score: 65, energyScore: 63, waterScore: 70, wasteScore: 58, transportScore: 68, greenScore: 66 },
  { id: 'timisoara', name: 'Timișoara', country: 'România', countryCode: 'RO', lat: 45.7489, lng: 21.2087, population: 250000, score: 61, energyScore: 59, waterScore: 66, wasteScore: 55, transportScore: 65, greenScore: 60 },
  { id: 'iasi', name: 'Iași', country: 'România', countryCode: 'RO', lat: 47.1585, lng: 27.6014, population: 290000, score: 55, energyScore: 52, waterScore: 62, wasteScore: 48, transportScore: 58, greenScore: 54 },
  // Kuzey Makedonya
  { id: 'skopje', name: 'Skopje', country: 'Северна Македонија', countryCode: 'MK', lat: 41.9973, lng: 21.4280, population: 545000, score: 44, energyScore: 40, waterScore: 52, wasteScore: 38, transportScore: 47, greenScore: 42 },
  { id: 'bitola', name: 'Bitola', country: 'Северна Македонија', countryCode: 'MK', lat: 41.0297, lng: 21.3325, population: 74000, score: 48, energyScore: 44, waterScore: 55, wasteScore: 42, transportScore: 50, greenScore: 46 },
  { id: 'ohrid', name: 'Ohrid', country: 'Северна Македонија', countryCode: 'MK', lat: 41.1172, lng: 20.8019, population: 42000, score: 56, energyScore: 52, waterScore: 64, wasteScore: 50, transportScore: 52, greenScore: 60 },
];

const COUNTRIES = [
  { code: 'TR', name: 'Türkiye', flag: '🇹🇷' },
  { code: 'GR', name: 'Ελλάδα', flag: '🇬🇷' },
  { code: 'RO', name: 'România', flag: '🇷🇴' },
  { code: 'MK', name: 'С. Македонија', flag: '🇲🇰' },
];

function StatCard({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold" style={{ color }}>{value}<span className="ml-1 text-xs font-normal text-slate-400">{unit}</span></p>
    </div>
  );
}

export default function MapPage() {
  const t = useTranslations('map');
  const [activeLayer, setActiveLayer] = useState('total');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [showPanel, setShowPanel] = useState(true);

  const LAYERS = [
    { id: 'total', label: t('totalScore'), icon: BarChart3 },
    { id: 'energy', label: t('energy'), icon: Zap },
    { id: 'water', label: t('water'), icon: Droplets },
    { id: 'waste', label: t('waste'), icon: Trash2 },
    { id: 'transport', label: t('transport'), icon: Bus },
    { id: 'green', label: t('greenSpace'), icon: Trees },
  ];

  const toggleCountry = (code: string) => {
    setSelectedCountries(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const filtered = useMemo(() =>
    selectedCountries.length === 0
      ? MUNICIPALITIES
      : MUNICIPALITIES.filter(m => selectedCountries.includes(m.countryCode)),
    [selectedCountries]
  );

  const avgScore = useMemo(() =>
    Math.round(filtered.reduce((s, m) => s + m.score, 0) / (filtered.length || 1)),
    [filtered]
  );

  const bestCity = useMemo(() =>
    filtered.reduce((best, m) => m.score > (best?.score ?? 0) ? m : best, filtered[0]),
    [filtered]
  );

  const worstCity = useMemo(() =>
    filtered.reduce((worst, m) => m.score < (worst?.score ?? 101) ? m : worst, filtered[0]),
    [filtered]
  );

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{t('title')}</h1>
          <p className="text-sm text-slate-500">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{filtered.length} {t('showingCount')}</span>
          <button
            onClick={() => setShowPanel(p => !p)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            <Filter className="h-4 w-4" />
            {showPanel ? t('hidePanel') : t('showPanel')}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sol analiz paneli */}
        {showPanel && (
          <div className="flex w-72 flex-col gap-4 overflow-y-auto border-r border-slate-200 bg-white p-4">

            {/* Katman seçimi */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Layers className="h-4 w-4 text-slate-400" />
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('indicatorLayer')}</p>
              </div>
              <div className="flex flex-col gap-1">
                {LAYERS.map(layer => {
                  const Icon = layer.icon;
                  return (
                    <button
                      key={layer.id}
                      onClick={() => setActiveLayer(layer.id)}
                      className={clsx(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                        activeLayer === layer.id
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {layer.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ülke filtresi */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-slate-400" />
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('countryFilter')}</p>
              </div>
              <div className="flex flex-col gap-1">
                {COUNTRIES.map(c => (
                  <button
                    key={c.code}
                    onClick={() => toggleCountry(c.code)}
                    className={clsx(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition',
                      selectedCountries.includes(c.code)
                        ? 'bg-blue-50 font-semibold text-blue-700 ring-1 ring-blue-200'
                        : 'text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <span className="text-base">{c.flag}</span>
                    <span>{c.name}</span>
                    <span className="ml-auto text-xs text-slate-400">
                      {MUNICIPALITIES.filter(m => m.countryCode === c.code).length}
                    </span>
                  </button>
                ))}
                {selectedCountries.length > 0 && (
                  <button
                    onClick={() => setSelectedCountries([])}
                    className="mt-1 text-xs text-slate-400 underline hover:text-slate-600"
                  >
                    {t('clearFilter')}
                  </button>
                )}
              </div>
            </div>

            {/* Özet istatistikler */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{t('summaryAnalysis')}</p>
              <div className="grid grid-cols-2 gap-2">
                <StatCard label={t('avgScore')} value={avgScore} unit={t('outOf100')}
                  color={avgScore >= 65 ? '#16a34a' : avgScore >= 50 ? '#d97706' : '#dc2626'} />
                <StatCard label={t('showingCount')} value={filtered.length} unit={t('countUnit')} color="#1056a0" />
              </div>

              {bestCity && (
                <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-[10px] font-semibold text-emerald-600">{t('bestPerformance')}</p>
                  <p className="mt-0.5 font-semibold text-slate-900">{bestCity.name}</p>
                  <p className="text-xs text-slate-500">{bestCity.country} · {bestCity.score} {t('points')}</p>
                </div>
              )}

              {worstCity && worstCity.id !== bestCity?.id && (
                <div className="mt-2 rounded-lg border border-red-100 bg-red-50 p-3">
                  <p className="text-[10px] font-semibold text-red-500">{t('worstPerformance')}</p>
                  <p className="mt-0.5 font-semibold text-slate-900">{worstCity.name}</p>
                  <p className="text-xs text-slate-500">{worstCity.country} · {worstCity.score} {t('points')}</p>
                </div>
              )}
            </div>

            {/* Ülke karşılaştırması */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{t('countryAverages')}</p>
              <div className="flex flex-col gap-2">
                {COUNTRIES.map(c => {
                  const cities = MUNICIPALITIES.filter(m => m.countryCode === c.code);
                  const avg = Math.round(cities.reduce((s, m) => s + m.score, 0) / cities.length);
                  const color = avg >= 65 ? '#16a34a' : avg >= 50 ? '#d97706' : '#dc2626';
                  return (
                    <div key={c.code} className="flex items-center gap-2.5">
                      <span className="text-base">{c.flag}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-600">{c.name}</span>
                          <span className="font-semibold" style={{ color }}>{avg}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${avg}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Harita alanı */}
        <div className="relative flex-1">
          <MapView
            municipalities={MUNICIPALITIES}
            activeLayer={activeLayer}
            selectedCountries={selectedCountries}
          />
        </div>
      </div>
    </div>
  );
}
