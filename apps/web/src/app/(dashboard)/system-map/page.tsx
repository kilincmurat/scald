import { Header } from '@/components/layout/Header';
import { SystemMap } from '@/components/system-map/SystemMap';

export default function SystemMapPage() {
  return (
    <main id="main-content" className="flex-1">
      <Header
        title="System Map"
        subtitle="A visual guide to how SCALD works — for presenting and onboarding"
      />
      <SystemMap />
    </main>
  );
}
