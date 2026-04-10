'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Map, { Marker, Popup, NavigationControl, ScaleControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface Municipality {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  population: number;
  score: number;
  energyScore: number;
  waterScore: number;
  wasteScore: number;
  transportScore: number;
  greenScore: number;
}

interface MapViewProps {
  municipalities: Municipality[];
  activeLayer: string;
  selectedCountries: string[];
}

const SCORE_COLOR = (score: number) => {
  if (score >= 75) return '#16a34a';
  if (score >= 55) return '#65a30d';
  if (score >= 40) return '#d97706';
  return '#dc2626';
};

const LAYER_FIELD: Record<string, keyof Municipality> = {
  total: 'score',
  energy: 'energyScore',
  water: 'waterScore',
  waste: 'wasteScore',
  transport: 'transportScore',
  green: 'greenScore',
};

// Country boundary GeoJSON (simplified bounding boxes for partner countries)
const countryBounds = {
  TR: { center: [35.2, 38.9], zoom: 5.2 },
  GR: { center: [21.8, 39.0], zoom: 5.8 },
  RO: { center: [24.9, 45.9], zoom: 6.0 },
  MK: { center: [21.7, 41.6], zoom: 7.5 },
};

export default function MapView({ municipalities, activeLayer, selectedCountries }: MapViewProps) {
  const t = useTranslations('map');
  const [popupInfo, setPopupInfo] = useState<Municipality | null>(null);
  const [viewState, setViewState] = useState({
    longitude: 26.5,
    latitude: 41.5,
    zoom: 4.5,
    pitch: 0,
    bearing: 0,
  });

  const filtered = municipalities.filter(m =>
    selectedCountries.length === 0 || selectedCountries.includes(m.countryCode)
  );

  const layerField = LAYER_FIELD[activeLayer] ?? 'score';

  const handleMarkerClick = useCallback((mun: Municipality) => {
    setPopupInfo(mun);
  }, []);

  const flyToCountry = (code: string) => {
    const b = countryBounds[code as keyof typeof countryBounds];
    if (!b) return;
    setViewState(v => ({ ...v, longitude: b.center[0], latitude: b.center[1], zoom: b.zoom }));
  };

  const getScoreLabel = (score: number) => {
    if (score >= 75) return t('goodShort');
    if (score >= 55) return t('moderateShort');
    if (score >= 40) return t('weakShort');
    return t('criticalShort');
  };

  const COUNTRIES_MAP = [
    { code: 'TR', name: 'Türkiye', flag: '🇹🇷' },
    { code: 'GR', name: 'Ελλάδα', flag: '🇬🇷' },
    { code: 'RO', name: 'România', flag: '🇷🇴' },
    { code: 'MK', name: 'С. Македонија', flag: '🇲🇰' },
  ];

  return (
    <div className="relative h-full w-full">
      <Map
        {...viewState}
        onMove={e => setViewState(e.viewState)}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" />
        <ScaleControl position="bottom-left" unit="metric" />

        {filtered.map(mun => {
          const val = mun[layerField] as number;
          const color = SCORE_COLOR(val);
          return (
            <Marker
              key={mun.id}
              longitude={mun.lng}
              latitude={mun.lat}
              anchor="center"
              onClick={e => { e.originalEvent.stopPropagation(); handleMarkerClick(mun); }}
            >
              <div
                className="flex cursor-pointer flex-col items-center"
                title={mun.name}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-lg transition-transform hover:scale-110"
                  style={{ backgroundColor: color }}
                >
                  {Math.round(val)}
                </div>
                <div className="mt-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow">
                  {mun.name}
                </div>
              </div>
            </Marker>
          );
        })}

        {popupInfo && (
          <Popup
            longitude={popupInfo.lng}
            latitude={popupInfo.lat}
            anchor="top"
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
            maxWidth="260px"
          >
            <div className="p-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{popupInfo.name}</p>
                  <p className="text-xs text-slate-500">{popupInfo.country} · {popupInfo.population.toLocaleString()} {t('people')}</p>
                </div>
                <span
                  className="rounded-full px-2 py-1 text-xs font-bold text-white"
                  style={{ backgroundColor: SCORE_COLOR(popupInfo.score) }}
                >
                  {getScoreLabel(popupInfo.score)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {[
                  { label: t('energy'), val: popupInfo.energyScore },
                  { label: t('water'), val: popupInfo.waterScore },
                  { label: t('waste'), val: popupInfo.wasteScore },
                  { label: t('transport'), val: popupInfo.transportScore },
                  { label: t('greenSpace'), val: popupInfo.greenScore },
                  { label: t('general'), val: popupInfo.score },
                ].map(item => (
                  <div key={item.label} className="rounded bg-slate-50 px-2 py-1.5">
                    <p className="text-[10px] text-slate-500">{item.label}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-200">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${item.val}%`, backgroundColor: SCORE_COLOR(item.val) }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-700">{item.val}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Quick country access */}
      <div className="absolute left-3 top-3 flex flex-col gap-1.5">
        {COUNTRIES_MAP.map(c => (
          <button
            key={c.code}
            onClick={() => flyToCountry(c.code)}
            className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-md transition hover:bg-slate-50 hover:shadow-lg"
          >
            <span className="text-base leading-none">{c.flag}</span>
            <span>{c.name}</span>
          </button>
        ))}
      </div>

      {/* Color scale */}
      <div className="absolute bottom-8 right-14 rounded-lg bg-white px-3 py-2 shadow-md">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('scoreLabel')}</p>
        <div className="flex flex-col gap-1">
          {[
            { color: '#16a34a', label: t('good') },
            { color: '#65a30d', label: t('moderate') },
            { color: '#d97706', label: t('weak') },
            { color: '#dc2626', label: t('critical') },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] text-slate-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
