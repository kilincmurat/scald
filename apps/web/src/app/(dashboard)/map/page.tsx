import { Header } from '@/components/layout/Header';
import { MapPageClient } from '@/components/map/MapPageClient';

export default function MapPage() {
  return (
    <main id="main-content" className="flex h-[calc(100vh-3.5rem)] flex-1 flex-col overflow-hidden lg:h-screen">
      <Header
        title="Geographic Map"
        subtitle="Partner municipalities across the KA220-ADU project"
      />
      <MapPageClient />
    </main>
  );
}
