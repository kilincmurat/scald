'use client';

import { Header } from '@/components/layout/Header';
import { CalculateFootprint } from '@/components/data-entry/CalculateFootprint';

export default function CalculatePage() {
  return (
    <main id="main-content" className="flex-1">
      <Header
        title="Ecological Footprint Calculation"
        subtitle="Aggregating your scored indicators into a municipal sustainability profile"
      />
      <CalculateFootprint />
    </main>
  );
}
