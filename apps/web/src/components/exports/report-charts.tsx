'use client';

import type { SetCode } from '@/lib/scald-indicators';

const SET_FILL: Record<SetCode, { stroke: string; fill: string; label: string }> = {
  ES: { stroke: '#059669', fill: '#059669', label: 'Environmental' },
  SS: { stroke: '#e11d48', fill: '#e11d48', label: 'Social' },
  MS: { stroke: '#2563eb', fill: '#2563eb', label: 'Managerial' },
  ECS: { stroke: '#ea580c', fill: '#ea580c', label: 'Economic' },
};

/** Semicircular gauge showing the overall score 0..100. */
export function ScoreGauge({
  score,
  size = 200,
  label,
}: {
  score: number;
  size?: number;
  label?: string;
}) {
  const s = Math.max(0, Math.min(100, score));
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 12;
  const strokeWidth = 14;

  // Arc from 180° to 360° (semicircle top-half). Angle in radians.
  const startAngle = Math.PI;
  const endAngle = startAngle + (Math.PI * s) / 100;

  const trackEnd = polar(cx, cy, r, 2 * Math.PI);
  const arcEnd = polar(cx, cy, r, endAngle);
  const trackStart = polar(cx, cy, r, startAngle);

  const largeArc = 0;
  const trackPath = `M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 0 1 ${trackEnd.x} ${trackEnd.y}`;
  const progressPath = `M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 ${largeArc} 1 ${arcEnd.x} ${arcEnd.y}`;

  const color = colorForScore(s);

  return (
    <svg
      role="img"
      aria-label={`Overall score ${s} out of 100`}
      viewBox={`0 0 ${size} ${size * 0.62}`}
      style={{ width: '100%', maxWidth: size }}
    >
      <path
        d={trackPath}
        stroke="#e2e8f0"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={progressPath}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fontSize={size * 0.24}
        fontWeight={800}
        fill="#0f172a"
      >
        {s}
      </text>
      <text
        x={cx}
        y={cy + size * 0.06}
        textAnchor="middle"
        fontSize={size * 0.07}
        fill="#64748b"
      >
        / 100
      </text>
      {label && (
        <text
          x={cx}
          y={cy + size * 0.16}
          textAnchor="middle"
          fontSize={size * 0.06}
          fontWeight={600}
          fill={color}
        >
          {label}
        </text>
      )}
    </svg>
  );
}

/** Radar chart of the four sustainability sets (0..100). */
export function SetRadar({
  scores,
  size = 320,
}: {
  scores: Record<SetCode, number>;
  size?: number;
}) {
  const axes: SetCode[] = ['ES', 'SS', 'MS', 'ECS'];
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 44;

  const angleFor = (i: number) => (Math.PI * 2 * i) / axes.length - Math.PI / 2;

  const gridLevels = [25, 50, 75, 100];
  const gridPolygons = gridLevels.map((level) => {
    const rr = (r * level) / 100;
    return axes
      .map((_, i) => {
        const p = polar(cx, cy, rr, angleFor(i));
        return `${p.x},${p.y}`;
      })
      .join(' ');
  });

  const valuePoints = axes
    .map((sc, i) => {
      const v = Math.max(0, Math.min(100, scores[sc] ?? 0));
      const rr = (r * v) / 100;
      const p = polar(cx, cy, rr, angleFor(i));
      return `${p.x},${p.y}`;
    })
    .join(' ');

  return (
    <svg
      role="img"
      aria-label="Sustainability set radar"
      viewBox={`0 0 ${size} ${size}`}
      style={{ width: '100%', maxWidth: size }}
    >
      {gridPolygons.map((pts, idx) => (
        <polygon
          key={idx}
          points={pts}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={1}
        />
      ))}
      {/* Axis lines */}
      {axes.map((sc, i) => {
        const p = polar(cx, cy, r, angleFor(i));
        return (
          <line
            key={sc}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        );
      })}
      {/* Value polygon */}
      <polygon
        points={valuePoints}
        fill="#059669"
        fillOpacity={0.18}
        stroke="#059669"
        strokeWidth={2}
      />
      {/* Value dots + labels */}
      {axes.map((sc, i) => {
        const v = Math.max(0, Math.min(100, scores[sc] ?? 0));
        const rr = (r * v) / 100;
        const p = polar(cx, cy, rr, angleFor(i));
        const labelP = polar(cx, cy, r + 22, angleFor(i));
        return (
          <g key={sc}>
            <circle cx={p.x} cy={p.y} r={4} fill={SET_FILL[sc].fill} />
            <text
              x={labelP.x}
              y={labelP.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11}
              fontWeight={700}
              fill="#334155"
            >
              {sc}
            </text>
            <text
              x={labelP.x}
              y={labelP.y + 12}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fill="#64748b"
            >
              {v}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Horizontal bar chart of 24 categories, colored by set. */
export function CategoryBars({
  categories,
}: {
  categories: { code: string; name: string; setCode: SetCode; score: number }[];
}) {
  const rowH = 20;
  const gap = 4;
  const labelW = 240;
  const barMaxW = 320;
  const paddingX = 8;
  const width = labelW + barMaxW + paddingX * 2 + 40;
  const height = categories.length * (rowH + gap) + 16;

  return (
    <svg
      role="img"
      aria-label="Category score chart"
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%' }}
    >
      {/* Grid lines at 25/50/75/100 */}
      {[25, 50, 75, 100].map((level) => {
        const x = labelW + paddingX + (barMaxW * level) / 100;
        return (
          <g key={level}>
            <line
              x1={x}
              y1={4}
              x2={x}
              y2={height - 12}
              stroke="#f1f5f9"
              strokeWidth={1}
            />
            <text x={x} y={height - 2} textAnchor="middle" fontSize={8} fill="#94a3b8">
              {level}
            </text>
          </g>
        );
      })}
      {categories.map((c, i) => {
        const y = 8 + i * (rowH + gap);
        const w = (barMaxW * Math.max(0, Math.min(100, c.score))) / 100;
        const color = SET_FILL[c.setCode].fill;
        return (
          <g key={c.code}>
            <text
              x={labelW}
              y={y + rowH / 2 + 3}
              textAnchor="end"
              fontSize={9}
              fill="#334155"
            >
              <tspan fontWeight={700}>{c.code}</tspan>{' '}
              <tspan fill="#64748b">{truncate(c.name, 26)}</tspan>
            </text>
            <rect
              x={labelW + paddingX}
              y={y}
              width={barMaxW}
              height={rowH}
              rx={3}
              fill="#f8fafc"
            />
            <rect
              x={labelW + paddingX}
              y={y}
              width={w}
              height={rowH}
              rx={3}
              fill={color}
              fillOpacity={0.85}
            />
            <text
              x={labelW + paddingX + w + 4}
              y={y + rowH / 2 + 3}
              fontSize={9}
              fontWeight={700}
              fill="#334155"
            >
              {c.score}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function ChartLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-600">
      {(['ES', 'SS', 'MS', 'ECS'] as SetCode[]).map((sc) => (
        <span key={sc} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: SET_FILL[sc].fill }}
          />
          <span className="font-semibold text-slate-800">{sc}</span>
          <span>{SET_FILL[sc].label}</span>
        </span>
      ))}
    </div>
  );
}

// --- Helpers ---
function polar(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function colorForScore(s: number): string {
  if (s >= 75) return '#059669';
  if (s >= 55) return '#65a30d';
  if (s >= 40) return '#d97706';
  return '#dc2626';
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
