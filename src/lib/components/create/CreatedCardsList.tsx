import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Edit2, Trash2 } from 'lucide-react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui'
import { formatRelativeTime } from '../../utils'
import type { CreatedCard } from '../../types'

interface CreatedCardsListProps {
  cards: CreatedCard[]
  onEdit: (card: CreatedCard) => void
  onDelete: (cardId: number) => Promise<void>
  onClearAll?: () => void
}

export function CreatedCardsList({
  cards,
  onEdit,
  onDelete,
  onClearAll
}: CreatedCardsListProps) {
  const [expandedCardIds, setExpandedCardIds] = useState<Set<number>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cardToDelete, setCardToDelete] = useState<number | null>(null)
  const [highlightedCardId, setHighlightedCardId] = useState<number | null>(null)

  useEffect(() => {
    if (cards.length > 0) {
      const newestCard = cards[0]
      setHighlightedCardId(newestCard.id)

      const timer = setTimeout(() => {
        setHighlightedCardId(null)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [cards.length])

  const toggleCardExpansion = (cardId: number) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) {
        next.delete(cardId)
      } else {
        next.add(cardId)
      }
      return next
    })
  }

  const handleDeleteClick = (cardId: number) => {
    setCardToDelete(cardId)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (cardToDelete === null) return

    try {
      await onDelete(cardToDelete)
      setDeleteDialogOpen(false)
      setCardToDelete(null)
    } catch (error) {
      console.error('Failed to delete card:', error)
      alert('Failed to delete card: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  useEffect(() => {
    if (!deleteDialogOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && cardToDelete !== null) {
        e.preventDefault()
        handleConfirmDelete()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteDialogOpen, cardToDelete])

  const renderCardPreview = (card: CreatedCard) => {
    const questionPreview = card.question.includes('[...]')
      ? card.question
      : card.question.substring(0, 100) + (card.question.length > 100 ? '...' : '')

    return (
      <div className="text-sm text-foreground leading-relaxed">
        {questionPreview}
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="border-t border-border bg-muted px-6 py-8">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">No cards created yet</p>
          <p className="text-xs text-muted-foreground opacity-70">
            Cards you create will appear here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-border bg-muted">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-background">
        <h3 className="text-sm font-semibold text-foreground">
          Created Today ({cards.length} {cards.length === 1 ? 'card' : 'cards'})
        </h3>
        {onClearAll && cards.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear All
          </Button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto p-4 space-y-3">
        {cards.map((card, index) => {
          const isExpanded = expandedCardIds.has(card.id)
          const isHighlighted = highlightedCardId === card.id
          const isNewest = index === 0

          return (
            <div
              key={card.id}
              className={`
                bg-background border rounded-lg shadow-sm transition-all duration-300
                ${isHighlighted ? 'border-primary shadow-md animate-pulse' : 'border-border hover:shadow-md'}
                ${isNewest ? 'animate-slideInTop' : ''}
              `}
            >
              <div
                className="p-3 cursor-pointer"
                onClick={() => toggleCardExpansion(card.id)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(card.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(card)
                      }}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                      title="Edit card"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteClick(card.id)
                      }}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      title="Delete card"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {!isExpanded && renderCardPreview(card)}

                {isExpanded && (
                  <div className="space-y-2 mt-2">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Question</div>
                      <div className="text-sm text-foreground leading-relaxed">
                        {card.question}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Answer</div>
                      <div className="text-sm text-foreground leading-relaxed">
                        {card.answer}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 pt-0">
                  <div className="pt-2 border-t border-border">
                    <div className="text-xs text-muted-foreground">
                      From: {card.textTitle}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Card</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this card? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setCardToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
