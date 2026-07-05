import { Header } from '@/components/layout/Header';
import { PublicDashboard } from '@/components/public/PublicDashboard';

export default function PublicPage() {
  return (
    <main id="main-content" className="flex-1">
      <Header
        title="My City at a Glance"
        subtitle="Sustainability snapshot for your municipality"
      />
      <PublicDashboard />
    </main>
  );
}
