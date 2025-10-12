import { useMemo } from 'react'
import { cn } from '../../utils'
import type { ReadRange } from '../../types'

interface ReadHighlighterProps {
  content: string
  readRanges: ReadRange[]
  className?: string
}

interface TextSegment {
  text: string
  isRead: boolean
}

export function ReadHighlighter({ content, readRanges, className }: ReadHighlighterProps) {
  const segments = useMemo(() => {
    if (!readRanges.length) {
      return [{ text: content, isRead: false }]
    }

    const sortedRanges = [...readRanges].sort((a, b) => a.startPosition - b.startPosition)
    const mergedRanges: Array<{ start: number; end: number }> = []

    for (const range of sortedRanges) {
      if (mergedRanges.length === 0) {
        mergedRanges.push({ start: range.startPosition, end: range.endPosition })
      } else {
        const last = mergedRanges[mergedRanges.length - 1]
        if (range.startPosition <= last.end) {
          last.end = Math.max(last.end, range.endPosition)
        } else {
          mergedRanges.push({ start: range.startPosition, end: range.endPosition })
        }
      }
    }

    const result: TextSegment[] = []
    let currentPos = 0

    for (const range of mergedRanges) {
      if (currentPos < range.start) {
        result.push({
          text: content.substring(currentPos, range.start),
          isRead: false
        })
      }

      result.push({
        text: content.substring(range.start, range.end),
        isRead: true
      })

      currentPos = range.end
    }

    if (currentPos < content.length) {
      result.push({
        text: content.substring(currentPos),
        isRead: false
      })
    }

    return result
  }, [content, readRanges])

  return (
    <div id="article-content" className={cn("whitespace-pre-wrap", className)}>
      {segments.map((segment, idx) => (
        <span
          key={idx}
          className={cn(
            segment.isRead
              ? "text-gray-400 dark:text-gray-600"
              : "text-gray-900 dark:text-gray-100"
          )}
        >
          {segment.text}
        </span>
      ))}
    </div>
  )
}
