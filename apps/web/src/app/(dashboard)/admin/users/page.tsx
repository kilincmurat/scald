import { Header } from '@/components/layout/Header';
import { UsersAdmin } from '@/components/admin/UsersAdmin';

export default function AdminUsersPage() {
  return (
    <main id="main-content" className="flex-1">
      <Header title="Users" subtitle="Roles, municipality assignments, activation" />
      <UsersAdmin />
    </main>
  );
}
