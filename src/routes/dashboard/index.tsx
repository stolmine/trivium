import { ContinueReadingCard } from '../../components/dashboard/ContinueReadingCard';
import { DueReviewCard } from '../../components/dashboard/DueReviewCard';
import { StatsCard } from '../../components/dashboard/StatsCard';
import { QuickImportCard } from '../../components/dashboard/QuickImportCard';
import { CreateCardsCard } from '../../components/dashboard/CreateCardsCard';
import { RecentActivity } from '../../components/dashboard/RecentActivity';

export function DashboardPage() {
  return (
    <div className="container max-w-6xl mx-auto px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <ContinueReadingCard />
        <DueReviewCard />
        <CreateCardsCard />
        <StatsCard />
        <QuickImportCard />
        <RecentActivity />
      </div>
    </div>
  );
}
