import { Header } from '@/components/layout/Header';
import { ReportingView } from '@/components/ai-rt/ReportingView';

export default function AiRtPage() {
  return (
    <main id="main-content" className="flex-1">
      <Header
        title="Reporting"
        subtitle="Generate strategic sustainability reports from your data"
      />
      <ReportingView />
    </main>
  );
}
