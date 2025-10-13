import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { useFlashcardStore } from '../../stores/flashcard'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui'
import type { Flashcard } from '../../types'

interface FlashcardSidebarProps {
  textId: number
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function FlashcardSidebar({ textId, isCollapsed, onToggleCollapse }: FlashcardSidebarProps) {
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

  useEffect(() => {
    setMostRecentlyReadTextId(textId)
    loadFlashcards(textId)
  }, [textId, setMostRecentlyReadTextId, loadFlashcards])

  const handleDeleteClick = (flashcardId: number) => {
    console.log('handleDeleteClick called with flashcardId:', flashcardId)
    setFlashcardToDelete(flashcardId)
    setDeleteDialogOpen(true)
    console.log('Dialog state set to true')
    console.log('Flashcard to delete set to:', flashcardId)
  }

  const handleConfirmDelete = async () => {
    if (flashcardToDelete === null) return

    console.log('handleConfirmDelete called with flashcardId:', flashcardToDelete)
    try {
      console.log('Calling deleteFlashcard...')
      await deleteFlashcard(flashcardToDelete)
      console.log('Delete successful, reloading flashcards...')
      // Reload flashcards to ensure UI is in sync
      await loadFlashcards(textId)
      console.log('Flashcards reloaded')
      setDeleteDialogOpen(false)
      setFlashcardToDelete(null)
    } catch (error) {
      console.error('Failed to delete flashcard:', error)
      alert('Failed to delete flashcard: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const renderClozePreview = (flashcard: Flashcard) => {
    const parts = flashcard.clozeText.split(/(\{\{c\d+::[^}]+\}\})/g)
    return parts.map((part, idx) => {
      const match = part.match(/\{\{c(\d+)::([^}]+)\}\}/)
      if (match && parseInt(match[1]) === flashcard.clozeIndex) {
        return (
          <span key={idx} className="bg-blue-100 text-blue-800 px-1 rounded">
            [{match[2]}]
          </span>
        )
      }
      return <span key={idx}>{part}</span>
    })
  }

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center border-l border-gray-200 bg-gray-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="mt-4"
          title="Expand flashcards"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col border-l border-gray-200 bg-gray-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold">Flashcards</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          title="Collapse sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && (
          <div className="text-center text-sm text-gray-500 py-4">
            Loading flashcards...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {!isLoading && !error && currentTextFlashcards.length === 0 && (
          <div className="text-center text-sm text-gray-500 py-8">
            <p className="mb-2">No flashcards yet</p>
            <p className="text-xs">
              Select text and press Ctrl+N to create one
            </p>
          </div>
        )}

        {!isLoading && !error && currentTextFlashcards.length > 0 && (
          <div className="space-y-3">
            {currentTextFlashcards.map((flashcard) => (
              <div
                key={flashcard.id}
                className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="text-xs text-gray-500">
                    Card #{flashcard.clozeIndex}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(flashcard.id)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                    title="Delete flashcard"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <div className="text-sm text-gray-800 leading-relaxed">
                  {renderClozePreview(flashcard)}
                </div>

                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Due: {new Date(flashcard.due).toLocaleDateString()}</span>
                    <span>Reps: {flashcard.reps}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="text-xs text-gray-500 text-center">
          {currentTextFlashcards.length} {currentTextFlashcards.length === 1 ? 'card' : 'cards'}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {console.log('Rendering Dialog, open:', deleteDialogOpen, 'flashcardToDelete:', flashcardToDelete)}
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
                console.log('Cancel clicked')
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
    </div>
  )
}
