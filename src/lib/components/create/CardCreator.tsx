import { useState, useEffect } from 'react'
import { useTextHistory } from '../../../hooks/useTextHistory'
import { useFlashcardStore } from '../../stores/flashcard'
import { Button, Textarea, Label } from '../ui'
import { FlashcardPreview } from '../flashcard/FlashcardPreview'

interface CardCreatorProps {
  mark: {
    id: number
    textId: number
    markedText: string
  }
  onCreateCard: (selectedText: string, clozeText: string) => Promise<void>
  onSkip: () => void
  onBury: () => void
}

const hasClozes = (text: string): boolean => {
  return /\{\{c\d+::.+?\}\}/.test(text)
}

const countClozes = (text: string): number => {
  const matches = text.matchAll(/\{\{c\d+::/g)
  const numbers = Array.from(matches).map(m => parseInt(m[1]))
  return numbers.length > 0 ? Math.max(...numbers) : 0
}

export function CardCreator({
  mark,
  onCreateCard,
  onSkip,
  onBury,
}: CardCreatorProps) {
  const {
    content: clozeText,
    setContent: setClozeText,
    setContentImmediate: setClozeTextImmediate,
    textareaRef,
    undo,
    redo,
  } = useTextHistory({ initialValue: mark.markedText, debounceMs: 500 })
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewClozeNumber, setPreviewClozeNumber] = useState(1)
  const [showPreview, setShowPreview] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const { getPreview } = useFlashcardStore()

  useEffect(() => {
    setClozeText(mark.markedText)
    setShowPreview(false)
    setPreviewHtml('')
    setPreviewClozeNumber(1)
    setSuccessMessage('')
  }, [mark.id])

  const handlePreview = async () => {
    if (!clozeText.trim() || !hasClozes(clozeText)) return

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

    if (!clozeText.trim() || !hasClozes(clozeText) || isCreating) return

    setIsCreating(true)
    setSuccessMessage('')

    try {
      await onCreateCard(mark.markedText, clozeText)
      setSuccessMessage('Card created successfully!')

      setTimeout(() => {
        setSuccessMessage('')
      }, 2000)
    } catch (error) {
      console.error('Failed to create card:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleClozeIndexChange = (increment: number) => {
    const maxClozes = countClozes(clozeText)
    const newIndex = Math.max(1, Math.min(maxClozes, previewClozeNumber + increment))
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

      setClozeTextImmediate(newContent)

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
      if (document.activeElement === textareaRef.current) {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
          e.preventDefault()
          handleWrapCloze()
          return
        }

        if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
          e.preventDefault()
          undo()
          return
        }

        if ((e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
            (e.key === 'y' && (e.ctrlKey || e.metaKey))) {
          e.preventDefault()
          redo()
          return
        }
      }

      if (e.key === 'Enter' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        if (hasClozes(clozeText) && !isCreating) {
          handleCreate(e as unknown as React.FormEvent)
        }
        return
      }

      if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const target = e.target as HTMLElement
        if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return

        e.preventDefault()
        onSkip()
        return
      }

      if (e.key === 'B' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement
        if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return

        e.preventDefault()
        onBury()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [clozeText, isCreating, undo, redo])

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

  const totalClozes = countClozes(clozeText)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="clozeText">Cloze Text (editable)</Label>
        <Textarea
          ref={textareaRef}
          id="clozeText"
          value={clozeText}
          onChange={(e) => setClozeText(e.target.value)}
          placeholder="Example: The capital of {{c1::France}} is {{c2::Paris}}"
          rows={6}
          className="font-mono text-sm"
        />
        <div className="text-xs text-muted-foreground">
          Tip: Select text and press Ctrl+Shift+C to wrap in cloze deletion (auto-increments). Press Shift+Enter to create card.
        </div>
        {clozeText && !hasClozes(clozeText) && (
          <div className="text-xs text-destructive">
            No cloze deletions found. Add at least one using {'{{c1::text}}'} syntax.
          </div>
        )}
      </div>

      {showPreview && previewHtml && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Preview (Card {previewClozeNumber} of {totalClozes})</Label>
            {totalClozes > 1 && (
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
                  disabled={previewClozeNumber >= totalClozes}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
          <FlashcardPreview html={previewHtml} />
        </div>
      )}

      {successMessage && (
        <div className="rounded-md bg-primary/10 px-4 py-2 text-sm text-primary">
          {successMessage}
        </div>
      )}

      <div className="flex justify-between gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onSkip}
            disabled={isCreating}
          >
            Skip (Space)
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onBury}
            disabled={isCreating}
          >
            Bury (⇧B)
          </Button>
        </div>
        <Button
          onClick={handleCreate}
          disabled={isCreating || !clozeText.trim() || !hasClozes(clozeText)}
        >
          {isCreating ? 'Creating...' : 'Create Card (⇧↵)'}
        </Button>
      </div>
    </div>
  )
}
