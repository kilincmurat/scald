import type { Metadata } from 'next';
import { ExploreClient } from '@/components/explore/ExploreClient';

export const metadata: Metadata = {
  title: 'Explore public city data',
  description:
    'Explore partner municipalities’ public sustainability scores across environmental, social, managerial and economic dimensions.',
};

export default function ExplorePage() {
  return <ExploreClient />;
}
