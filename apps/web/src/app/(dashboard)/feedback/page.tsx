import { Header } from '@/components/layout/Header';
import { FeedbackView } from '@/components/feedback/FeedbackView';

export default function FeedbackPage() {
  return (
    <main id="main-content" className="flex-1">
      <Header
        title="Feedback"
        subtitle="Community input to the municipality"
      />
      <FeedbackView />
    </main>
  );
}
