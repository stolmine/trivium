import { useEffect } from 'react'
import { useReviewStore } from '../../lib/stores/review'
import { ReviewHeader } from '../../lib/components/review/ReviewHeader'
import { ReviewCard } from '../../lib/components/review/ReviewCard'
import { ReviewGrading } from '../../lib/components/review/ReviewGrading'
import { SessionComplete } from '../../lib/components/review/SessionComplete'

export function ReviewPage() {
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg" role="status" aria-live="polite">Loading cards...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="text-red-500 text-lg" role="alert" aria-live="assertive">{error}</div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Return to Library
        </button>
      </div>
    )
  }

  if (!currentCard) {
    return <SessionComplete />
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <ReviewHeader progress={currentIndex + 1} total={queue.length} />

      <main className="flex-1 flex items-center justify-center p-8" role="main">
        <ReviewCard card={currentCard} showAnswer={showAnswer} onToggleAnswer={toggleAnswer} />
      </main>

      {showAnswer && (
        <div className="p-8 border-t" role="region" aria-label="Grading options">
          <ReviewGrading onGrade={gradeCard} disabled={isLoading} />
        </div>
      )}
    </div>
  )
}
