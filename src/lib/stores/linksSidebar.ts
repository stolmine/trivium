import { create } from 'zustand'
import { parseMarkdownLink } from '../utils/markdownLinkParser'

export type SortMode = 'appearance' | 'alphabetical'

export interface ParsedLink {
  fullUrl: string
  baseUrl: string
  displayText: string
  frequency: number
  anchors: string[]
  firstAppearance: number
}

interface LinksSidebarState {
  isOpen: boolean
  links: ParsedLink[]
  showNonWikipedia: boolean
  showWikipedia: boolean
  sortMode: SortMode
  searchQuery: string
  scrollPosition: number

  setOpen: (open: boolean) => void
  extractLinks: (content: string) => void
  setShowNonWikipedia: (show: boolean) => void
  setShowWikipedia: (show: boolean) => void
  setSortMode: (mode: SortMode) => void
  setSearchQuery: (query: string) => void
  setScrollPosition: (position: number) => void
}

export const useLinksSidebarStore = create<LinksSidebarState>((set) => ({
  isOpen: false,
  links: [],
  showNonWikipedia: false,
  showWikipedia: true,
  sortMode: 'appearance',
  searchQuery: '',
  scrollPosition: 0,

  setOpen: (open) => set({ isOpen: open }),

  extractLinks: (content: string) => {
    const links = extractAndDeduplicateLinks(content)
    set({ links })
  },

  setShowNonWikipedia: (show) => set({ showNonWikipedia: show }),
  setShowWikipedia: (show) => set({ showWikipedia: show }),
  setSortMode: (mode) => set({ sortMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setScrollPosition: (position) => set({ scrollPosition: position })
}))

function extractAndDeduplicateLinks(content: string): ParsedLink[] {
  const linkMap = new Map<string, ParsedLink>()
  let matchIndex = 0

  // Parse markdown links using the proper parser that handles parentheses in URLs
  let i = 0
  while (i < content.length) {
    const linkInfo = parseMarkdownLink(content, i)
    if (linkInfo) {
      if (linkInfo.linkText.trim()) {
        processLink(linkInfo.url, linkInfo.linkText, linkMap, matchIndex)
        matchIndex++
      }
      i = linkInfo.endIndex
    } else {
      i++
    }
  }

  // Find bare URLs (not already in markdown links)
  // First, remove all markdown links from content to avoid double-counting
  let contentWithoutMarkdown = ''
  i = 0
  while (i < content.length) {
    const linkInfo = parseMarkdownLink(content, i)
    if (linkInfo) {
      i = linkInfo.endIndex
    } else {
      contentWithoutMarkdown += content[i]
      i++
    }
  }

  const bareUrlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g
  let match
  while ((match = bareUrlRegex.exec(contentWithoutMarkdown)) !== null) {
    const url = match[0]
    processLink(url, url, linkMap, matchIndex)
    matchIndex++
  }

  return Array.from(linkMap.values()).sort((a, b) => {
    if (a.frequency !== b.frequency) {
      return b.frequency - a.frequency
    }
    return a.displayText.localeCompare(b.displayText)
  })
}

function processLink(fullUrl: string, displayText: string, linkMap: Map<string, ParsedLink>, matchIndex: number) {
  try {
    const url = new URL(fullUrl)
    const baseUrl = `${url.protocol}//${url.host}${url.pathname}${url.search}`
    const anchor = url.hash.slice(1)

    if (linkMap.has(baseUrl)) {
      const existing = linkMap.get(baseUrl)!
      existing.frequency++
      if (anchor && !existing.anchors.includes(anchor)) {
        existing.anchors.push(anchor)
      }
    } else {
      linkMap.set(baseUrl, {
        fullUrl,
        baseUrl,
        displayText,
        frequency: 1,
        anchors: anchor ? [anchor] : [],
        firstAppearance: matchIndex
      })
    }
  } catch (e) {
    // Invalid URL, skip
  }
}
