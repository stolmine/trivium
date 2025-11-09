/**
 * Markdown Link Parser
 *
 * Properly parses markdown links [text](url) where:
 * - Link text can contain brackets (e.g., [[text]])
 * - URLs can contain parentheses (e.g., https://en.wikipedia.org/wiki/Name_(disambiguation))
 *
 * This parser handles nested parentheses correctly by tracking parenthesis depth.
 */

export interface MarkdownLinkInfo {
  linkText: string
  url: string
  startIndex: number
  endIndex: number
}

/**
 * Parse a markdown link starting at the given index
 * Returns null if no valid link is found at that position
 */
export function parseMarkdownLink(
  text: string,
  startIndex: number
): MarkdownLinkInfo | null {
  if (text[startIndex] !== '[') return null

  // Find the closing ]( for link text
  // We look for ] followed immediately by ( to handle brackets within link text
  let i = startIndex + 1
  let linkText = ''
  let foundEnd = false

  while (i < text.length) {
    if (text[i] === ']') {
      // Check if this ] is followed by (
      if (i + 1 < text.length && text[i + 1] === '(') {
        // Found ](  - this is the end of link text
        foundEnd = true
        i++ // skip the ]
        break
      } else if (i + 1 < text.length && text[i + 1] === ']') {
        // Found ]]  - the first ] is part of link text (for cases like [[text]])
        // Add this ] to linkText and continue
        linkText += text[i]
        i++
      } else {
        // Found ] followed by something else (space, letter, end of string, etc.)
        // This is NOT a markdown link - it's just bracketed text like [Helot]
        // We must return null here to avoid treating text between [Helot] and the next [link](url) as a giant link
        return null
      }
    } else {
      linkText += text[i]
      i++
    }
  }

  if (!foundEnd || i >= text.length || text[i] !== '(') return null
  i++ // skip (

  // Parse URL - match everything until ) that closes the markdown link
  // URLs can contain () so we need to track parenthesis depth
  let url = ''
  let parenDepth = 0

  while (i < text.length) {
    if (text[i] === '(') {
      // Opening paren inside URL - increase depth
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
  i++ // skip the closing )

  return {
    linkText,
    url,
    startIndex,
    endIndex: i
  }
}

/**
 * Find all markdown links in text
 * Returns an array of MarkdownLinkInfo objects
 */
export function findAllMarkdownLinks(text: string): MarkdownLinkInfo[] {
  const links: MarkdownLinkInfo[] = []
  let i = 0

  while (i < text.length) {
    const linkInfo = parseMarkdownLink(text, i)
    if (linkInfo) {
      links.push(linkInfo)
      i = linkInfo.endIndex
    } else {
      i++
    }
  }

  return links
}

/**
 * Check if a position falls inside any markdown link
 * Position is considered inside if it's between [ and ) inclusive
 */
export function isPositionInLink(pos: number, text: string): boolean {
  let i = 0

  while (i < text.length) {
    const linkInfo = parseMarkdownLink(text, i)
    if (linkInfo) {
      // Check if position is inside this link
      if (pos >= linkInfo.startIndex && pos < linkInfo.endIndex) {
        return true
      }

      // If we've passed the position, we can stop
      if (linkInfo.startIndex > pos) {
        return false
      }

      i = linkInfo.endIndex
    } else {
      i++
    }
  }

  return false
}

/**
 * Strip markdown link syntax but keep link text
 * Example: "[text](url)" becomes "text"
 */
export function stripMarkdownLinks(text: string): string {
  let result = ''
  let i = 0

  while (i < text.length) {
    const linkInfo = parseMarkdownLink(text, i)
    if (linkInfo) {
      result += linkInfo.linkText
      i = linkInfo.endIndex
    } else {
      result += text[i]
      i++
    }
  }

  return result
}
