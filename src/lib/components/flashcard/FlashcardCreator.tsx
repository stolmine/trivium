import { useState, useEffect } from 'react'
import { useFlashcardStore } from '../../stores/flashcard'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Textarea,
  Label,
} from '../ui'
import { FlashcardPreview } from './FlashcardPreview'

interface FlashcardCreatorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  textId: number
  selectedText: string
}

export function FlashcardCreator({
  open,
  onOpenChange,
  textId,
  selectedText,
}: FlashcardCreatorProps) {
  const [clozeText, setClozeText] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewClozeNumber, setPreviewClozeNumber] = useState(1)
  const [showPreview, setShowPreview] = useState(false)
  const { createFlashcard, getPreview, isLoading } = useFlashcardStore()

  useEffect(() => {
    if (open && selectedText) {
      setClozeText(selectedText)
      setShowPreview(false)
      setPreviewHtml('')
    }
  }, [open, selectedText])

  const handlePreview = async () => {
    if (!clozeText.trim()) return

    try {
      const preview = await getPreview(clozeText, previewClozeNumber)
      setPreviewHtml(preview.html)
      setShowPreview(true)
    } catch (error) {
      console.error('Failed to generate preview:', error)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clozeText.trim()) return

    try {
      await createFlashcard(textId, selectedText, clozeText)
      setClozeText('')
      setPreviewHtml('')
      setShowPreview(false)
      setPreviewClozeNumber(1)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create flashcard:', error)
    }
  }

  const handleClozeIndexChange = (increment: number) => {
    const newIndex = Math.max(1, previewClozeNumber + increment)
    setPreviewClozeNumber(newIndex)
    if (showPreview) {
      handlePreview()
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handlePreview()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, clozeText, previewClozeNumber])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Flashcard</DialogTitle>
          <DialogDescription>
            Add cloze deletions using the syntax: {'{{c1::text}}'} for multiple clozes use c2, c3, etc.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clozeText">Cloze Text</Label>
            <Textarea
              id="clozeText"
              value={clozeText}
              onChange={(e) => setClozeText(e.target.value)}
              placeholder="Example: The capital of France is {{c1::Paris}}"
              rows={6}
              required
            />
            <div className="text-xs text-muted-foreground">
              Tip: Use {'{{c1::text}}'} for cloze deletions. Support multiple clozes with c2, c3, etc.
            </div>
          </div>

          {showPreview && previewHtml && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Preview (Cloze {previewClozeNumber})</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleClozeIndexChange(-1)}
                    disabled={previewClozeNumber <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleClozeIndexChange(1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
              <FlashcardPreview html={previewHtml} />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handlePreview}
              disabled={isLoading || !clozeText.trim()}
            >
              Preview
            </Button>
            <Button type="submit" disabled={isLoading || !clozeText.trim()}>
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
