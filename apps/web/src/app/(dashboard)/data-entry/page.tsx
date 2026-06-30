'use client';

import { Header } from '@/components/layout/Header';
import { DataEntryDashboard } from '@/components/data-entry/DataEntryDashboard';

export default function DataEntryPage() {
  return (
    <main id="main-content" className="flex-1">
      <Header
        title="Data Entry"
        subtitle="Complete each category to unlock the next — earn XP and badges along the way"
      />
      <DataEntryDashboard />
    </main>
  );
}
