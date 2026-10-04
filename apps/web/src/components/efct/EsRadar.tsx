'use client';

import ReactECharts from 'echarts-for-react';
import type { CategoryScore } from '@/lib/scores';

export function EsRadar({ cats }: { cats: CategoryScore[] }) {
  const option = {
    tooltip: { trigger: 'item' },
    radar: {
      indicator: cats.map((c) => ({
        name: c.name.length > 15 ? c.name.slice(0, 13) + '…' : c.name,
        max: 100,
      })),
      radius: '60%',
      splitNumber: 4,
      axisName: { color: '#475569', fontSize: 9 },
      splitLine: { lineStyle: { color: ['#e2e8f0'] } },
      splitArea: { areaStyle: { color: ['#f8fafc', '#f1f5f9'] } },
      axisLine: { lineStyle: { color: '#cbd5e1' } },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: cats.map((c) => c.score),
            name: 'Score',
            areaStyle: { color: 'rgba(16, 185, 129, 0.15)' },
            lineStyle: { color: '#10b981', width: 2 },
            itemStyle: { color: '#10b981' },
            symbolSize: 3,
          },
        ],
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: '280px', width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
