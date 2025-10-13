import { Button } from '../ui'
import type { Flashcard } from '../../types'

interface ReviewCardProps {
  card: Flashcard
  showAnswer: boolean
  onToggleAnswer: () => void
}

export function ReviewCard({ card, showAnswer, onToggleAnswer }: ReviewCardProps) {
  const renderClozeHtml = (clozeText: string, clozeNumber: number, revealed: boolean): string => {
    const parts = clozeText.split(/(\{\{c\d+::[^}]+\}\})/g)

    return parts.map(part => {
      const match = part.match(/\{\{c(\d+)::([^}]+)\}\}/)
      if (match) {
        const num = parseInt(match[1])
        const content = match[2]

        if (num === clozeNumber) {
          if (revealed) {
            return `<span class="cloze-visible">${content}</span>`
          } else {
            return `<span class="cloze-hidden">[...]</span>`
          }
        }
        return content
      }
      return part
    }).join('')
  }

  return (
    <div className="max-w-2xl w-full">
      <div
        className="text-xl mb-8 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: renderClozeHtml(card.clozeText, card.clozeNumber, showAnswer) }}
        role="region"
        aria-label={showAnswer ? "Flashcard with answer revealed" : "Flashcard question"}
      />

      {!showAnswer && (
        <Button
          onClick={onToggleAnswer}
          className="w-full py-3"
          aria-label="Show answer (press Space)"
        >
          Show Answer <span className="text-muted-foreground ml-2" aria-hidden="true">(Space)</span>
        </Button>
      )}
    </div>
  )
}
