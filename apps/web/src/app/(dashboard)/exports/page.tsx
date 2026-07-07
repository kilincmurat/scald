import { Header } from '@/components/layout/Header';
import { ExportsView } from '@/components/exports/ExportsView';

export const metadata = {
  title: 'Data exports',
};

export default function ExportsPage() {
  return (
    <main id="main-content" className="flex-1">
      <Header
        title="Data exports"
        subtitle="Download entered data for the selected reporting year — Excel workbook or formal report."
      />
      <ExportsView />
    </main>
  );
}
