import { useMemo, memo, useRef, useLayoutEffect } from 'react'
import type { Root, RootContent, Paragraph, Text, Link, PhrasingContent } from 'mdast'
import type { ClozeNote } from '../../types'
import { EditableLink } from './EditableLink'
import { updateLinkText, replaceTextAtPosition } from '../../utils/markdownEdit'
import { getAbsolutePosition, setSelectionRange } from '../../utils/domPosition'

interface MarkdownRendererProps {
  ast: Root
  markdown: string
  onTextEdit: (newMarkdown: string) => void
  editableRange?: { start: number; end: number }
  marks?: ClozeNote[]
  mode: 'styled' | 'literal'
  suppressMarkHighlighting?: boolean
}

interface PositionInfo {
  start: number
  end: number
}

function getNodePosition(node: RootContent): PositionInfo | null {
  if (node.position) {
    return {
      start: node.position.start.offset || 0,
      end: node.position.end.offset || 0
    }
  }
  return null
}

function isNodeEditable(
  node: RootContent,
  editableRange?: { start: number; end: number }
): boolean {
  if (!editableRange) return false
  const position = getNodePosition(node)
  if (!position) return false

  return position.start >= editableRange.start && position.end <= editableRange.end
}

function getMarkAtPosition(
  position: number,
  marks?: ClozeNote[]
): ClozeNote | null {
  if (!marks) return null

  return marks.find(
    mark => position >= mark.startPosition && position < mark.endPosition
  ) || null
}

function renderTextNode(
  node: Text,
  isEditable: boolean,
  marks: ClozeNote[] | undefined,
  markdown: string,
  onTextEdit: (newMarkdown: string) => void,
  key: string,
  cursorPosRef: React.MutableRefObject<number | null>,
  containerRef: React.MutableRefObject<HTMLDivElement | null>,
  suppressMarkHighlighting?: boolean
) {
  const position = getNodePosition(node)
  if (!position) {
    return <span key={key}>{node.value}</span>
  }

  const mark = getMarkAtPosition(position.start, marks)
  const backgroundColor = (mark && !suppressMarkHighlighting) ? '#fef08a' : undefined

  // Trim trailing newlines from text node to prevent visual selection extending beyond paragraph
  // The markdown source includes trailing \n\n after paragraphs, but we don't want these to be
  // visually selectable as they create invisible space that extends selection highlighting
  const displayValue = node.value.replace(/\n+$/, '')

  if (isEditable) {
    return (
      <span
        key={key}
        contentEditable
        suppressContentEditableWarning
        style={{
          backgroundColor,
          outline: 'none'
        }}
        onInput={(e) => {
          if (containerRef.current) {
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0)
              cursorPosRef.current = getAbsolutePosition(
                containerRef.current,
                range.startContainer,
                range.startOffset
              )
            }
          }
          const newText = e.currentTarget.textContent || ''
          const updatedMarkdown = replaceTextAtPosition(
            markdown,
            position,
            newText
          )
          onTextEdit(updatedMarkdown)
        }}
        onPaste={(e) => {
          e.preventDefault()
          const text = e.clipboardData.getData('text/plain')
          document.execCommand('insertText', false, text)
        }}
      >
        {displayValue}
      </span>
    )
  }

  return (
    <span key={key} style={{ backgroundColor }}>
      {displayValue}
    </span>
  )
}

function renderLinkNode(
  node: Link,
  isEditable: boolean,
  marks: ClozeNote[] | undefined,
  markdown: string,
  onTextEdit: (newMarkdown: string) => void,
  key: string,
  suppressMarkHighlighting?: boolean
) {
  const position = getNodePosition(node)
  if (!position) {
    return <span key={key}>[link error]</span>
  }

  const textNode = node.children[0]
  const linkText = textNode && textNode.type === 'text' ? textNode.value : ''
  const mark = getMarkAtPosition(position.start, marks)

  const handleLinkTextChange = (newText: string) => {
    const updatedMarkdown = updateLinkText(markdown, position, newText)
    onTextEdit(updatedMarkdown)
  }

  return (
    <span key={key} style={{ backgroundColor: (mark && !suppressMarkHighlighting) ? '#fef08a' : undefined }}>
      <EditableLink
        text={linkText}
        url={node.url}
        isEditable={isEditable}
        sourcePosition={position}
        onLinkTextChange={handleLinkTextChange}
      />
    </span>
  )
}

function renderParagraphNode(
  node: Paragraph,
  editableRange: { start: number; end: number } | undefined,
  marks: ClozeNote[] | undefined,
  markdown: string,
  onTextEdit: (newMarkdown: string) => void,
  key: string,
  cursorPosRef: React.MutableRefObject<number | null>,
  containerRef: React.MutableRefObject<HTMLDivElement | null>,
  suppressMarkHighlighting?: boolean
) {
  const isEditable = isNodeEditable(node, editableRange)

  return (
    <p key={key} className="mb-4">
      {node.children.map((child: PhrasingContent, idx: number) => {
        const childKey = `${key}-child-${idx}`

        if (child.type === 'text') {
          return renderTextNode(
            child,
            isEditable,
            marks,
            markdown,
            onTextEdit,
            childKey,
            cursorPosRef,
            containerRef,
            suppressMarkHighlighting
          )
        }

        if (child.type === 'link') {
          return renderLinkNode(
            child,
            isEditable,
            marks,
            markdown,
            onTextEdit,
            childKey,
            suppressMarkHighlighting
          )
        }

        return <span key={childKey}>[unsupported: {child.type}]</span>
      })}
    </p>
  )
}

const MarkdownRendererComponent = ({
  ast,
  markdown,
  onTextEdit,
  editableRange,
  marks,
  mode,
  suppressMarkHighlighting
}: MarkdownRendererProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cursorPosRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (cursorPosRef.current !== null && containerRef.current) {
      setSelectionRange(containerRef.current, cursorPosRef.current, cursorPosRef.current)
      cursorPosRef.current = null
    }
  }, [markdown])

  const renderedContent = useMemo(() => {
    if (!ast.children || ast.children.length === 0) {
      return <div className="text-muted-foreground">Empty content</div>
    }

    return ast.children.map((node: RootContent, idx: number) => {
      const nodeKey = `node-${idx}`

      if (node.type === 'paragraph') {
        return renderParagraphNode(
          node,
          editableRange,
          marks,
          markdown,
          onTextEdit,
          nodeKey,
          cursorPosRef,
          containerRef,
          suppressMarkHighlighting
        )
      }

      if (node.type === 'text') {
        const isEditable = isNodeEditable(node, editableRange)
        return renderTextNode(
          node,
          isEditable,
          marks,
          markdown,
          onTextEdit,
          nodeKey,
          cursorPosRef,
          containerRef,
          suppressMarkHighlighting
        )
      }

      return <div key={nodeKey}>[unsupported: {node.type}]</div>
    })
  }, [ast, markdown, editableRange, marks, mode, onTextEdit, suppressMarkHighlighting])

  return (
    <div
      ref={containerRef}
      className="whitespace-pre-wrap not-prose"
      style={{
        fontFamily: 'Charter, Georgia, serif',
        fontSize: '1.25rem',
        lineHeight: 1.7
      }}
    >
      {renderedContent}
    </div>
  )
}

export const MarkdownRenderer = memo(MarkdownRendererComponent)
