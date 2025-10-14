import { useMemo } from 'react'
import type { ReadRange, ExcludedRange } from '../../types'

interface ReadHighlighterProps {
  content: string
  readRanges: ReadRange[]
  className?: string
  onExcludedRangesParsed?: (excludedRanges: ExcludedRange[]) => void
}

interface TextSegment {
  text: string
  isRead: boolean
  isExcluded: boolean
}

export function parseExcludedRanges(content: string): { cleanedContent: string; excludedRanges: ExcludedRange[] } {
  const excludedRanges: ExcludedRange[] = []
  let cleanedContent = content
  let offset = 0

  const regex = /\[\[exclude\]\](.*?)\[\[\/exclude\]\]/gs
  let match

  while ((match = regex.exec(content)) !== null) {
    const startTag = '[[exclude]]'
    const endTag = '[[/exclude]]'
    const matchStart = match.index
    const matchEnd = matchStart + match[0].length

    excludedRanges.push({
      startPosition: matchStart - offset,
      endPosition: matchStart - offset + match[1].length
    })

    cleanedContent = cleanedContent.substring(0, matchStart - offset) +
                     match[1] +
                     cleanedContent.substring(matchEnd - offset)

    offset += startTag.length + endTag.length
  }

  return { cleanedContent, excludedRanges }
}

export function ReadHighlighter({ content, readRanges, className }: ReadHighlighterProps) {
  const segments = useMemo(() => {
    const { cleanedContent, excludedRanges } = parseExcludedRanges(content)

    if (!readRanges.length && !excludedRanges.length) {
      return [{ text: cleanedContent, isRead: false, isExcluded: false }]
    }

    const sortedReadRanges = [...readRanges].sort((a, b) => a.startPosition - b.startPosition)
    const sortedExcludedRanges = [...excludedRanges].sort((a, b) => a.startPosition - b.startPosition)

    const mergedReadRanges: Array<{ start: number; end: number }> = []
    for (const range of sortedReadRanges) {
      if (mergedReadRanges.length === 0) {
        mergedReadRanges.push({ start: range.startPosition, end: range.endPosition })
      } else {
        const last = mergedReadRanges[mergedReadRanges.length - 1]
        if (range.startPosition <= last.end) {
          last.end = Math.max(last.end, range.endPosition)
        } else {
          mergedReadRanges.push({ start: range.startPosition, end: range.endPosition })
        }
      }
    }

    const allRanges: Array<{ start: number; end: number; type: 'read' | 'excluded' }> = [
      ...mergedReadRanges.map(r => ({ start: r.start, end: r.end, type: 'read' as const })),
      ...sortedExcludedRanges.map(r => ({ start: r.startPosition, end: r.endPosition, type: 'excluded' as const }))
    ].sort((a, b) => a.start - b.start)

    const result: TextSegment[] = []
    let currentPos = 0

    for (const range of allRanges) {
      if (currentPos < range.start) {
        result.push({
          text: cleanedContent.substring(currentPos, range.start),
          isRead: false,
          isExcluded: false
        })
      }

      result.push({
        text: cleanedContent.substring(range.start, range.end),
        isRead: range.type === 'read',
        isExcluded: range.type === 'excluded'
      })

      currentPos = range.end
    }

    if (currentPos < cleanedContent.length) {
      result.push({
        text: cleanedContent.substring(currentPos),
        isRead: false,
        isExcluded: false
      })
    }

    return result
  }, [content, readRanges])

  return (
    <div id="article-content" className={`whitespace-pre-wrap not-prose ${className || ''}`}>
      {segments.map((segment, idx) => (
        <span
          key={idx}
          className={segment.isExcluded ? 'excluded-text' : ''}
          style={segment.isRead ? { backgroundColor: 'black', color: 'white' } : {}}
        >
          {segment.text}
        </span>
      ))}
    </div>
  )
}
