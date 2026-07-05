import { Header } from '@/components/layout/Header';
import { AdminPanel } from '@/components/admin/AdminPanel';

export default function AdminPage() {
  return (
    <main id="main-content" className="flex-1">
      <Header
        title="Admin Panel"
        subtitle="System-wide management — users, municipalities, indicators, audit"
      />
      <AdminPanel />
    </main>
  );
}
