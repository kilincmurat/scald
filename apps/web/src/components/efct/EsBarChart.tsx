'use client';

import ReactECharts from 'echarts-for-react';
import type { CategoryScore } from '@/lib/scores';

export function EsBarChart({ cats }: { cats: CategoryScore[] }) {
  const sorted = [...cats].sort((a, b) => a.score - b.score);
  const labels = sorted.map((c) => c.name);
  const data = sorted.map((c) => c.score);

  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { color: '#64748b', fontSize: 10 },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    yAxis: {
      type: 'category',
      data: labels,
      axisLabel: { color: '#475569', fontSize: 10 },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    series: [
      {
        type: 'bar',
        data,
        barMaxWidth: 16,
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: (params: { dataIndex: number }) => {
            const val = data[params.dataIndex];
            if (val >= 75) return '#10b981';
            if (val >= 55) return '#65a30d';
            if (val >= 40) return '#f59e0b';
            return '#ef4444';
          },
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{c}',
          fontSize: 9,
          color: '#64748b',
        },
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
