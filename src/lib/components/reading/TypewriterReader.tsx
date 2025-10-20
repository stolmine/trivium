import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { openUrl } from '@tauri-apps/plugin-opener'
import { Button } from '../ui'
import { X } from 'lucide-react'
import { findSentenceEnd } from '@/lib/utils/sentenceBoundary'
import { useReadingStore } from '@/lib/stores/reading'
import { parseExcludedRanges, cleanedPosToRenderedPos } from './ReadHighlighter'
import { api } from '@/lib/utils/tauri'

interface TypewriterReaderProps {
  content: string
  textId: number
  onExit: () => void
  linksEnabled?: boolean
}

interface SentenceData {
  text: string
  start: number
  end: number
  isExcluded: boolean
  isHeader: boolean
  startsNewParagraph: boolean
}

function formatWikipediaHeaders(text: string): string {
  const lines = text.split('\n')
  const formattedLines = lines.map(line => {
    const trimmedLine = line.trim()
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
  if (text[startIndex] !== '[') return null

  let i = startIndex + 1
  let linkText = ''
  let foundEnd = false

  while (i < text.length) {
    if (text[i] === ']' && i + 1 < text.length && text[i + 1] === '(') {
      foundEnd = true
      i++
      break
    }
    linkText += text[i]
    i++
  }

  if (!foundEnd || i >= text.length || text[i] !== '(') return null
  i++

  let url = ''
  let parenDepth = 0

  while (i < text.length) {
    if (text[i] === '(') {
      parenDepth++
      url += text[i]
      i++
    } else if (text[i] === ')') {
      if (parenDepth > 0) {
        parenDepth--
        url += text[i]
        i++
      } else {
        break
      }
    } else {
      url += text[i]
      i++
    }
  }

  if (i >= text.length || text[i] !== ')') return null
  i++

  return { linkText, url, endIndex: i }
}

function stripMarkdownLinks(text: string): string {
  let stripped = text.replace(/\[\]\([^\)]+\)/g, '')

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

  result = result.replace(/^={2,}\s*(.+?)\s*={2,}$/gm, '$1')
  return result
}

function renderTextWithLinks(text: string, linksEnabled: boolean): string {
  const formattedText = formatWikipediaHeaders(text)
  let textWithoutEmptyLinks = formattedText.replace(/\[\]\([^\)]+\)/g, '')

  if (!linksEnabled) {
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

  let processed = ''
  let i = 0
  while (i < textWithoutEmptyLinks.length) {
    const linkInfo = parseMarkdownLink(textWithoutEmptyLinks, i)
    if (linkInfo) {
      processed += `<a href="${linkInfo.url}" class="clickable-link text-blue-500 hover:text-blue-600 underline" data-url="${linkInfo.url}">${linkInfo.linkText}</a>`
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
    return `<a href="${url}" class="clickable-link text-blue-500 hover:text-blue-600 underline" data-url="${url}">${url}</a>`
  })

  return processed
}

function parseSentences(content: string, excludedRanges: Array<{ startPosition: number; endPosition: number }>): SentenceData[] {
  const { cleanedContent } = parseExcludedRanges(content)
  const sentences: SentenceData[] = []

  const headerRegex = /^={2,}\s*(.+?)\s*={2,}$/gm
  const headerRanges: Array<{ start: number; end: number }> = []
  let match

  while ((match = headerRegex.exec(cleanedContent)) !== null) {
    headerRanges.push({
      start: match.index,
      end: match.index + match[0].length
    })
  }

  const isInHeader = (pos: number) => {
    return headerRanges.some(h => pos >= h.start && pos < h.end)
  }

  const isInExcludedRange = (start: number, end: number) => {
    return excludedRanges.some(r => start < r.endPosition && end > r.startPosition)
  }

  let currentPos = 0
  let lastSentenceEnd = 0

  while (currentPos < cleanedContent.length) {
    if (cleanedContent[currentPos] === '\n' && cleanedContent[currentPos + 1] === '\n') {
      currentPos += 2
      continue
    }

    const sentenceEnd = findSentenceEnd(cleanedContent, currentPos)

    if (sentenceEnd > currentPos) {
      let sentenceText = cleanedContent.substring(currentPos, sentenceEnd).trim()

      if (sentenceText.length > 0) {
        const isHeader = isInHeader(currentPos)
        const isExcluded = isInExcludedRange(currentPos, sentenceEnd)

        const textBetween = cleanedContent.substring(lastSentenceEnd, currentPos)
        const startsNewParagraph = textBetween.includes('\n\n')

        sentences.push({
          text: sentenceText,
          start: currentPos,
          end: sentenceEnd,
          isExcluded,
          isHeader,
          startsNewParagraph
        })

        lastSentenceEnd = sentenceEnd
      }

      currentPos = sentenceEnd
    } else {
      currentPos++
    }
  }

  return sentences
}

export function TypewriterReader({ content, textId, onExit, linksEnabled = false }: TypewriterReaderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const sentenceRefs = useRef<(HTMLElement | null)[]>([])
  const { markRangeAsRead, excludedRanges } = useReadingStore()

  const { sentences, cleanedContent } = useMemo(() => {
    const { cleanedContent } = parseExcludedRanges(content)
    const sentences = parseSentences(content, excludedRanges)
    return { sentences, cleanedContent }
  }, [content, excludedRanges])

  const scrollToCurrentSentence = useCallback(() => {
    const currentRef = sentenceRefs.current[currentIndex]
    if (currentRef) {
      currentRef.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      })
    }
  }, [currentIndex])

  useEffect(() => {
    scrollToCurrentSentence()
  }, [currentIndex, scrollToCurrentSentence])

  const navigateToSentence = useCallback(async (newIndex: number) => {
    if (newIndex < 0 || newIndex >= sentences.length) return

    const currentSentence = sentences[currentIndex]

    if (!currentSentence.isExcluded && !currentSentence.isHeader) {
      try {
        const renderedStart = cleanedPosToRenderedPos(currentSentence.start, cleanedContent)
        const renderedEnd = cleanedPosToRenderedPos(currentSentence.end, cleanedContent)

        console.log('[TypewriterReader] Converting positions:', {
          cleanedStart: currentSentence.start,
          cleanedEnd: currentSentence.end,
          renderedStart,
          renderedEnd,
          cleanedLength: currentSentence.end - currentSentence.start,
          renderedLength: renderedEnd - renderedStart
        })

        await markRangeAsRead(textId, renderedStart, renderedEnd)

        try {
          const strippedText = stripMarkdownLinks(currentSentence.text)
          await api.flashcards.createMark(
            textId,
            strippedText,
            renderedStart,
            renderedEnd
          )
          console.log('[TypewriterReader] Created mark for Create Cards hub')
        } catch (error) {
          console.error('[TypewriterReader] Failed to create mark:', error)
        }
      } catch (error) {
        console.error('Failed to mark sentence as read:', error)
      }
    }

    setCurrentIndex(newIndex)
  }, [currentIndex, sentences, textId, markRangeAsRead, cleanedContent])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        navigateToSentence(currentIndex + 1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        navigateToSentence(currentIndex - 1)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onExit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, navigateToSentence, onExit])

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

  if (sentences.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No sentences found in this text.</p>
          <Button onClick={onExit}>Exit Focus Mode</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-hidden">
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={onExit}
          title="Exit focus mode (Escape)"
          aria-label="Exit focus mode"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-full overflow-y-auto px-8" onClick={handleClick}>
        <div className="max-w-3xl mx-auto py-20">
          {(() => {
            const paragraphs: SentenceData[][] = []
            let currentParagraph: SentenceData[] = []

            sentences.forEach((sentence) => {
              if (sentence.startsNewParagraph && currentParagraph.length > 0) {
                paragraphs.push(currentParagraph)
                currentParagraph = []
              }
              currentParagraph.push(sentence)
            })

            if (currentParagraph.length > 0) {
              paragraphs.push(currentParagraph)
            }

            let sentenceGlobalIndex = 0

            return paragraphs.map((paragraph, paragraphIndex) => (
              <div
                key={paragraphIndex}
                className="text-2xl leading-relaxed mb-8"
              >
                {paragraph.map((sentence) => {
                  const globalIndex = sentenceGlobalIndex++
                  return (
                    <span
                      key={globalIndex}
                      ref={(el) => { sentenceRefs.current[globalIndex] = el }}
                      className={`
                        transition-opacity duration-300
                        ${globalIndex === currentIndex ? 'opacity-100' : 'opacity-30'}
                        ${sentence.isHeader ? 'font-bold' : ''}
                        ${sentence.isExcluded ? 'text-muted-foreground' : ''}
                      `}
                      dangerouslySetInnerHTML={{ __html: renderTextWithLinks(sentence.text, linksEnabled) + ' ' }}
                    />
                  )
                })}
              </div>
            ))
          })()}
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-sm text-muted-foreground">
        Sentence {currentIndex + 1} of {sentences.length} • ↑↓ to navigate • Esc to exit
      </div>
    </div>
  )
}
