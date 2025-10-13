interface ReviewHeaderProps {
  progress: number
  total: number
}

export function ReviewHeader({ progress, total }: ReviewHeaderProps) {
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0

  return (
    <header className="border-b bg-card" role="banner">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-semibold">Review Session</h1>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {progress} / {total}
          </span>
        </div>
        <div
          className="w-full bg-secondary rounded-full h-2"
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Review progress: ${percentage}% complete`}
        >
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </header>
  )
}
