import { Header } from '@/components/layout/Header';
import { WeightsAdmin } from '@/components/admin/WeightsAdmin';

export default function AdminWeightsPage() {
  return (
    <main id="main-content" className="flex-1">
      <Header
        title="Score Weights"
        subtitle="How much each category counts within its sustainability set"
      />
      <WeightsAdmin />
    </main>
  );
}
