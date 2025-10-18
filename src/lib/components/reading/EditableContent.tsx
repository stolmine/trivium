import { useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import type { Root } from 'mdast'
import type { ClozeNote } from '../../types'
import { MarkdownRenderer } from './MarkdownRenderer'
import { cn } from '../../utils'
import { getTextContent } from '../../utils/domPosition'

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
  const divRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastPropsMarkdownRef = useRef<string>(markdown)

  useLayoutEffect(() => {
    if (!divRef.current) return

    const currentContent = getTextContent(divRef.current)
    if (currentContent !== markdown && markdown !== lastPropsMarkdownRef.current) {
      divRef.current.textContent = markdown
    }
    lastPropsMarkdownRef.current = markdown
  }, [markdown])

  const handleContentChange = useCallback((newMarkdown: string) => {
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
        markdown={markdown}
        onTextEdit={handleContentChange}
        editableRange={editableRange}
        marks={marks}
        mode={mode}
        suppressMarkHighlighting={true}
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
      {markdown}
    </div>
  )
}
