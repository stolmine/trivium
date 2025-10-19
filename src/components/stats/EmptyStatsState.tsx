import { BarChart3 } from 'lucide-react';

interface EmptyStatsStateProps {
  title?: string;
  message?: string;
}

export function EmptyStatsState({
  title = 'No Statistics Available',
  message = 'Start reviewing cards or reading texts to see your statistics.',
}: EmptyStatsStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="rounded-full bg-muted p-6 mb-4">
        <BarChart3 className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{message}</p>
    </div>
  );
}
