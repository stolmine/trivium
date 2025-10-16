import { useMemo } from 'react'
import { openUrl } from '@tauri-apps/plugin-opener'
import type { ReadRange, ExcludedRange } from '../../types'

interface ReadHighlighterProps {
  content: string
  readRanges: ReadRange[]
  className?: string
  onExcludedRangesParsed?: (excludedRanges: ExcludedRange[]) => void
  linksEnabled?: boolean
}

interface TextSegment {
  text: string
  isRead: boolean
  isExcluded: boolean
  isHeader: boolean
}

function formatWikipediaHeaders(text: string): string {
  const lines = text.split('\n')
  const formattedLines = lines.map(line => {
    const trimmedLine = line.trim()
    // Use simple pattern without backreference for consistency
    const headerMatch = trimmedLine.match(/^={2,}\s*(.+?)\s*={2,}$/)

    if (headerMatch) {
      const headerText = headerMatch[1].trim()
      return line.replace(trimmedLine, `<strong>${headerText}</strong>`)
    }

    return line
  })

  return formattedLines.join('\n')
}

function renderTextWithLinks(text: string, linksEnabled: boolean): string {
  const formattedText = formatWikipediaHeaders(text)

  let textWithoutEmptyLinks = formattedText.replace(/\[\]\([^\)]+\)/g, '')

  if (!linksEnabled) {
    return textWithoutEmptyLinks.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
  }

  let processed = textWithoutEmptyLinks.replace(/\[([^\]]+)\]\(([^\)]+)\)/g,
    '<a href="$2" class="clickable-link" data-url="$2">$1</a>'
  )

  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g
  const processedUrls = new Set<string>()

  processed = processed.replace(/data-url="([^"]+)"/g, (match, url) => {
    processedUrls.add(url)
    return match
  })

  processed = processed.replace(urlRegex, (url) => {
    if (processedUrls.has(url)) {
      return url
    }
    return `<a href="${url}" class="clickable-link" data-url="${url}">${url}</a>`
  })

  return processed
}

function stripMarkdownLinks(text: string): string {
  // Remove empty markdown links
  let stripped = text.replace(/\[\]\([^\)]+\)/g, '')
  // Remove markdown link syntax but keep link text
  stripped = stripped.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
  // Remove header syntax === Text === → Text to match DOM textContent
  // This must match what formatWikipediaHeaders does (removes === markers, keeps text)
  stripped = stripped.replace(/^={2,}\s*(.+?)\s*={2,}$/gm, '$1')
  return stripped
}

// Convert a position in rendered space (no markdown) to cleaned space (with markdown)
function renderedPosToCleanedPos(renderedPos: number, cleanedContent: string): number {
  // Use stripMarkdownLinks to get the rendered version (strips both links and headers)
  const renderedContent = stripMarkdownLinks(cleanedContent)

  // If position is beyond rendered content, clamp it
  if (renderedPos >= renderedContent.length) {
    return cleanedContent.length
  }

  // Build a mapping by walking through both strings simultaneously
  let renderedIdx = 0
  let cleanedIdx = 0

  while (renderedIdx < renderedPos && cleanedIdx < cleanedContent.length) {
    // Check if we're at a markdown link start
    const linkMatch = cleanedContent.substring(cleanedIdx).match(/^\[([^\]]+)\]\([^\)]+\)/)
    if (linkMatch) {
      const linkText = linkMatch[1]
      const fullLinkLength = linkMatch[0].length

      // The link renders as just the link text
      if (renderedIdx + linkText.length <= renderedPos) {
        // Skip the whole link
        renderedIdx += linkText.length
        cleanedIdx += fullLinkLength
      } else {
        // Position is within this link text
        const offsetInLink = renderedPos - renderedIdx
        return cleanedIdx + 1 + offsetInLink // +1 for the opening [
      }
      continue
    }

    // Check if we're at an empty link
    const emptyLinkMatch = cleanedContent.substring(cleanedIdx).match(/^\[\]\([^\)]+\)/)
    if (emptyLinkMatch) {
      // Empty links are removed entirely in rendered content
      cleanedIdx += emptyLinkMatch[0].length
      continue
    }

    // Check if we're at a header start
    const headerMatch = cleanedContent.substring(cleanedIdx).match(/^={2,}\s*(.+?)\s*={2,}(?=\n|$)/)
    if (headerMatch) {
      const headerText = headerMatch[1].trim()
      const fullHeaderLength = headerMatch[0].length

      // The header renders as just the header text (trimmed)
      if (renderedIdx + headerText.length <= renderedPos) {
        // Skip the whole header
        renderedIdx += headerText.length
        cleanedIdx += fullHeaderLength
      } else {
        // Position is within header text
        // Find where the actual text starts (after leading = and spaces)
        const leadingMatch = cleanedContent.substring(cleanedIdx).match(/^={2,}\s*/)
        const leadingLength = leadingMatch ? leadingMatch[0].length : 0
        const offsetInHeader = renderedPos - renderedIdx
        return cleanedIdx + leadingLength + offsetInHeader
      }
      continue
    }

    // Regular character - advance both pointers
    renderedIdx++
    cleanedIdx++
  }

  return cleanedIdx
}

export function parseExcludedRanges(content: string): {
  cleanedContent: string;
  renderedContent: string;
  excludedRanges: ExcludedRange[]
} {
  // DEBUG LOGGING
  console.log('parseExcludedRanges called with content length:', content.length)

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

  // Strip markdown links to get the rendered text content that DOM will show
  const renderedContent = stripMarkdownLinks(cleanedContent)

  // Adjust excluded ranges for rendered content
  const adjustedExcludedRanges = excludedRanges.map(range => {
    const textBeforeRange = cleanedContent.substring(0, range.startPosition)
    const rangeText = cleanedContent.substring(range.startPosition, range.endPosition)

    const renderedTextBefore = stripMarkdownLinks(textBeforeRange)
    const renderedRangeText = stripMarkdownLinks(rangeText)

    return {
      startPosition: renderedTextBefore.length,
      endPosition: renderedTextBefore.length + renderedRangeText.length
    }
  })

  console.log('parseExcludedRanges result:', {
    originalLength: content.length,
    cleanedLength: cleanedContent.length,
    renderedLength: renderedContent.length,
    excludedCount: excludedRanges.length,
    tagsRemoved: offset,
    lengthDifference: cleanedContent.length - renderedContent.length
  })

  return { cleanedContent, renderedContent, excludedRanges: adjustedExcludedRanges }
}

interface HeaderRange {
  startPosition: number
  endPosition: number
}

function detectHeaderRanges(content: string): HeaderRange[] {
  const headerRanges: HeaderRange[] = []
  // Use simple pattern without backreference to match stripMarkdownLinks
  const regex = /^={2,}\s*(.+?)\s*={2,}$/gm
  let match

  while ((match = regex.exec(content)) !== null) {
    headerRanges.push({
      startPosition: match.index,
      endPosition: match.index + match[0].length
    })
  }

  return headerRanges
}

function isPositionInHeader(position: number, headerRanges: HeaderRange[]): boolean {
  return headerRanges.some(
    header => position >= header.startPosition && position < header.endPosition
  )
}

export function ReadHighlighter({ content, readRanges, className, linksEnabled = false }: ReadHighlighterProps) {
  const segments = useMemo(() => {
    const { cleanedContent, renderedContent, excludedRanges } = parseExcludedRanges(content)
    const headerRanges = detectHeaderRanges(cleanedContent)

    // DEBUG LOGGING
    console.log('=== ReadHighlighter: useMemo computation ===')
    console.log('Original content length:', content.length)
    console.log('Cleaned content length:', cleanedContent.length)
    console.log('Rendered content length:', renderedContent.length)
    console.log('Excluded ranges (adjusted for rendered):', excludedRanges)
    console.log('Read ranges to apply (in rendered space):', readRanges.map(r => ({
      start: r.startPosition,
      end: r.endPosition,
      length: r.endPosition - r.startPosition,
      text: renderedContent.substring(r.startPosition, r.endPosition).substring(0, 50) + '...'
    })))
    console.log('============================================')

    if (!readRanges.length && !excludedRanges.length) {
      return [{ text: cleanedContent, isRead: false, isExcluded: false, isHeader: false }]
    }

    // Convert read ranges from rendered space to cleaned space
    const convertedReadRanges = readRanges.map(r => ({
      startPosition: renderedPosToCleanedPos(r.startPosition, cleanedContent),
      endPosition: renderedPosToCleanedPos(r.endPosition, cleanedContent)
    }))

    // Convert excluded ranges from rendered space to cleaned space
    const convertedExcludedRanges = excludedRanges.map(r => ({
      startPosition: renderedPosToCleanedPos(r.startPosition, cleanedContent),
      endPosition: renderedPosToCleanedPos(r.endPosition, cleanedContent)
    }))

    const sortedReadRanges = [...convertedReadRanges].sort((a, b) => a.startPosition - b.startPosition)
    const sortedExcludedRanges = [...convertedExcludedRanges].sort((a, b) => a.startPosition - b.startPosition)

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

    // Use converted positions with cleanedContent (which has markdown)
    const result: TextSegment[] = []
    let currentPos = 0

    for (const range of allRanges) {
      if (currentPos < range.start) {
        const text = cleanedContent.substring(currentPos, range.start)
        const isHeader = isPositionInHeader(currentPos, headerRanges)
        result.push({
          text,
          isRead: false,
          isExcluded: false,
          isHeader
        })
      }

      const text = cleanedContent.substring(range.start, range.end)
      const isHeader = isPositionInHeader(range.start, headerRanges)
      result.push({
        text,
        isRead: range.type === 'read',
        isExcluded: range.type === 'excluded',
        isHeader
      })

      currentPos = range.end
    }

    if (currentPos < cleanedContent.length) {
      const text = cleanedContent.substring(currentPos)
      const isHeader = isPositionInHeader(currentPos, headerRanges)
      result.push({
        text,
        isRead: false,
        isExcluded: false,
        isHeader
      })
    }

    console.log('Segments created (in cleaned space):', result.map((s, idx) => ({
      index: idx,
      isRead: s.isRead,
      isExcluded: s.isExcluded,
      textSample: s.text.substring(0, 30) + '...'
    })))

    return result
  }, [content, readRanges])

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'A' && target.classList.contains('clickable-link')) {
      e.preventDefault()
      const url = target.getAttribute('data-url')
      if (url) {
        openUrl(url).catch((error: Error) => {
          console.error('Failed to open URL:', error)
        })
      }
    }
  }

  return (
    <div
      id="article-content"
      className={`whitespace-pre-wrap not-prose ${className || ''}`}
      onClick={handleClick}
    >
      {segments.map((segment, idx) => {
        let className = ''
        let style = {}

        if (segment.isExcluded) {
          className = 'excluded-text'
        } else if (segment.isRead && segment.isHeader) {
          className = 'read-header'
        } else if (segment.isRead) {
          style = { backgroundColor: 'black', color: 'white' }
        }

        return (
          <span
            key={idx}
            className={className}
            style={style}
            dangerouslySetInnerHTML={{ __html: renderTextWithLinks(segment.text, linksEnabled) }}
          />
        )
      })}
    </div>
  )
}
