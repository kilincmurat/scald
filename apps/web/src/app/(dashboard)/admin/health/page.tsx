import { Header } from '@/components/layout/Header';
import { SystemHealth } from '@/components/admin/SystemHealth';

export const metadata = { title: 'System Health' };

export default function AdminHealthPage() {
  return (
    <main id="main-content" className="flex-1">
      <Header
        title="System Health"
        subtitle="Live probes and data-volume snapshot — no external monitoring service."
      />
      <SystemHealth />
    </main>
  );
}
