import { Header } from '@/components/layout/Header';
import { MunicipalitiesAdmin } from '@/components/admin/MunicipalitiesAdmin';

export default function AdminMunicipalitiesPage() {
  return (
    <main id="main-content" className="flex-1">
      <Header title="Municipalities" subtitle="Pilot cities in the KA220-ADU partnership" />
      <MunicipalitiesAdmin />
    </main>
  );
}
