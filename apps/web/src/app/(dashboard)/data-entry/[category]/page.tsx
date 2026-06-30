'use client';

import { use } from 'react';
import { Header } from '@/components/layout/Header';
import { CategoryWizard } from '@/components/data-entry/CategoryWizard';
import { INDICATORS } from '@/lib/scald-indicators';
import { notFound } from 'next/navigation';

export default function CategoryEntryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = use(params);
  const cat = INDICATORS.categories[category];
  if (!cat) notFound();

  return (
    <main id="main-content" className="flex-1">
      <Header
        title={cat.name}
        subtitle={`${cat.indicators.length} indicators · ${cat.code}`}
      />
      <CategoryWizard categoryCode={category} />
    </main>
  );
}
