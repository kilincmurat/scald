'use client';

import { useState, useCallback, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl, ScaleControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { SetCode } from '@/lib/scald-indicators';
import { SET_THEME } from '@/lib/scores';
import { clsx } from 'clsx';

export interface PartnerMunicipality {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  population: number;
  partner: string;
  scores: Record<SetCode, number>;
  total: number;
  isMine: boolean;
}

interface MapViewProps {
  municipalities: PartnerMunicipality[];
  activeLayer: 'total' | SetCode;
  /** Called when a marker is clicked — lets a parent drive selection. */
  onSelect?: (id: string) => void;
  /** When it changes, the map gently centres on that municipality. */
  selectedId?: string;
}

const SCORE_COLOR = (score: number) => {
  if (score >= 75) return '#16a34a';
  if (score >= 55) return '#65a30d';
  if (score >= 40) return '#d97706';
  if (score > 0) return '#dc2626';
  return '#94a3b8';
};

export function MapView({ municipalities, activeLayer, onSelect, selectedId }: MapViewProps) {
  const [popupInfo, setPopupInfo] = useState<PartnerMunicipality | null>(null);
  const [viewState, setViewState] = useState({
    longitude: 28.5,
    latitude: 42.5,
    zoom: 4.2,
    pitch: 0,
    bearing: 0,
  });

  const handleMarkerClick = useCallback(
    (mun: PartnerMunicipality) => {
      setPopupInfo(mun);
      onSelect?.(mun.id);
    },
    [onSelect],
  );

  // Gently centre on the externally-selected municipality.
  useEffect(() => {
    if (!selectedId) return;
    const m = municipalities.find((x) => x.id === selectedId);
    if (!m) return;
    setViewState((v) => ({ ...v, longitude: m.lng, latitude: m.lat, zoom: Math.max(v.zoom, 8) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const getValue = (m: PartnerMunicipality) =>
    activeLayer === 'total' ? m.total : m.scores[activeLayer];

  const getScoreLabel = (score: number) => {
    if (score >= 75) return 'Excellent';
    if (score >= 55) return 'Good';
    if (score >= 40) return 'Moderate';
    if (score > 0) return 'Critical';
    return 'No data';
  };

  return (
    <div className="relative h-full w-full">
      <Map
        {...viewState}
        onMove={(e) => setViewState(e.viewState)}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" />
        <ScaleControl position="bottom-left" unit="metric" />

        {municipalities.map((mun) => {
          const val = getValue(mun);
          const color = SCORE_COLOR(val);
          return (
            <Marker
              key={mun.id}
              longitude={mun.lng}
              latitude={mun.lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handleMarkerClick(mun);
              }}
            >
              <div className="flex cursor-pointer flex-col items-center" title={mun.name}>
                <div
                  className={clsx(
                    'flex h-11 w-11 items-center justify-center rounded-full border-2 text-xs font-bold text-white shadow-lg transition-transform hover:scale-110',
                    mun.isMine ? 'border-emerald-300 ring-4 ring-emerald-300/40' : 'border-white',
                  )}
                  style={{ backgroundColor: color }}
                >
                  {val || '—'}
                </div>
                <div className="mt-1 rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow">
                  {mun.name}
                  {mun.isMine && <span className="ml-1 text-emerald-600">●</span>}
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
            maxWidth="280px"
          >
            <div className="p-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">
                    {popupInfo.name}
                    {popupInfo.isMine && (
                      <span className="ml-1.5 rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-bold text-emerald-700">
                        YOU
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {popupInfo.country} · {popupInfo.population.toLocaleString()} people
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{popupInfo.partner}</p>
                </div>
                <span
                  className="rounded-full px-2 py-1 text-xs font-bold text-white"
                  style={{ backgroundColor: SCORE_COLOR(popupInfo.total) }}
                >
                  {getScoreLabel(popupInfo.total)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {(['ES', 'SS', 'MS', 'ECS'] as SetCode[]).map((sc) => {
                  const val = popupInfo.scores[sc];
                  return (
                    <div key={sc} className="rounded bg-slate-50 px-2 py-1.5">
                      <div className="flex items-center justify-between">
                        <p className={clsx('rounded px-1 py-0.5 text-[9px] font-bold', SET_THEME[sc].chip)}>
                          {sc}
                        </p>
                        <span className="text-xs font-bold text-slate-700">{val || '—'}</span>
                      </div>
                      <div className="mt-1 h-1 flex-1 rounded-full bg-slate-200">
                        <div
                          className="h-1 rounded-full"
                          style={{ width: `${val}%`, backgroundColor: SCORE_COLOR(val) }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 rounded bg-slate-50 px-2 py-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-500">Overall</p>
                  <span className="text-sm font-bold text-slate-900">
                    {popupInfo.total || '—'}/100
                  </span>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Color scale */}
      <div className="absolute bottom-8 left-3 rounded-lg bg-white/95 px-3 py-2 shadow-md backdrop-blur-sm lg:right-14 lg:left-auto">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Score</p>
        <div className="flex flex-col gap-1">
          {[
            { color: '#16a34a', label: '75+ Excellent' },
            { color: '#65a30d', label: '55–74 Good' },
            { color: '#d97706', label: '40–54 Moderate' },
            { color: '#dc2626', label: '<40 Critical' },
          ].map((item) => (
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
