import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
      style={style}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: i === lines - 1 ? '80%' : '100%' }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-6 shadow-card', className)}>
      <Skeleton className="h-6 w-3/4 mb-4" />
      <SkeletonText lines={3} />
      <Skeleton className="h-10 w-32 mt-4" />
    </div>
  );
}

export function SkeletonList({ items = 5, className }: { items?: number; className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="container max-w-6xl mx-auto px-8 py-6">
      <Skeleton className="h-10 w-48 mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="max-w-4xl">
        <Skeleton className="h-8 w-64 mb-6" />
        <SkeletonList items={4} />
      </div>
    </div>
  );
}

export function SkeletonReadingView() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <Skeleton className="h-8 w-3/4 mb-4" />
      <Skeleton className="h-6 w-1/2 mb-8" />
      <div className="space-y-6">
        <SkeletonText lines={4} />
        <SkeletonText lines={5} />
        <SkeletonText lines={4} />
        <SkeletonText lines={3} />
      </div>
    </div>
  );
}

export function SkeletonReviewCard() {
  return (
    <div className="w-full max-w-2xl">
      <div className="rounded-lg border bg-card p-8 shadow-card">
        <SkeletonText lines={4} />
      </div>
    </div>
  );
}
