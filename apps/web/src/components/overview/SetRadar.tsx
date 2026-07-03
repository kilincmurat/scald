'use client';

import ReactECharts from 'echarts-for-react';
import type { SetScore } from '@/lib/scores';
import { SET_THEME } from '@/lib/scores';
import type { SetCode } from '@/lib/scald-indicators';

export function SetRadar({ setScores }: { setScores: Record<SetCode, SetScore> }) {
  const order: SetCode[] = ['ES', 'SS', 'MS', 'ECS'];

  const option = {
    tooltip: { trigger: 'item' },
    radar: {
      indicator: order.map((sc) => ({ name: SET_THEME[sc].fullName, max: 100 })),
      radius: '65%',
      splitNumber: 4,
      axisName: { color: '#475569', fontSize: 10 },
      splitLine: { lineStyle: { color: ['#e2e8f0'] } },
      splitArea: { areaStyle: { color: ['#f8fafc', '#f1f5f9'] } },
      axisLine: { lineStyle: { color: '#cbd5e1' } },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: order.map((sc) => setScores[sc].score),
            name: 'Current',
            areaStyle: { color: 'rgba(16, 185, 129, 0.15)' },
            lineStyle: { color: '#10b981', width: 2 },
            itemStyle: { color: '#10b981' },
            symbolSize: 4,
          },
        ],
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '260px', width: '100%' }} opts={{ renderer: 'canvas' }} />;
}
