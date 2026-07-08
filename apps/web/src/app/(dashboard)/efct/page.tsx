import { Header } from '@/components/layout/Header';
import { EfctView } from '@/components/efct/EfctView';

export default function EfctPage() {
  return (
    <main id="main-content" className="flex-1">
      <Header
        title="Ecological Footprint"
        subtitle="Overall sustainability breakdown — 4 sets, 24 categories, 152 indicators"
      />
      <EfctView />
    </main>
  );
}
