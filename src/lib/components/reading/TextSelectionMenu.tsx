import { useEffect, useState } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '../ui'
import { useReadingStore } from '../../stores/reading'
import { FlashcardCreator } from '../flashcard/FlashcardCreator'
import { api } from '../../utils/tauri'
import { getSelectionRange } from '@/lib/utils/domPosition'

interface TextSelectionMenuProps {
  children: React.ReactNode
  textId: number
}

export function TextSelectionMenu({ children, textId }: TextSelectionMenuProps) {
  const { currentText, markRangeAsRead, unmarkRangeAsRead, isRangeRead, isRangeExcluded } = useReadingStore()
  const [showFlashcardCreator, setShowFlashcardCreator] = useState(false)
  const [selectedText, setSelectedText] = useState('')

  const handleToggleRead = async () => {
    if (!currentText) return

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const articleElement = document.getElementById('article-content')
    if (!articleElement) return

    // Positions are in RENDERED space (match DOM textContent)
    // This is consistent with how read ranges and marks are stored
    const positionRange = getSelectionRange(articleElement)
    if (!positionRange) return

    const startPosition = positionRange.start
    const endPosition = positionRange.end
    const selectedText = selection.toString()

    if (isRangeExcluded(startPosition, endPosition)) {
      console.log('Cannot mark excluded text as read')
      selection.removeAllRanges()
      return
    }

    // Get the actual DOM text to verify position space
    const domText = articleElement?.textContent || ''

    console.log('[TextSelectionMenu] DIAGNOSTIC - Position Space Verification:', {
      selection: {
        start: startPosition,
        end: endPosition,
        text: selectedText.substring(0, 50) + '...',
        length: selectedText.length
      },
      domExtract: {
        text: domText.substring(startPosition, endPosition).substring(0, 50) + '...',
        match: domText.substring(startPosition, endPosition) === selectedText
      },
      domTextLength: domText.length
    })

    // With the new direct slicing approach, positions are already in the correct space
    // No conversion or validation needed - use positions as-is
    const finalRenderedStart = startPosition
    const finalRenderedEnd = endPosition

    if (isRangeRead(finalRenderedStart, finalRenderedEnd)) {
      unmarkRangeAsRead(currentText.id, finalRenderedStart, finalRenderedEnd)
    } else {
      // Mark as read for progress tracking
      markRangeAsRead(currentText.id, finalRenderedStart, finalRenderedEnd)

      // Also create a mark for the Create Cards hub with position information
      try {
        await api.flashcards.createMark(currentText.id, selectedText, finalRenderedStart, finalRenderedEnd)
      } catch (error) {
        console.error('Failed to create mark:', error)
        // Don't block the read marking if mark creation fails
      }
    }

    selection.removeAllRanges()
  }

  const handleCreateFlashcard = () => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const text = selection.toString().trim()
    if (!text) return

    setSelectedText(text)
    setShowFlashcardCreator(true)
    selection.removeAllRanges()
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Note: Ctrl+D is handled by the main ReadPage component to avoid duplicate calls
      // This component only handles Ctrl+N for flashcard creation
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        handleCreateFlashcard()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentText, markRangeAsRead, unmarkRangeAsRead, isRangeRead, isRangeExcluded])

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          <ContextMenuItem onClick={handleToggleRead}>
            Toggle Read
            <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleCreateFlashcard}>
            Create Flashcard
            <ContextMenuShortcut>Ctrl+N</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <FlashcardCreator
        open={showFlashcardCreator}
        onOpenChange={setShowFlashcardCreator}
        textId={textId}
        selectedText={selectedText}
      />
    </>
  )
}
