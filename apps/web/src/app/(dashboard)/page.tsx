import { Header } from '@/components/layout/Header';
import { OverviewDashboard } from '@/components/overview/OverviewDashboard';

export default function DashboardPage() {
  return (
    <main id="main-content" className="flex-1">
      <Header
        title="Overview"
        subtitle="Municipal sustainability performance across 25 categories"
      />
      <OverviewDashboard />
    </main>
  );
}
