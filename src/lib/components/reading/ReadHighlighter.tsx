import { useMemo, memo } from 'react'
import { openUrl } from '@tauri-apps/plugin-opener'
import type { ReadRange, ExcludedRange } from '../../types'

interface ReadHighlighterProps {
  content: string
  readRanges: ReadRange[]
  className?: string
  onExcludedRangesParsed?: (excludedRanges: ExcludedRange[]) => void
  linksEnabled?: boolean
  searchMatches?: Array<{ start: number; end: number }>
  activeSearchIndex?: number
}

interface TextSegment {
  text: string
  isRead: boolean
  isAutoCompleted: boolean
  isExcluded: boolean
  isHeader: boolean
  start: number
  end: number
  isSearchMatch?: boolean
  isActiveSearchMatch?: boolean
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

function parseMarkdownLink(text: string, startIndex: number): { linkText: string; url: string; endIndex: number } | null {
  // Manual parser for markdown links to handle URLs with parentheses and hashtags
  // Handles: [text](url) where url can contain () and # like https://wiki.com/Name_(disambiguation)#section
  // Also handles link text with brackets like [[text]](url)

  if (text[startIndex] !== '[') return null

  // Find the closing ]( for link text - we need to find ] followed by (
  // This allows brackets within the link text itself
  let i = startIndex + 1
  let linkText = ''
  let foundEnd = false

  while (i < text.length) {
    if (text[i] === ']' && i + 1 < text.length && text[i + 1] === '(') {
      // Found the end of link text: ](
      // Note: We don't include this final ] in linkText - it's the closing bracket of the markdown syntax
      foundEnd = true
      i++ // skip the ]
      break
    }
    linkText += text[i]
    i++
  }

  if (!foundEnd || i >= text.length || text[i] !== '(') return null
  i++ // skip (

  // Parse URL - match everything until ) that's followed by non-URL characters
  // URLs can contain () and # so we need to be smart about finding the closing )
  let url = ''
  let parenDepth = 0

  while (i < text.length) {
    if (text[i] === '(') {
      parenDepth++
      url += text[i]
      i++
    } else if (text[i] === ')') {
      if (parenDepth > 0) {
        // This ) is part of the URL (closing a ( within the URL)
        parenDepth--
        url += text[i]
        i++
      } else {
        // This ) closes the markdown link
        break
      }
    } else {
      url += text[i]
      i++
    }
  }

  if (i >= text.length || text[i] !== ')') return null
  i++ // skip )

  return { linkText, url, endIndex: i }
}

function renderTextWithLinks(text: string, linksEnabled: boolean): string {
  const formattedText = formatWikipediaHeaders(text)

  // Remove empty markdown links: [](...)
  let textWithoutEmptyLinks = formattedText.replace(/\[\]\([^\)]+\)/g, '')

  if (!linksEnabled) {
    // Extract link text from markdown links
    let result = ''
    let i = 0
    while (i < textWithoutEmptyLinks.length) {
      const linkInfo = parseMarkdownLink(textWithoutEmptyLinks, i)
      if (linkInfo) {
        result += linkInfo.linkText
        i = linkInfo.endIndex
      } else {
        result += textWithoutEmptyLinks[i]
        i++
      }
    }
    return result
  }

  // Process markdown links with support for URLs containing parentheses and hashtags
  let processed = ''
  let i = 0
  while (i < textWithoutEmptyLinks.length) {
    const linkInfo = parseMarkdownLink(textWithoutEmptyLinks, i)
    if (linkInfo) {
      processed += `<a href="${linkInfo.url}" class="clickable-link" data-url="${linkInfo.url}">${linkInfo.linkText}</a>`
      i = linkInfo.endIndex
    } else {
      processed += textWithoutEmptyLinks[i]
      i++
    }
  }

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

  // Remove markdown link syntax but keep link text, using the parser
  let result = ''
  let i = 0
  while (i < stripped.length) {
    const linkInfo = parseMarkdownLink(stripped, i)
    if (linkInfo) {
      result += linkInfo.linkText
      i = linkInfo.endIndex
    } else {
      result += stripped[i]
      i++
    }
  }

  // Remove header syntax === Text === → Text to match DOM textContent
  // This must match what formatWikipediaHeaders does (removes === markers, keeps text)
  result = result.replace(/^={2,}\s*(.+?)\s*={2,}$/gm, '$1')
  return result
}

/**
 * Convert position from rendered space to cleaned space
 *
 * Position Spaces:
 * - RENDERED: What you see in DOM textContent (no markdown, no HTML)
 * - CLEANED: Content with markdown syntax but without [[exclude]] tags
 *
 * @param renderedPos - Position in rendered space (from DOM selection)
 * @param cleanedContent - The cleaned content string (with markdown)
 * @returns Position in cleaned space
 */
export function renderedPosToCleanedPos(renderedPos: number, cleanedContent: string): number {
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
    // Check if we're at a markdown link start - use parseMarkdownLink to handle brackets in link text
    const linkInfo = parseMarkdownLink(cleanedContent, cleanedIdx)
    if (linkInfo) {
      const linkText = linkInfo.linkText
      const fullLinkLength = linkInfo.endIndex - cleanedIdx

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

/**
 * Parse text content and remove [[exclude]] tags
 *
 * @param content - Original content with potential [[exclude]] tags and markdown
 * @returns Object with cleanedContent (no exclude tags, has markdown) and renderedContent (no markdown)
 */
export function parseExcludedRanges(content: string): {
  cleanedContent: string;
  renderedContent: string;
  excludedRanges: ExcludedRange[]
} {
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

const ReadHighlighterComponent = ({
  content,
  readRanges,
  className,
  linksEnabled = false,
  searchMatches = [],
  activeSearchIndex = -1
}: ReadHighlighterProps) => {
  const segments = useMemo(() => {
    const { cleanedContent, excludedRanges } = parseExcludedRanges(content)
    const headerRanges = detectHeaderRanges(cleanedContent)

    if (!readRanges.length && !excludedRanges.length) {
      return [{ text: cleanedContent, isRead: false, isAutoCompleted: false, isExcluded: false, isHeader: false, start: 0, end: cleanedContent.length }]
    }

    // Convert read ranges from rendered space to cleaned space, preserving isAutoCompleted flag
    const convertedReadRanges = readRanges.map(r => ({
      startPosition: renderedPosToCleanedPos(r.startPosition, cleanedContent),
      endPosition: renderedPosToCleanedPos(r.endPosition, cleanedContent),
      isAutoCompleted: r.isAutoCompleted
    }))

    // Convert excluded ranges from rendered space to cleaned space
    const convertedExcludedRanges = excludedRanges.map(r => ({
      startPosition: renderedPosToCleanedPos(r.startPosition, cleanedContent),
      endPosition: renderedPosToCleanedPos(r.endPosition, cleanedContent)
    }))

    const sortedReadRanges = [...convertedReadRanges].sort((a, b) => a.startPosition - b.startPosition)
    const sortedExcludedRanges = [...convertedExcludedRanges].sort((a, b) => a.startPosition - b.startPosition)

    const mergedReadRanges: Array<{ start: number; end: number; isAutoCompleted: boolean }> = []
    for (const range of sortedReadRanges) {
      if (mergedReadRanges.length === 0) {
        mergedReadRanges.push({ start: range.startPosition, end: range.endPosition, isAutoCompleted: range.isAutoCompleted })
      } else {
        const last = mergedReadRanges[mergedReadRanges.length - 1]
        if (range.startPosition <= last.end) {
          last.end = Math.max(last.end, range.endPosition)
          // If merging with an auto-completed range, preserve that flag
          last.isAutoCompleted = last.isAutoCompleted || range.isAutoCompleted
        } else {
          mergedReadRanges.push({ start: range.startPosition, end: range.endPosition, isAutoCompleted: range.isAutoCompleted })
        }
      }
    }

    const allRanges: Array<{ start: number; end: number; type: 'read' | 'excluded'; isAutoCompleted?: boolean }> = [
      ...mergedReadRanges.map(r => ({ start: r.start, end: r.end, type: 'read' as const, isAutoCompleted: r.isAutoCompleted })),
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
          isAutoCompleted: false,
          isExcluded: false,
          isHeader,
          start: currentPos,
          end: range.start
        })
      }

      const text = cleanedContent.substring(range.start, range.end)
      const isHeader = isPositionInHeader(range.start, headerRanges)
      result.push({
        text,
        isRead: range.type === 'read',
        isAutoCompleted: range.isAutoCompleted || false,
        isExcluded: range.type === 'excluded',
        isHeader,
        start: range.start,
        end: range.end
      })

      currentPos = range.end
    }

    if (currentPos < cleanedContent.length) {
      const text = cleanedContent.substring(currentPos)
      const isHeader = isPositionInHeader(currentPos, headerRanges)
      result.push({
        text,
        isRead: false,
        isAutoCompleted: false,
        isExcluded: false,
        isHeader,
        start: currentPos,
        end: cleanedContent.length
      })
    }

    return result
  }, [content, readRanges])

  const convertedSearchMatches = useMemo(() => {
    if (searchMatches.length === 0) return []
    const { cleanedContent } = parseExcludedRanges(content)
    return searchMatches.map(match => ({
      start: renderedPosToCleanedPos(match.start, cleanedContent),
      end: renderedPosToCleanedPos(match.end, cleanedContent)
    }))
  }, [searchMatches, content])

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

  // Split segments into sub-segments based on search matches
  const renderableSegments = useMemo(() => {
    if (convertedSearchMatches.length === 0) {
      return segments.map((seg, idx) => ({ ...seg, key: `seg-${idx}` }))
    }

    const result: Array<TextSegment & { key: string; isSearchMatch?: boolean; isActiveSearchMatch?: boolean }> = []

    segments.forEach((segment, segIdx) => {
      // Find search matches that overlap with this segment
      const overlappingMatches = convertedSearchMatches
        .map((match, matchIdx) => ({ ...match, matchIdx }))
        .filter(match => segment.start < match.end && segment.end > match.start)
        .sort((a, b) => a.start - b.start)

      if (overlappingMatches.length === 0) {
        // No search matches in this segment - render it as-is
        result.push({ ...segment, key: `seg-${segIdx}` })
        return
      }

      // Split segment into sub-segments around search matches
      let currentPos = segment.start

      overlappingMatches.forEach((match, matchSubIdx) => {
        const matchStart = Math.max(match.start, segment.start)
        const matchEnd = Math.min(match.end, segment.end)

        // Add sub-segment before the match (if any)
        if (currentPos < matchStart) {
          const text = segment.text.substring(currentPos - segment.start, matchStart - segment.start)
          result.push({
            ...segment,
            text,
            start: currentPos,
            end: matchStart,
            key: `seg-${segIdx}-pre-${matchSubIdx}`,
            isSearchMatch: false,
            isActiveSearchMatch: false
          })
        }

        // Add the match itself as a sub-segment
        const matchText = segment.text.substring(matchStart - segment.start, matchEnd - segment.start)
        result.push({
          ...segment,
          text: matchText,
          start: matchStart,
          end: matchEnd,
          key: `seg-${segIdx}-match-${matchSubIdx}`,
          isSearchMatch: true,
          isActiveSearchMatch: match.matchIdx === activeSearchIndex
        })

        currentPos = matchEnd
      })

      // Add remaining sub-segment after last match (if any)
      if (currentPos < segment.end) {
        const text = segment.text.substring(currentPos - segment.start)
        result.push({
          ...segment,
          text,
          start: currentPos,
          end: segment.end,
          key: `seg-${segIdx}-post`,
          isSearchMatch: false,
          isActiveSearchMatch: false
        })
      }
    })

    return result
  }, [segments, convertedSearchMatches, activeSearchIndex])

  return (
    <div
      id="article-content"
      className={`whitespace-pre-wrap not-prose ${className || ''}`}
      onClick={handleClick}
    >
      {renderableSegments.map((segment) => {
        const classNames: string[] = []
        let style: React.CSSProperties = {}

        // Apply base styling (read/excluded/header)
        if (segment.isExcluded) {
          classNames.push('excluded-text')
        } else if (segment.isRead && segment.isHeader) {
          classNames.push('read-header')
        } else if (segment.isRead) {
          if (segment.isAutoCompleted) {
            // Auto-completed ranges use lighter/dimmer styling to indicate user may not have read it
            classNames.push('bg-gray-400', 'text-gray-700', 'dark:bg-gray-600', 'dark:text-gray-300', 'inline', 'opacity-70')
          } else {
            // Manual marks use solid black/white styling
            classNames.push('bg-black', 'text-white', 'dark:bg-gray-700', 'dark:text-gray-100', 'inline')
          }
        }

        // Apply search highlighting - overrides base styling for matched text only
        if (segment.isActiveSearchMatch) {
          style = { backgroundColor: '#fed7aa', color: 'black' }
        } else if (segment.isSearchMatch) {
          style = { backgroundColor: '#fef08a', color: 'black' }
        }

        return (
          <span
            key={segment.key}
            className={classNames.join(' ')}
            style={Object.keys(style).length > 0 ? style : undefined}
            data-search-index={segment.isActiveSearchMatch ? activeSearchIndex : undefined}
            dangerouslySetInnerHTML={{ __html: renderTextWithLinks(segment.text, linksEnabled) }}
          />
        )
      })}
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders
// Only re-renders when props actually change
export const ReadHighlighter = memo(ReadHighlighterComponent)
