import { ContinueReadingCard } from '../../components/dashboard/ContinueReadingCard';
import { DueReviewCard } from '../../components/dashboard/DueReviewCard';
import { StatsCard } from '../../components/dashboard/StatsCard';
import { QuickImportCard } from '../../components/dashboard/QuickImportCard';
import { CreateCardsCard } from '../../components/dashboard/CreateCardsCard';
import { RecentActivity } from '../../components/dashboard/RecentActivity';

export function DashboardPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <div className="container max-w-6xl mx-auto px-8 h-14 flex items-center gap-3">
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-6xl mx-auto px-8 pb-8 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ContinueReadingCard />
            <DueReviewCard />
            <CreateCardsCard />
            <StatsCard />
            <QuickImportCard />
            <RecentActivity />
          </div>
        </div>
      </div>
    </div>
  );
}
