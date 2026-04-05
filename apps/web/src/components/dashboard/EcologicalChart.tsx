'use client';

import ReactECharts from 'echarts-for-react';

interface EcologicalChartProps {
  locale: string;
}

const INDICATORS_TR = ['Enerji', 'Su', 'Atık', 'Ulaşım', 'Yeşil Alan', 'Biyoçeşitlilik', 'Hava'];
const INDICATORS_EN = ['Energy', 'Water', 'Waste', 'Transport', 'Green Space', 'Biodiversity', 'Air'];

export function EcologicalRadarChart({ locale }: EcologicalChartProps) {
  const labels = locale === 'tr' ? INDICATORS_TR : INDICATORS_EN;

  const option = {
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 0,
      textStyle: { color: '#64748b', fontSize: 11 },
    },
    radar: {
      indicator: labels.map((name) => ({ name, max: 100 })),
      radius: '65%',
      splitNumber: 4,
      axisName: { color: '#475569', fontSize: 11 },
      splitLine: { lineStyle: { color: ['#e2e8f0'] } },
      splitArea: { areaStyle: { color: ['#f8fafc', '#f1f5f9'] } },
      axisLine: { lineStyle: { color: '#cbd5e1' } },
    },
    series: [
      {
        name: locale === 'tr' ? 'Mevcut Durum' : 'Current State',
        type: 'radar',
        data: [
          {
            value: [62, 71, 45, 38, 58, 42, 66],
            name: locale === 'tr' ? 'Mevcut Durum' : 'Current State',
            areaStyle: { color: 'rgba(16, 185, 129, 0.15)' },
            lineStyle: { color: '#10b981', width: 2 },
            itemStyle: { color: '#10b981' },
          },
          {
            value: [80, 80, 70, 70, 80, 70, 80],
            name: locale === 'tr' ? 'Hedef (2030)' : 'Target (2030)',
            areaStyle: { color: 'rgba(59, 130, 246, 0.08)' },
            lineStyle: { color: '#3b82f6', width: 1.5, type: 'dashed' },
            itemStyle: { color: '#3b82f6' },
          },
        ],
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: '300px', width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}

export function FootprintTrendChart({ locale }: EcologicalChartProps) {
  const years = ['2019', '2020', '2021', '2022', '2023', '2024'];

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
    },
    legend: {
      bottom: 0,
      textStyle: { color: '#64748b', fontSize: 11 },
    },
    grid: { left: '3%', right: '4%', bottom: '12%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: years,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: 'gHa/kişi',
      nameTextStyle: { color: '#64748b', fontSize: 10 },
      axisLabel: { color: '#64748b', fontSize: 10 },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [
      {
        name: locale === 'tr' ? 'Ekolojik Ayak İzi' : 'Ecological Footprint',
        type: 'line',
        data: [4.8, 4.3, 4.6, 4.2, 3.9, 3.7],
        smooth: true,
        lineStyle: { color: '#10b981', width: 2.5 },
        itemStyle: { color: '#10b981' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.25)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0)' },
            ],
          },
        },
      },
      {
        name: locale === 'tr' ? 'Küresel Ortalama' : 'Global Average',
        type: 'line',
        data: [2.8, 2.8, 2.9, 2.9, 2.8, 2.9],
        smooth: true,
        lineStyle: { color: '#f59e0b', width: 1.5, type: 'dashed' },
        itemStyle: { color: '#f59e0b' },
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

export function IndicatorBarChart({ locale }: EcologicalChartProps) {
  const categories = locale === 'tr'
    ? ['Enerji', 'Su', 'Atık', 'Ulaşım', 'Yeşil Alan', 'Biyoçeşitlilik', 'Hava Kalitesi']
    : ['Energy', 'Water', 'Waste', 'Transport', 'Green Space', 'Biodiversity', 'Air Quality'];

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
      data: categories,
      axisLabel: { color: '#475569', fontSize: 11 },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    series: [
      {
        name: locale === 'tr' ? 'Performans Skoru' : 'Performance Score',
        type: 'bar',
        data: [62, 71, 45, 38, 58, 42, 66],
        barMaxWidth: 20,
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: (params: { dataIndex: number }) => {
            const val = [62, 71, 45, 38, 58, 42, 66][params.dataIndex];
            if (val >= 65) return '#10b981';
            if (val >= 50) return '#f59e0b';
            return '#ef4444';
          },
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{c}',
          fontSize: 10,
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
