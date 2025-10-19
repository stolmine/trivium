import { useState } from 'react';
import { Button } from '@/lib/components/ui/button';
import { DateRangeSelector } from '@/components/stats/DateRangeSelector';
import { OverviewTab } from '@/components/stats/OverviewTab';
import { ReviewTab } from '@/components/stats/ReviewTab';
import { ReadingTab } from '@/components/stats/ReadingTab';
import { useStatsStore } from '@/lib/stores/stats';

type StatsTab = 'overview' | 'review' | 'reading';

export function StatsPage() {
  const [activeTab, setActiveTab] = useState<StatsTab>('overview');
  const { dateRange, setDateRange } = useStatsStore();

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <div className="container max-w-6xl mx-auto px-8 h-14 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Statistics</h1>
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="container max-w-6xl mx-auto px-8 pb-8 pt-6">
          <div className="space-y-6">
            <div className="flex gap-2 border-b border-border">
              <Button
                variant={activeTab === 'overview' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('overview')}
                className="rounded-b-none"
              >
                Overview
              </Button>
              <Button
                variant={activeTab === 'review' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('review')}
                className="rounded-b-none"
              >
                Review Performance
              </Button>
              <Button
                variant={activeTab === 'reading' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('reading')}
                className="rounded-b-none"
              >
                Reading Progress
              </Button>
            </div>

            <div className="space-y-6">
              {activeTab === 'overview' && <OverviewTab />}
              {activeTab === 'review' && <ReviewTab />}
              {activeTab === 'reading' && <ReadingTab />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
