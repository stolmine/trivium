import { useMemo, memo, Fragment } from 'react'
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
  onNavigateToIngest?: (url: string) => void
}

interface ParagraphSegment {
  text: string
  isRead: boolean
  isExcluded: boolean
  isHeader: boolean
  start: number
  end: number
  isSearchMatch?: boolean
  isActiveSearchMatch?: boolean
}

interface LinkMatch {
  type: 'markdown' | 'url'
  text: string
  url: string
  start: number
  end: number
}

function stripMarkdownLinks(text: string): string {
  let stripped = text.replace(/\[\]\([^\)]+\)/g, '')
  stripped = stripped.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
  stripped = stripped.replace(/^={2,}\s*(.+?)\s*={2,}$/gm, '$1')
  return stripped
}

export function renderedPosToCleanedPos(renderedPos: number, cleanedContent: string): number {
  const renderedContent = stripMarkdownLinks(cleanedContent)

  if (renderedPos >= renderedContent.length) {
    return cleanedContent.length
  }

  let renderedIdx = 0
  let cleanedIdx = 0

  while (renderedIdx < renderedPos && cleanedIdx < cleanedContent.length) {
    const linkMatch = cleanedContent.substring(cleanedIdx).match(/^\[([^\]]+)\]\([^\)]+\)/)
    if (linkMatch) {
      const linkText = linkMatch[1]
      const fullLinkLength = linkMatch[0].length

      if (renderedIdx + linkText.length <= renderedPos) {
        renderedIdx += linkText.length
        cleanedIdx += fullLinkLength
      } else {
        const offsetInLink = renderedPos - renderedIdx
        return cleanedIdx + 1 + offsetInLink
      }
      continue
    }

    const emptyLinkMatch = cleanedContent.substring(cleanedIdx).match(/^\[\]\([^\)]+\)/)
    if (emptyLinkMatch) {
      cleanedIdx += emptyLinkMatch[0].length
      continue
    }

    const headerMatch = cleanedContent.substring(cleanedIdx).match(/^={2,}\s*(.+?)\s*={2,}(?=\n|$)/)
    if (headerMatch) {
      const headerText = headerMatch[1].trim()
      const fullHeaderLength = headerMatch[0].length

      if (renderedIdx + headerText.length <= renderedPos) {
        renderedIdx += headerText.length
        cleanedIdx += fullHeaderLength
      } else {
        const leadingMatch = cleanedContent.substring(cleanedIdx).match(/^={2,}\s*/)
        const leadingLength = leadingMatch ? leadingMatch[0].length : 0
        const offsetInHeader = renderedPos - renderedIdx
        return cleanedIdx + leadingLength + offsetInHeader
      }
      continue
    }

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

  const renderedContent = stripMarkdownLinks(cleanedContent)

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

function parseLinksInText(text: string): LinkMatch[] {
  const links: LinkMatch[] = []

  const markdownLinkRegex = /\[([^\]]+)\]\(([^\)]+)\)/g
  let markdownMatch: RegExpExecArray | null

  while ((markdownMatch = markdownLinkRegex.exec(text)) !== null) {
    links.push({
      type: 'markdown',
      text: markdownMatch[1],
      url: markdownMatch[2],
      start: markdownMatch.index,
      end: markdownMatch.index + markdownMatch[0].length
    })
  }

  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g
  let urlMatch: RegExpExecArray | null

  while ((urlMatch = urlRegex.exec(text)) !== null) {
    const isInsideMarkdownLink = links.some(
      link => urlMatch!.index >= link.start && urlMatch!.index < link.end
    )

    if (!isInsideMarkdownLink) {
      links.push({
        type: 'url',
        text: urlMatch[0],
        url: urlMatch[0],
        start: urlMatch.index,
        end: urlMatch.index + urlMatch[0].length
      })
    }
  }

  links.sort((a, b) => a.start - b.start)

  return links
}

const ReadHighlighterComponent = ({
  content,
  readRanges,
  className,
  linksEnabled = false,
  searchMatches = [],
  activeSearchIndex = -1,
  onNavigateToIngest
}: ReadHighlighterProps) => {
  const paragraphSegments = useMemo(() => {
    console.log('[ReadHighlighter] Computing paragraphSegments with readRanges:', readRanges.length, readRanges);

    const { cleanedContent, excludedRanges } = parseExcludedRanges(content)
    console.log('[ReadHighlighter] cleanedContent length:', cleanedContent.length);

    // readRanges are already in RENDERED (DOM) space - no conversion needed!
    // With <p> structure, DOM textContent has NO \n\n separators
    // So we work directly with DOM positions throughout
    const sortedReadRanges = [...readRanges]
      .map(r => ({ start: r.startPosition, end: r.endPosition }))
      .sort((a, b) => a.start - b.start)

    console.log('[ReadHighlighter] sortedReadRanges:', sortedReadRanges);

    const sortedExcludedRanges = [...excludedRanges]
      .map(r => ({ start: r.startPosition, end: r.endPosition }))
      .sort((a, b) => a.start - b.start)

    const mergedReadRanges: Array<{ start: number; end: number }> = []
    for (const range of sortedReadRanges) {
      if (mergedReadRanges.length === 0) {
        mergedReadRanges.push({ start: range.start, end: range.end })
      } else {
        const last = mergedReadRanges[mergedReadRanges.length - 1]
        if (range.start <= last.end) {
          last.end = Math.max(last.end, range.end)
        } else {
          mergedReadRanges.push({ start: range.start, end: range.end })
        }
      }
    }

    const allRanges: Array<{ start: number; end: number; type: 'read' | 'excluded' }> = [
      ...mergedReadRanges.map(r => ({ start: r.start, end: r.end, type: 'read' as const })),
      ...sortedExcludedRanges.map(r => ({ start: r.start, end: r.end, type: 'excluded' as const }))
    ].sort((a, b) => a.start - b.start)

    const paragraphs = cleanedContent.split('\n\n')
    const result: Array<{ paragraphText: string; segments: ParagraphSegment[]; paragraphStart: number }> = []

    // Track positions in DOM space (NO \n\n separators between paragraphs)
    let currentPos = 0
    for (const paragraph of paragraphs) {
      if (paragraph.length === 0) {
        // Skip empty paragraphs without advancing position
        continue
      }

      const paragraphStart = currentPos
      const paragraphEnd = currentPos + paragraph.length

      // Detect headers within this paragraph (paragraph-relative positions)
      const paragraphHeaderRanges = detectHeaderRanges(paragraph)

      const relevantRanges = allRanges.filter(
        range => range.start < paragraphEnd && range.end > paragraphStart
      )

      const segments: ParagraphSegment[] = []
      let segmentPos = paragraphStart

      for (const range of relevantRanges) {
        const rangeStart = Math.max(range.start, paragraphStart)
        const rangeEnd = Math.min(range.end, paragraphEnd)

        if (segmentPos < rangeStart) {
          // Convert absolute DOM positions to paragraph-relative positions
          const relativeStart = segmentPos - paragraphStart
          const relativeEnd = rangeStart - paragraphStart
          const text = paragraph.substring(relativeStart, relativeEnd)
          const isHeader = isPositionInHeader(relativeStart, paragraphHeaderRanges)
          segments.push({
            text,
            isRead: false,
            isExcluded: false,
            isHeader,
            start: segmentPos,
            end: rangeStart
          })
        }

        // Convert absolute DOM positions to paragraph-relative positions
        const relativeStart = rangeStart - paragraphStart
        const relativeEnd = rangeEnd - paragraphStart
        const text = paragraph.substring(relativeStart, relativeEnd)
        const isHeader = isPositionInHeader(relativeStart, paragraphHeaderRanges)
        segments.push({
          text,
          isRead: range.type === 'read',
          isExcluded: range.type === 'excluded',
          isHeader,
          start: rangeStart,
          end: rangeEnd
        })

        segmentPos = rangeEnd
      }

      if (segmentPos < paragraphEnd) {
        // Convert absolute DOM positions to paragraph-relative positions
        const relativeStart = segmentPos - paragraphStart
        const relativeEnd = paragraphEnd - paragraphStart
        const text = paragraph.substring(relativeStart, relativeEnd)
        const isHeader = isPositionInHeader(relativeStart, paragraphHeaderRanges)
        segments.push({
          text,
          isRead: false,
          isExcluded: false,
          isHeader,
          start: segmentPos,
          end: paragraphEnd
        })
      }

      if (segments.length === 0) {
        const isHeader = isPositionInHeader(0, paragraphHeaderRanges)
        segments.push({
          text: paragraph,
          isRead: false,
          isExcluded: false,
          isHeader,
          start: paragraphStart,
          end: paragraphEnd
        })
      }

      result.push({
        paragraphText: paragraph,
        segments,
        paragraphStart
      })

      // Advance to next paragraph (NO +2 because DOM has no \n\n separators)
      currentPos = paragraphEnd
    }

    return result
  }, [content, readRanges])

  // Search matches are already in DOM space - no conversion needed
  const convertedSearchMatches = useMemo(() => {
    return searchMatches
  }, [searchMatches])

  const renderableSegments = useMemo(() => {
    if (convertedSearchMatches.length === 0) {
      return paragraphSegments.map(para => ({
        ...para,
        segments: para.segments.map((seg, idx) => ({ ...seg, key: `seg-${para.paragraphStart}-${idx}` }))
      }))
    }

    return paragraphSegments.map(para => {
      const result: Array<ParagraphSegment & { key: string }> = []

      para.segments.forEach((segment, segIdx) => {
        const overlappingMatches = convertedSearchMatches
          .map((match, matchIdx) => ({ ...match, matchIdx }))
          .filter(match => segment.start < match.end && segment.end > match.start)
          .sort((a, b) => a.start - b.start)

        if (overlappingMatches.length === 0) {
          result.push({ ...segment, key: `seg-${para.paragraphStart}-${segIdx}` })
          return
        }

        let currentPos = segment.start

        overlappingMatches.forEach((match, matchSubIdx) => {
          const matchStart = Math.max(match.start, segment.start)
          const matchEnd = Math.min(match.end, segment.end)

          if (currentPos < matchStart) {
            const text = segment.text.substring(currentPos - segment.start, matchStart - segment.start)
            result.push({
              ...segment,
              text,
              start: currentPos,
              end: matchStart,
              key: `seg-${para.paragraphStart}-${segIdx}-pre-${matchSubIdx}`,
              isSearchMatch: false,
              isActiveSearchMatch: false
            })
          }

          const matchText = segment.text.substring(matchStart - segment.start, matchEnd - segment.start)
          result.push({
            ...segment,
            text: matchText,
            start: matchStart,
            end: matchEnd,
            key: `seg-${para.paragraphStart}-${segIdx}-match-${matchSubIdx}`,
            isSearchMatch: true,
            isActiveSearchMatch: match.matchIdx === activeSearchIndex
          })

          currentPos = matchEnd
        })

        if (currentPos < segment.end) {
          const text = segment.text.substring(currentPos - segment.start)
          result.push({
            ...segment,
            text,
            start: currentPos,
            end: segment.end,
            key: `seg-${para.paragraphStart}-${segIdx}-post`,
            isSearchMatch: false,
            isActiveSearchMatch: false
          })
        }
      })

      return {
        ...para,
        segments: result
      }
    })
  }, [paragraphSegments, convertedSearchMatches, activeSearchIndex])

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'A' && target.classList.contains('clickable-link')) {
      e.preventDefault()
      const url = target.getAttribute('data-url')
      if (url) {
        if (e.altKey && onNavigateToIngest) {
          onNavigateToIngest(url)
        } else {
          openUrl(url).catch((error: Error) => {
            console.error('Failed to open URL:', error)
          })
        }
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'A' && target.classList.contains('clickable-link')) {
      if (e.altKey && e.key === 'Enter' && onNavigateToIngest) {
        e.preventDefault()
        const url = target.getAttribute('data-url')
        if (url) {
          onNavigateToIngest(url)
        }
      }
    }
  }

  const renderSegmentContent = (segment: ParagraphSegment & { key: string }) => {
    let processedText = segment.text

    processedText = processedText.replace(/\[\]\([^\)]+\)/g, '')

    const headerMatch = processedText.match(/^={2,}\s*(.+?)\s*={2,}$/)
    if (headerMatch) {
      processedText = headerMatch[1].trim()
    }

    const links = linksEnabled ? parseLinksInText(segment.text) : []

    if (links.length === 0) {
      const renderedText = processedText.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')

      if (segment.isActiveSearchMatch) {
        return <mark className="search-match-active" data-search-index={activeSearchIndex}>{renderedText}</mark>
      } else if (segment.isSearchMatch) {
        return <mark className="search-match">{renderedText}</mark>
      } else if (segment.isExcluded) {
        return <span className="excluded-text">{renderedText}</span>
      } else if (segment.isRead && segment.isHeader) {
        return <mark className="read-range read-header"><strong>{renderedText}</strong></mark>
      } else if (segment.isRead) {
        return <mark className="read-range">{renderedText}</mark>
      } else if (segment.isHeader) {
        return <strong>{renderedText}</strong>
      }

      return renderedText
    }

    const elements: React.ReactNode[] = []
    let currentPos = 0

    for (const link of links) {
      if (currentPos < link.start) {
        const beforeText = segment.text.substring(currentPos, link.start)
        elements.push(beforeText)
      }

      elements.push(
        <a
          key={`link-${link.start}`}
          href={link.url}
          className="clickable-link"
          data-url={link.url}
          tabIndex={0}
        >
          {link.text}
        </a>
      )

      currentPos = link.end
    }

    if (currentPos < segment.text.length) {
      const afterText = segment.text.substring(currentPos)
      elements.push(afterText)
    }

    if (segment.isActiveSearchMatch) {
      return <mark className="search-match-active" data-search-index={activeSearchIndex}>{elements}</mark>
    } else if (segment.isSearchMatch) {
      return <mark className="search-match">{elements}</mark>
    } else if (segment.isExcluded) {
      return <span className="excluded-text">{elements}</span>
    } else if (segment.isRead && segment.isHeader) {
      return <mark className="read-range read-header"><strong>{elements}</strong></mark>
    } else if (segment.isRead) {
      return <mark className="read-range">{elements}</mark>
    } else if (segment.isHeader) {
      return <strong>{elements}</strong>
    }

    return <Fragment>{elements}</Fragment>
  }

  return (
    <div
      id="article-content"
      className={`whitespace-pre-wrap not-prose ${className || ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {renderableSegments.map((para) => (
        <p key={`para-${para.paragraphStart}`}>
          {para.segments.map(segment => (
            <Fragment key={segment.key}>
              {renderSegmentContent(segment)}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  )
}

export const ReadHighlighter = memo(ReadHighlighterComponent)
