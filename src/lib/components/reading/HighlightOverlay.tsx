import { useMemo } from 'react'

export interface Highlight {
  start: number
  end: number
  type: 'read' | 'mark' | 'search'
  color: string
  zIndex?: number
}

export interface HighlightOverlayProps {
  text: string
  highlights: Highlight[]
  containerRef?: React.RefObject<HTMLElement>
  fontSize?: number
}

interface TextSegment {
  text: string
  highlight?: Highlight
}

export function HighlightOverlay({ text, highlights }: HighlightOverlayProps) {
  console.log('[HighlightOverlay] Render:', {
    textLength: text.length,
    textPreview: text.substring(0, 100) + '...',
    highlightCount: highlights.length,
    highlights: highlights.map(h => ({
      type: h.type,
      start: h.start,
      end: h.end,
      length: h.end - h.start,
      color: h.color
    }))
  });

  const segments = useMemo(() => {
    console.log('[HighlightOverlay] Computing segments');
    if (highlights.length === 0) {
      return [{ text }]
    }

    const sorted = [...highlights].sort((a, b) => {
      if (a.start !== b.start) {
        return a.start - b.start
      }
      return (a.zIndex || 0) - (b.zIndex || 0)
    })

    const result: TextSegment[] = []
    let pos = 0

    for (const highlight of sorted) {
      const clampedStart = Math.max(0, Math.min(highlight.start, text.length))
      const clampedEnd = Math.max(clampedStart, Math.min(highlight.end, text.length))

      if (pos < clampedStart) {
        result.push({ text: text.substring(pos, clampedStart) })
      }

      if (clampedStart < clampedEnd) {
        result.push({
          text: text.substring(clampedStart, clampedEnd),
          highlight
        })
      }

      pos = clampedEnd
    }

    if (pos < text.length) {
      result.push({ text: text.substring(pos) })
    }

    console.log('[HighlightOverlay] Computed segments:', {
      segmentCount: result.length,
      segments: result.map(s => ({
        textLength: s.text.length,
        textPreview: s.text.substring(0, 20),
        hasHighlight: !!s.highlight,
        highlightType: s.highlight?.type
      }))
    });

    return result
  }, [text, highlights])

  return (
    <div className="relative">
      {segments.map((segment, index) => {
        if (segment.highlight) {
          const style: React.CSSProperties = {
            backgroundColor: segment.highlight.color,
            padding: 0,
            border: 'none',
            borderRadius: '2px',
            position: 'relative',
            zIndex: segment.highlight.zIndex || 0
          }

          return (
            <mark
              key={index}
              style={style}
            >
              {segment.text}
            </mark>
          )
        }

        return <span key={index}>{segment.text}</span>
      })}
    </div>
  )
}
