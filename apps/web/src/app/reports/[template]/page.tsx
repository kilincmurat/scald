import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ReportPage, type ReportTemplateId } from '@/components/ai-rt/reports/ReportPage';

const VALID: ReportTemplateId[] = ['quarterly', 'annual', 'strategic', 'footprint'];

export const metadata = {
  title: 'Report — SCALD',
};

export default async function ReportRoute({
  params,
}: {
  params: Promise<{ template: string }>;
}) {
  const { template } = await params;
  if (!VALID.includes(template as ReportTemplateId)) notFound();
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Preparing report…</div>}>
      <ReportPage template={template as ReportTemplateId} />
    </Suspense>
  );
}
