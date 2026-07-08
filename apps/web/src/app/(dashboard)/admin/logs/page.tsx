import { Header } from '@/components/layout/Header';
import { LogsView } from '@/components/admin/LogsView';

export const metadata = { title: 'Log Management' };

export default function AdminLogsPage() {
  return (
    <main id="main-content" className="flex-1">
      <Header
        title="Log Management"
        subtitle="Chronological trace of every action across the platform."
      />
      <LogsView />
    </main>
  );
}
