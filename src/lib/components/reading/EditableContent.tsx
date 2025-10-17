import { useState, useRef, useCallback, useEffect } from 'react'
import type { Root } from 'mdast'
import type { ClozeNote } from '../../types'
import { MarkdownRenderer } from './MarkdownRenderer'
import { cn } from '../../utils'

interface EditableContentProps {
  mode: 'styled' | 'literal'
  markdown: string
  ast?: Root
  marks?: ClozeNote[]
  editableRange: { start: number; end: number }
  onContentChange: (newMarkdown: string) => void
}

export function EditableContent({
  mode,
  markdown,
  ast,
  marks,
  editableRange,
  onContentChange
}: EditableContentProps) {
  const [localMarkdown, setLocalMarkdown] = useState(markdown)
  const divRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setLocalMarkdown(markdown)
  }, [markdown])

  const handleContentChange = useCallback((newMarkdown: string) => {
    setLocalMarkdown(newMarkdown)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      onContentChange(newMarkdown)
    }, 300)
  }, [onContentChange])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  if (mode === 'styled' && ast) {
    return (
      <MarkdownRenderer
        ast={ast}
        markdown={localMarkdown}
        onTextEdit={handleContentChange}
        editableRange={editableRange}
        marks={marks}
        mode={mode}
      />
    )
  }

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newMarkdown = e.currentTarget.textContent || ''
    handleContentChange(newMarkdown)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && divRef.current) {
      divRef.current.blur()
    }
  }

  return (
    <div
      ref={divRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      className={cn(
        'whitespace-pre-wrap not-prose outline-none',
        'focus:ring-2 focus:ring-primary/20 focus:border-primary',
        'transition-all rounded px-2 py-1'
      )}
      style={{
        fontFamily: 'Charter, Georgia, serif',
        fontSize: '1.25rem',
        lineHeight: 1.7,
        minHeight: '2rem'
      }}
    >
      {localMarkdown}
    </div>
  )
}
