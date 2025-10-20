import { useEffect, useState, useMemo } from 'react'
import { X, ChevronDown, ChevronUp, Trash2, ArrowUpDown, Zap } from 'lucide-react'
import { useFlashcardStore } from '../../stores/flashcard'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui'
import { formatRelativeDue, formatDueDate, getDueColorClass } from '../../utils'
import type { Flashcard } from '../../types'

type FlashcardSortOption = 'display-order' | 'alpha-asc' | 'alpha-desc' | 'due-soonest' | 'due-latest' | 'difficulty'

const sortFlashcards = (flashcards: Flashcard[], sortBy: FlashcardSortOption): Flashcard[] => {
  const flashcardsCopy = [...flashcards]

  switch (sortBy) {
    case 'display-order':
      return flashcardsCopy.sort((a, b) => a.displayIndex - b.displayIndex)
    case 'alpha-asc':
      return flashcardsCopy.sort((a, b) => a.clozeText.localeCompare(b.clozeText))
    case 'alpha-desc':
      return flashcardsCopy.sort((a, b) => b.clozeText.localeCompare(a.clozeText))
    case 'due-soonest':
      return flashcardsCopy.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
    case 'due-latest':
      return flashcardsCopy.sort((a, b) => new Date(b.due).getTime() - new Date(a.due).getTime())
    case 'difficulty':
      return flashcardsCopy.sort((a, b) => b.difficulty - a.difficulty)
    default:
      return flashcardsCopy
  }
}

const getFlashcardSortLabel = (sortBy: FlashcardSortOption): string => {
  switch (sortBy) {
    case 'display-order':
      return 'Display Order'
    case 'alpha-asc':
      return 'Alphabetical (A-Z)'
    case 'alpha-desc':
      return 'Alphabetical (Z-A)'
    case 'due-soonest':
      return 'Due Date (Soonest)'
    case 'due-latest':
      return 'Due Date (Latest)'
    case 'difficulty':
      return 'Difficulty'
    default:
      return 'Sort'
  }
}

interface FlashcardSidebarProps {
  textId: number
  onClose: () => void
}

export function FlashcardSidebar({ textId, onClose }: FlashcardSidebarProps) {
  const {
    currentTextFlashcards,
    isLoading,
    error,
    loadFlashcards,
    deleteFlashcard,
    setMostRecentlyReadTextId
  } = useFlashcardStore()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [flashcardToDelete, setFlashcardToDelete] = useState<number | null>(null)
  const [expandedCardIds, setExpandedCardIds] = useState<Set<number>>(new Set())
  const [sortBy, setSortBy] = useState<FlashcardSortOption>('display-order')

  useEffect(() => {
    setMostRecentlyReadTextId(textId)
    loadFlashcards(textId)
  }, [textId, setMostRecentlyReadTextId, loadFlashcards])

  const handleDeleteClick = (flashcardId: number) => {
    setFlashcardToDelete(flashcardId)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (flashcardToDelete === null) return

    try {
      await deleteFlashcard(flashcardToDelete)
      await loadFlashcards(textId)
      setDeleteDialogOpen(false)
      setFlashcardToDelete(null)
    } catch (error) {
      console.error('Failed to delete flashcard:', error)
      alert('Failed to delete flashcard: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  useEffect(() => {
    if (!deleteDialogOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && flashcardToDelete !== null) {
        e.preventDefault()
        handleConfirmDelete()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteDialogOpen, flashcardToDelete])

  const toggleCardExpansion = (flashcardId: number) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev)
      if (next.has(flashcardId)) {
        next.delete(flashcardId)
      } else {
        next.add(flashcardId)
      }
      return next
    })
  }

  const extractContext = (clozeText: string, targetClozeNumber: number): string => {
    const clozeRegex = new RegExp(`\\{\\{c${targetClozeNumber}::[^}]+\\}\\}`)
    const clozeMatch = clozeText.match(clozeRegex)
    if (!clozeMatch) return clozeText

    const clozePosition = clozeMatch.index || 0
    const clozeEnd = clozePosition + clozeMatch[0].length
    const textBeforeCloze = clozeText.slice(0, clozePosition)
    const textAfterCloze = clozeText.slice(clozeEnd)

    // Find sentence boundaries - look for punctuation followed by space
    const sentenceEnders = [
      textBeforeCloze.lastIndexOf('. '),
      textBeforeCloze.lastIndexOf('! '),
      textBeforeCloze.lastIndexOf('? '),
      textBeforeCloze.lastIndexOf('.\n'),
      textBeforeCloze.lastIndexOf('!\n'),
      textBeforeCloze.lastIndexOf('?\n')
    ]
    const lastSentenceEnd = Math.max(...sentenceEnders)
    const sentenceStartIndex = lastSentenceEnd >= 0 ? lastSentenceEnd + 2 : 0

    // Find the next sentence boundary after the cloze
    const nextSentenceEnders = [
      textAfterCloze.indexOf('. '),
      textAfterCloze.indexOf('! '),
      textAfterCloze.indexOf('? '),
      textAfterCloze.indexOf('.\n'),
      textAfterCloze.indexOf('!\n'),
      textAfterCloze.indexOf('?\n')
    ].filter((i) => i !== -1)

    const nextSentenceEnd = nextSentenceEnders.length > 0
      ? Math.min(...nextSentenceEnders) + 1
      : textAfterCloze.length

    // Extract the sentence(s) containing the cloze
    const extractedText = clozeText.slice(
      sentenceStartIndex,
      clozeEnd + nextSentenceEnd
    ).trim()

    // If we got a reasonable sentence, return it
    if (extractedText.length > 0 && (lastSentenceEnd >= 0 || nextSentenceEnders.length > 0)) {
      return extractedText
    }

    // Fall back to word-based context if no clear sentence boundaries
    const words = clozeText.split(/\s+/)
    const clozeWordIndex = words.findIndex((word) => word.includes(`{{c${targetClozeNumber}::`))

    if (clozeWordIndex === -1) return clozeText

    // Extract 5-7 words before and after the cloze
    const start = Math.max(0, clozeWordIndex - 5)
    const end = Math.min(words.length, clozeWordIndex + 6)
    const contextWords = words.slice(start, end)

    // Add ellipsis indicators when truncating
    if (start > 0) contextWords.unshift('...')
    if (end < words.length) contextWords.push('...')

    return contextWords.join(' ')
  }

  const renderClozePreview = (flashcard: Flashcard) => {
    const parts = flashcard.clozeText.split(/(\{\{c\d+::[^}]+\}\})/g)
    return parts.map((part, idx) => {
      const match = part.match(/\{\{c(\d+)::([^}:]+)(?:::([^}]+))?\}\}/)
      if (match) {
        if (parseInt(match[1]) === flashcard.clozeNumber) {
          return (
            <span key={idx} className="bg-primary/10 text-primary px-1 rounded font-medium">
              [...]
            </span>
          )
        }
        return <span key={idx}>{match[2]}</span>
      }
      return <span key={idx}>{part}</span>
    })
  }

  const sortedFlashcards = useMemo(
    () => sortFlashcards(currentTextFlashcards, sortBy),
    [currentTextFlashcards, sortBy]
  )

  return (
    <aside className="w-96 border-l border-border bg-muted flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Flashcards ({currentTextFlashcards.length})</h2>
        </div>
        <div className="flex items-center gap-2">
          {currentTextFlashcards.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  title={getFlashcardSortLabel(sortBy)}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy('display-order')}>
                  Display Order
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('alpha-asc')}>
                  Alphabetical (A-Z)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('alpha-desc')}>
                  Alphabetical (Z-A)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('due-soonest')}>
                  Due Date (Soonest)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('due-latest')}>
                  Due Date (Latest)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('difficulty')}>
                  Difficulty
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            title="Close sidebar"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && (
          <div className="text-center text-sm text-muted-foreground py-4">
            Loading flashcards...
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {!isLoading && !error && currentTextFlashcards.length === 0 && (
          <div className="text-center text-muted-foreground mt-8">
            <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No flashcards yet</p>
            <p className="text-xs mt-1">
              Select text and press Ctrl+D to create one
            </p>
          </div>
        )}

        {!isLoading && !error && sortedFlashcards.length > 0 && (
          <div className="space-y-3">
            {sortedFlashcards.map((flashcard) => {
              const isExpanded = expandedCardIds.has(flashcard.id)
              const contextText = extractContext(flashcard.clozeText, flashcard.clozeNumber)

              return (
                <div
                  key={flashcard.id}
                  className="bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <div
                    className="p-3 cursor-pointer"
                    onClick={() => toggleCardExpansion(flashcard.id)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">
                          Card #{flashcard.displayIndex}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteClick(flashcard.id)
                        }}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        title="Delete flashcard"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="text-sm text-card-foreground leading-relaxed">
                      {isExpanded ? (
                        renderClozePreview(flashcard)
                      ) : (
                        renderClozePreview({ ...flashcard, clozeText: contextText })
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="text-muted-foreground">Due:</span>
                      <span className={getDueColorClass(flashcard.due)}>
                        {formatRelativeDue(flashcard.due)}
                      </span>
                      <span className="text-muted-foreground/60">
                        ({formatDueDate(flashcard.due)})
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0">
                      <div className="pt-2 border-t border-border">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Difficulty: {flashcard.difficulty.toFixed(1)}</span>
                          <span>Reps: {flashcard.reps}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Flashcard</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this flashcard? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setFlashcardToDelete(null)
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
    </aside>
  )
}
