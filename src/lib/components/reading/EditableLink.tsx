import { useRef, useEffect } from 'react'
import { openUrl } from '@tauri-apps/plugin-opener'

interface EditableLinkProps {
  text: string
  url: string
  isEditable: boolean
  sourcePosition: { start: number; end: number }
  onLinkTextChange: (newText: string, sourcePosition: { start: number; end: number }) => void
  onNavigateToIngest?: (url: string) => void
}

export function EditableLink({
  text,
  url,
  isEditable,
  sourcePosition,
  onLinkTextChange,
  onNavigateToIngest
}: EditableLinkProps) {
  const spanRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (spanRef.current && spanRef.current.textContent !== text) {
      spanRef.current.textContent = text
    }
  }, [text])

  const handleInput = (e: React.FormEvent<HTMLSpanElement>) => {
    const newText = e.currentTarget.textContent || ''
    onLinkTextChange(newText, sourcePosition)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLSpanElement>) => {
    e.preventDefault()
    const plainText = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, plainText)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (e.altKey && onNavigateToIngest) {
      onNavigateToIngest(url)
    } else if (!isEditable) {
      openUrl(url).catch((error: Error) => {
        console.error('Failed to open URL:', error)
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.altKey && e.key === 'Enter' && onNavigateToIngest) {
      e.preventDefault()
      onNavigateToIngest(url)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (spanRef.current) {
        spanRef.current.blur()
      }
    }
  }

  if (isEditable) {
    return (
      <span
        ref={spanRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        className="clickable-link editable-link"
        style={{
          textDecorationStyle: 'dotted',
          outline: 'none'
        }}
        suppressContentEditableWarning
      >
        {text}
      </span>
    )
  }

  return (
    <a
      href={url}
      className="clickable-link"
      data-url={url}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {text}
    </a>
  )
}
