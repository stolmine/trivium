import { useState, useEffect, useRef } from 'react'
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

const hasClozes = (text: string): boolean => {
  return /\{\{c\d+::.+?\}\}/.test(text)
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

    if (!clozeText.trim() || !hasClozes(clozeText)) return

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

  const wrapSelection = (before: string, after: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = clozeText.substring(start, end)

    if (selectedText) {
      const newContent =
        clozeText.substring(0, start) +
        before + selectedText + after +
        clozeText.substring(end)

      setClozeText(newContent)

      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(
          start + before.length + selectedText.length + after.length,
          start + before.length + selectedText.length + after.length
        )
      }, 0)
    }
  }

  const getNextClozeNumber = (text: string): number => {
    const matches = text.matchAll(/\{\{c(\d+)::/g)
    const numbers = Array.from(matches).map(m => parseInt(m[1]))
    return numbers.length > 0 ? Math.max(...numbers) + 1 : 1
  }

  const handleWrapCloze = () => {
    const nextNumber = getNextClozeNumber(clozeText)
    wrapSelection(`{{c${nextNumber}::`, '}}')
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      if (document.activeElement === textareaRef.current) {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
          e.preventDefault()
          handleWrapCloze()
          return
        }
      }

      // Shift+Enter to submit form (works anywhere in modal)
      if (e.key === 'Enter' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        if (hasClozes(clozeText) && !isLoading) {
          handleCreate(e as unknown as React.FormEvent)
        }
        return
      }

      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement
        if (target.tagName === 'TEXTAREA') return

        e.preventDefault()
        if (hasClozes(clozeText) && !isLoading) {
          handleCreate(e as unknown as React.FormEvent)
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handlePreview()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, clozeText, previewClozeNumber, isLoading])

  useEffect(() => {
    if (clozeText && hasClozes(clozeText)) {
      const timeoutId = setTimeout(() => {
        handlePreview()
      }, 500)

      return () => clearTimeout(timeoutId)
    } else {
      setShowPreview(false)
      setPreviewHtml('')
    }
  }, [clozeText, previewClozeNumber])

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
              ref={textareaRef}
              id="clozeText"
              value={clozeText}
              onChange={(e) => setClozeText(e.target.value)}
              placeholder="Example: The capital of France is {{c1::Paris}}"
              rows={6}
              required
            />
            <div className="text-xs text-muted-foreground">
              Tip: Use {'{{c1::text}}'} for cloze deletions or press Ctrl+Shift+C to wrap selected text (auto-increments cloze numbers). Press Shift+Enter to submit.
            </div>
            {clozeText && !hasClozes(clozeText) && (
              <div className="text-xs text-destructive">
                No cloze deletions detected. Add at least one cloze using {'{{c1::text}}'} syntax.
              </div>
            )}
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
              disabled={isLoading || !clozeText.trim() || !hasClozes(clozeText)}
            >
              Preview
            </Button>
            <Button type="submit" disabled={isLoading || !clozeText.trim() || !hasClozes(clozeText)}>
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
