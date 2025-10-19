import { useState } from 'react';
import { Button } from '@/lib/components/ui/button';
import type { SettingsTab } from '@/lib/types/settings';
import { DefaultsSection, ThemeSection, DatabaseSection, ResetSection } from '@/lib/components/settings';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('defaults');

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <div className="container max-w-6xl mx-auto px-8 h-14 flex items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="container max-w-6xl mx-auto px-8 pb-8 pt-6">
          <div className="space-y-6">
            <div className="flex gap-2 border-b border-border">
              <Button
                variant={activeTab === 'defaults' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('defaults')}
                className="rounded-b-none"
              >
                Defaults
              </Button>
              <Button
                variant={activeTab === 'theme' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('theme')}
                className="rounded-b-none"
              >
                Theme
              </Button>
              <Button
                variant={activeTab === 'database' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('database')}
                className="rounded-b-none"
              >
                Database
              </Button>
              <Button
                variant={activeTab === 'reset' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('reset')}
                className="rounded-b-none"
              >
                Reset
              </Button>
            </div>

            <div className="space-y-6">
              {activeTab === 'defaults' && <DefaultsSection />}
              {activeTab === 'theme' && <ThemeSection />}
              {activeTab === 'database' && <DatabaseSection />}
              {activeTab === 'reset' && <ResetSection />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
