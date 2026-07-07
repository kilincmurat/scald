import { Suspense } from 'react';
import { OfficialReport } from '@/components/exports/OfficialReport';

export const metadata = {
  title: 'Official Report — SCALD',
};

export default function OfficialReportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Preparing report…</div>}>
      <OfficialReport />
    </Suspense>
  );
}
