import { useEffect } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '../ui'
import { useReadingStore } from '../../stores/reading'

interface TextSelectionMenuProps {
  children: React.ReactNode
}

export function TextSelectionMenu({ children }: TextSelectionMenuProps) {
  const { currentText, markRangeAsRead, unmarkRangeAsRead, isRangeRead } = useReadingStore()

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

    // Check if the range is already marked as read
    if (isRangeRead(startPosition, endPosition)) {
      unmarkRangeAsRead(currentText.id, startPosition, endPosition)
    } else {
      markRangeAsRead(currentText.id, startPosition, endPosition)
    }

    selection.removeAllRanges()
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault()
        handleToggleRead()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentText, markRangeAsRead, unmarkRangeAsRead, isRangeRead])

  return (
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
        <ContextMenuItem disabled>
          Create Flashcard
          <ContextMenuShortcut>Ctrl+N</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
