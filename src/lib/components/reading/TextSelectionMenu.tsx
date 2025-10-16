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

    const articleElement = document.getElementById('article-content')
    if (!articleElement) return

    const range = selection.getRangeAt(0)

    const preRange = document.createRange()
    preRange.selectNodeContents(articleElement)
    preRange.setEnd(range.startContainer, range.startOffset)

    const textBeforeSelection = preRange.toString()
    const selectedText = selection.toString()

    const startPosition = textBeforeSelection.length
    const endPosition = startPosition + selectedText.length

    // DEBUG LOGGING
    console.log('=== TextSelectionMenu: handleToggleRead ===')
    console.log('Article DOM length:', articleElement.textContent?.length)
    console.log('Article innerHTML sample (first 200 chars):', articleElement.innerHTML.substring(0, 200))
    console.log('Article textContent sample (first 200 chars):', articleElement.textContent?.substring(0, 200))
    console.log('Selected text:', `"${selectedText}"`)
    console.log('Selected text length:', selectedText.length)
    console.log('Calculated positions:', { startPosition, endPosition })
    console.log('Text at positions in DOM:', `"${articleElement.textContent?.substring(startPosition, endPosition)}"`)
    console.log('Does selected text match DOM text at positions?', selectedText === articleElement.textContent?.substring(startPosition, endPosition))
    console.log('=========================================')

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
