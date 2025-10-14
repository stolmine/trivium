import type { ReviewQuality } from '../../types'

interface ReviewGradingProps {
  onGrade: (rating: ReviewQuality) => void
  disabled?: boolean
  cardState?: { stability: number; state: number }
}

export function ReviewGrading({ onGrade, disabled, cardState: _cardState }: ReviewGradingProps) {
  // Note: Intervals shown are approximate for new cards based on FSRS-6 initial_stability values:
  // - Again: 0.212d → <1d (~5 hours)
  // - Hard: 1.29d → 1d (~31 hours)
  // - Good: 2.31d → 2d
  // - Easy: 8.30d → 8d
  // For review cards, actual intervals will be dynamically calculated by FSRS based on
  // current stability and will typically be longer.
  const grades = [
    { rating: 0 as ReviewQuality, label: 'Again', color: 'bg-red-500 hover:bg-red-600', key: '1', interval: '<1d' },
    { rating: 1 as ReviewQuality, label: 'Hard', color: 'bg-orange-500 hover:bg-orange-600', key: '2', interval: '1d' },
    { rating: 2 as ReviewQuality, label: 'Good', color: 'bg-green-500 hover:bg-green-600', key: '3', interval: '2d' },
    { rating: 3 as ReviewQuality, label: 'Easy', color: 'bg-blue-500 hover:bg-blue-600', key: '4', interval: '8d' },
  ]

  return (
    <div className="grid grid-cols-4 gap-4 max-w-4xl mx-auto" role="group" aria-label="Flashcard grading options">
      {grades.map((grade) => (
        <button
          key={grade.rating}
          onClick={() => onGrade(grade.rating)}
          disabled={disabled}
          className={`${grade.color} text-white p-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white`}
          aria-label={`Grade as ${grade.label}, next review in ${grade.interval}. Press ${grade.key}`}
        >
          <div className="text-lg font-semibold">{grade.label}</div>
          <div className="text-sm opacity-80" aria-hidden="true">Key: {grade.key}</div>
          <div className="text-xs mt-1" aria-hidden="true">{grade.interval}</div>
        </button>
      ))}
    </div>
  )
}
