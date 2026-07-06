import { Header } from '@/components/layout/Header';
import { IndicatorAdmin } from '@/components/admin/IndicatorAdmin';

export default function AdminIndicatorsPage() {
  return (
    <main id="main-content" className="flex-1">
      <Header
        title="Indicators & Thresholds"
        subtitle="Edit 0–5 scoring thresholds for any of the 152 sub-indicators"
      />
      <IndicatorAdmin />
    </main>
  );
}
