import { useNavigate } from 'react-router-dom'
import { useReviewStore } from '../../stores/review'
import { Button } from '../ui'

export function SessionComplete() {
  const { sessionStats, resetSession, loadDueCards } = useReviewStore()
  const navigate = useNavigate()

  const { totalReviews, uniqueCards, againCount, hardCount, goodCount, easyCount, startTime } = sessionStats
  const duration = Math.floor((Date.now() - startTime.getTime()) / 1000 / 60)

  const handleReviewMore = async () => {
    resetSession()
    await loadDueCards()
  }

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="max-w-md w-full p-8 bg-card rounded-lg shadow-lg border">
        <h1 className="text-3xl font-bold mb-6 text-center">Session Complete!</h1>

        <div className="space-y-4 mb-8">
          <StatRow label="Cards completed" value={uniqueCards} />
          <StatRow label="Total reviews" value={totalReviews} />
          <div className="border-t pt-4 space-y-4">
            <StatRow label="Again" value={againCount} color="text-red-500" />
            <StatRow label="Hard" value={hardCount} color="text-orange-500" />
            <StatRow label="Good" value={goodCount} color="text-green-500" />
            <StatRow label="Easy" value={easyCount} color="text-blue-500" />
          </div>
          <StatRow label="Duration" value={`${duration} min`} />
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleReviewMore}
            className="w-full py-3"
          >
            Review More Cards
          </Button>

          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="w-full py-3"
          >
            Back to Library
          </Button>
        </div>
      </div>
    </div>
  )
}

function StatRow({ label, value, color = 'text-foreground' }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  )
}
