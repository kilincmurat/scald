'use client';

import ReactECharts from 'echarts-for-react';

interface Props {
  locale: string;
}

export function ClimateAdaptationChart({ locale }: Props) {
  const years = ['2024', '2025', '2026', '2027', '2028', '2029', '2030'];

  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: {
      bottom: 0,
      textStyle: { color: '#64748b', fontSize: 11 },
    },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: years,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      min: 40,
      max: 100,
      name: locale === 'tr' ? 'Skor' : 'Score',
      nameTextStyle: { color: '#64748b', fontSize: 10 },
      axisLabel: { color: '#64748b', fontSize: 10 },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [
      {
        name: locale === 'tr' ? 'Mevcut Politika' : 'Current Policy',
        type: 'line',
        data: [64, 66, 67, 68, 69, 70, 71],
        smooth: true,
        lineStyle: { color: '#94a3b8', width: 2, type: 'dashed' },
        itemStyle: { color: '#94a3b8' },
      },
      {
        name: locale === 'tr' ? 'Önerilen Stratejiler' : 'Recommended Strategies',
        type: 'line',
        data: [64, 69, 74, 78, 82, 86, 90],
        smooth: true,
        lineStyle: { color: '#10b981', width: 2.5 },
        itemStyle: { color: '#10b981' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.2)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0)' },
            ],
          },
        },
      },
      {
        name: locale === 'tr' ? 'AB Hedefi' : 'EU Target',
        type: 'line',
        data: [72, 74, 76, 78, 80, 82, 85],
        smooth: true,
        lineStyle: { color: '#3b82f6', width: 1.5, type: 'dotted' },
        itemStyle: { color: '#3b82f6' },
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: '260px', width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
