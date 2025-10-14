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

interface TextSelectionMenuProps {
  children: React.ReactNode
  textId: number
}

export function TextSelectionMenu({ children, textId }: TextSelectionMenuProps) {
  const { currentText, markRangeAsRead, unmarkRangeAsRead, isRangeRead, isRangeExcluded } = useReadingStore()
  const [showFlashcardCreator, setShowFlashcardCreator] = useState(false)
  const [selectedText, setSelectedText] = useState('')

  const handleToggleRead = () => {
    if (!currentText) return

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const range = selection.getRangeAt(0)
    const articleElement = document.getElementById('article-content')
    if (!articleElement) return

    const preCaretRange = range.cloneRange()
    preCaretRange.selectNodeContents(articleElement)
    preCaretRange.setEnd(range.startContainer, range.startOffset)
    const startPosition = preCaretRange.toString().length

    const endPosition = startPosition + selection.toString().length

    if (isRangeExcluded(startPosition, endPosition)) {
      console.log('Cannot mark excluded text as read')
      selection.removeAllRanges()
      return
    }

    if (isRangeRead(startPosition, endPosition)) {
      unmarkRangeAsRead(currentText.id, startPosition, endPosition)
    } else {
      markRangeAsRead(currentText.id, startPosition, endPosition)
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
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault()
        handleToggleRead()
      }
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
            <ContextMenuShortcut>Ctrl+M</ContextMenuShortcut>
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
