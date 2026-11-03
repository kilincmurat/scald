import { Header } from '@/components/layout/Header';
import { DssView } from '@/components/ai-dss/DssView';

export default function AiDssPage() {
  return (
    <main id="main-content" className="flex-1">
      <Header
        title="Decision Support"
        subtitle="Prioritised strategies for your weakest categories"
      />
      <DssView />
    </main>
  );
}
