import { useEffect, useState } from 'react'
import { Edit2, Check } from 'lucide-react'
import { Button } from '../ui'
import { cn } from '../../utils'

interface SelectionToolbarProps {
  selection: {
    text: string
    start: number
    end: number
  } | null
  onEdit: () => void
  onEditInline?: () => void
  onMarkAsRead: () => void
  position: { x: number; y: number }
}

export function SelectionToolbar({
  selection,
  onEdit,
  onEditInline,
  onMarkAsRead,
  position
}: SelectionToolbarProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (selection && selection.text.trim()) {
      const toolbar = document.getElementById('selection-toolbar')
      if (!toolbar) {
        setToolbarPosition(position)
        setIsVisible(true)
        return
      }

      const toolbarRect = toolbar.getBoundingClientRect()
      const toolbarWidth = toolbarRect.width || 200
      const toolbarHeight = toolbarRect.height || 48

      let finalX = position.x - toolbarWidth / 2
      let finalY = position.y - toolbarHeight - 8

      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      if (finalX < 8) {
        finalX = 8
      } else if (finalX + toolbarWidth > viewportWidth - 8) {
        finalX = viewportWidth - toolbarWidth - 8
      }

      if (finalY < 8) {
        finalY = position.y + 8
      }

      if (finalY + toolbarHeight > viewportHeight - 8) {
        finalY = viewportHeight - toolbarHeight - 8
      }

      setToolbarPosition({ x: finalX, y: finalY })
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [selection, position])

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(false)
    }

    window.addEventListener('scroll', handleScroll, true)
    return () => window.removeEventListener('scroll', handleScroll, true)
  }, [])

  const handleEdit = () => {
    if (onEditInline) {
      onEditInline()
    } else {
      onEdit()
    }
    setIsVisible(false)
  }

  const handleMarkAsRead = () => {
    onMarkAsRead()
    setIsVisible(false)
  }

  if (!isVisible || !selection) {
    return null
  }

  return (
    <div
      id="selection-toolbar"
      className={cn(
        'fixed flex items-center gap-1 bg-popover border border-border rounded-lg p-1 shadow-lg',
        'transition-all duration-150 ease-in-out'
      )}
      style={{
        left: `${toolbarPosition.x}px`,
        top: `${toolbarPosition.y}px`,
        zIndex: 50,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(4px)'
      }}
    >
      <Button
        variant="default"
        size="sm"
        onClick={handleEdit}
        title="Edit selection (Ctrl+E)"
        aria-label="Edit selection"
      >
        <Edit2 className="h-4 w-4 mr-1" />
        Edit
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleMarkAsRead}
        title="Mark as read (Ctrl+M)"
        aria-label="Mark as read"
      >
        <Check className="h-4 w-4 mr-1" />
        Mark Read
      </Button>
    </div>
  )
}
