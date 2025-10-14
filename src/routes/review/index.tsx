import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReviewStore } from '../../lib/stores/review'
import { ReviewCard } from '../../lib/components/review/ReviewCard'
import { ReviewGrading } from '../../lib/components/review/ReviewGrading'
import { SessionComplete } from '../../lib/components/review/SessionComplete'
import { Button } from '../../lib/components/ui'
import { ChevronLeft } from 'lucide-react'

export function ReviewPage() {
  const navigate = useNavigate()
  const {
    currentCard,
    showAnswer,
    isLoading,
    error,
    queue,
    currentIndex,
    loadDueCards,
    gradeCard,
    toggleAnswer,
  } = useReviewStore()

  useEffect(() => {
    loadDueCards()
  }, [loadDueCards])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        toggleAnswer()
      }

      if (showAnswer) {
        if (e.key === '1') {
          e.preventDefault()
          gradeCard(0)
        }
        if (e.key === '2') {
          e.preventDefault()
          gradeCard(1)
        }
        if (e.key === '3') {
          e.preventDefault()
          gradeCard(2)
        }
        if (e.key === '4') {
          e.preventDefault()
          gradeCard(3)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showAnswer, toggleAnswer, gradeCard])

  if (isLoading && !currentCard) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="text-muted-foreground" role="status" aria-live="polite">Loading cards...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-destructive text-lg" role="alert" aria-live="assertive">{error}</div>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Return to Dashboard
        </Button>
      </div>
    )
  }

  if (!currentCard) {
    return <SessionComplete />
  }

  const percentage = queue.length > 0 ? Math.round(((currentIndex + 1) / queue.length) * 100) : 0

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="border-b bg-card" role="banner">
        <div className="container mx-auto px-6 py-4 max-w-4xl">
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Exit
            </Button>
            <span className="text-sm text-muted-foreground" aria-live="polite">
              {currentIndex + 1} / {queue.length}
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

      <main className="flex-1 flex items-center justify-center p-8" role="main">
        <div className="w-full max-w-2xl">
          <ReviewCard card={currentCard} showAnswer={showAnswer} onToggleAnswer={toggleAnswer} />
        </div>
      </main>

      {showAnswer && (
        <div className="border-t bg-card" role="region" aria-label="Grading options">
          <div className="container mx-auto px-6 py-6 max-w-2xl">
            <ReviewGrading onGrade={gradeCard} disabled={isLoading} />
          </div>
        </div>
      )}
    </div>
  )
}
