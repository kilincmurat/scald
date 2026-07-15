import { Header } from '@/components/layout/Header';
import { UniversitiesAdmin } from '@/components/admin/UniversitiesAdmin';

export const metadata = { title: 'Universities' };

export default function AdminUniversitiesPage() {
  return (
    <main id="main-content" className="flex-1">
      <Header
        title="Universities"
        subtitle="Institutions that researchers are affiliated with."
      />
      <UniversitiesAdmin />
    </main>
  );
}
