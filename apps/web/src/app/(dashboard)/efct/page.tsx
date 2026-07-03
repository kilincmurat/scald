import { Header } from '@/components/layout/Header';
import { EfctView } from '@/components/efct/EfctView';

export default function EfctPage() {
  return (
    <main id="main-content" className="flex-1">
      <Header
        title="Ecological Footprint"
        subtitle="Environmental sustainability breakdown — 10 categories, 74 indicators"
      />
      <EfctView />
    </main>
  );
}
