'use client';

import { Header } from '@/components/layout/Header';
import { DataEntryGuide } from '@/components/data-entry/guide/DataEntryGuide';

export default function DataEntryGuidePage() {
  return (
    <main id="main-content" className="flex-1">
      <Header
        title="Data Entry Guide"
        subtitle="Step by step: how to fill in and submit your municipality’s indicators"
      />
      <DataEntryGuide />
    </main>
  );
}
