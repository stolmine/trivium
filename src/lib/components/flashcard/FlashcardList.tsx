import { useFlashcardStore } from '../../stores/flashcard'
import { Button } from '../ui'
import { FlashcardPreview } from './FlashcardPreview'
import { useState, useEffect } from 'react'

interface FlashcardListProps {
  textId: number | null
}

export function FlashcardList({ textId }: FlashcardListProps) {
  const { currentTextFlashcards, deleteFlashcard, isLoading, loadFlashcards, getPreview } = useFlashcardStore()
  const [previews, setPreviews] = useState<Record<number, string>>({})

  useEffect(() => {
    if (textId) {
      loadFlashcards(textId)
    }
  }, [textId, loadFlashcards])

  useEffect(() => {
    const loadPreviews = async () => {
      const newPreviews: Record<number, string> = {}
      for (const flashcard of currentTextFlashcards) {
        try {
          const preview = await getPreview(flashcard.clozeText, flashcard.clozeNumber)
          newPreviews[flashcard.id] = preview.html
        } catch (error) {
          console.error('Failed to load preview:', error)
        }
      }
      setPreviews(newPreviews)
    }

    if (currentTextFlashcards.length > 0) {
      loadPreviews()
    }
  }, [currentTextFlashcards, getPreview])

  const handleDelete = async (flashcardId: number) => {
    try {
      await deleteFlashcard(flashcardId)
    } catch (error) {
      console.error('Failed to delete flashcard:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Loading flashcards...</div>
      </div>
    )
  }

  if (currentTextFlashcards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-sm text-muted-foreground mb-2">No flashcards yet</div>
        <div className="text-xs text-muted-foreground">
          Select text and create a flashcard to get started
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {currentTextFlashcards.map((flashcard) => (
        <div key={flashcard.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Card #{flashcard.displayIndex} (Cloze {flashcard.clozeNumber})
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(flashcard.id)}
              className="h-6 px-2 text-xs"
            >
              Delete
            </Button>
          </div>
          {previews[flashcard.id] && (
            <FlashcardPreview html={previews[flashcard.id]} />
          )}
        </div>
      ))}
    </div>
  )
}
