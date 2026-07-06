import { Header } from '@/components/layout/Header';
import { WeightsAdmin } from '@/components/admin/WeightsAdmin';

export default function AdminWeightsPage() {
  return (
    <main id="main-content" className="flex-1">
      <Header
        title="Score Weights"
        subtitle="Tune the relative influence of sets, categories, and indicators"
      />
      <WeightsAdmin />
    </main>
  );
}
