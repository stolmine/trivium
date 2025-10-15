import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReviewStore } from '../../stores/review'
import { Button } from '../ui'
import { api } from '../../utils/tauri'

export function SessionComplete() {
  const { sessionStats, resetSession, loadDueCards, currentFilter } = useReviewStore()
  const navigate = useNavigate()
  const [filterDisplayName, setFilterDisplayName] = useState<string>('')

  const { totalReviews, uniqueCards, againCount, hardCount, goodCount, easyCount, startTime } = sessionStats
  const duration = Math.floor((Date.now() - startTime.getTime()) / 1000 / 60)

  useEffect(() => {
    const loadFilterName = async () => {
      if (!currentFilter || currentFilter.type === 'global') {
        setFilterDisplayName('')
        return
      }

      if (currentFilter.type === 'text') {
        try {
          const text = await api.texts.get(currentFilter.textId)
          setFilterDisplayName(text.title)
        } catch {
          setFilterDisplayName(`Text #${currentFilter.textId}`)
        }
      } else if (currentFilter.type === 'folder') {
        setFilterDisplayName('Folder')
      }
    }

    loadFilterName()
  }, [currentFilter])

  const handleReviewMore = async () => {
    resetSession()
    await loadDueCards(currentFilter || undefined)
  }

  return (
    <div className="flex items-center justify-center h-full bg-background py-12">
      <div className="max-w-md w-full p-8 bg-card rounded-lg shadow-lg border">
        <h1 className="text-3xl font-bold mb-6 text-center">Session Complete!</h1>

        {filterDisplayName && (
          <p className="text-center text-muted-foreground mb-6">
            You reviewed: {filterDisplayName}
          </p>
        )}

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
            onClick={() => navigate('/review')}
            variant="outline"
            className="w-full py-3"
          >
            Choose Different Collection
          </Button>

          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="w-full py-3"
          >
            Return to Dashboard
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
