'use client';

import { Header } from '@/components/layout/Header';
import { DataEntryDashboard } from '@/components/data-entry/DataEntryDashboard';

export default function DataEntryPage() {
  return (
    <main id="main-content" className="flex-1">
      <Header
        title="Data Entry"
        subtitle="Open any category and fill in what you have — any order works"
      />
      <DataEntryDashboard />
    </main>
  );
}
