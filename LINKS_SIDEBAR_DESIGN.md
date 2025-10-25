# Links Sidebar Feature - Complete Design Document

**Last Updated**: 2025-10-25 (Phase 27 Scroll Preservation Fix)
**Status**: Implemented (Phase 21) + Scroll Preservation Fix (Phase 27)
**Author**: UI/UX Design Architect

**Post-Implementation Notes**:
- Phase 21 (2025-10-20): Initial implementation of Links Sidebar with deduplication and sorting
- Phase 27 (2025-10-25): Critical bug fix for scroll position preservation (see PROGRESS.md for details)

---

## Executive Summary

This document specifies a **Links Sidebar** feature for the reading view that displays all article links with ingest buttons, completely replacing the problematic context menu approach that interferes with native text selection.

**Core Philosophy**: Native browser text selection is sacrosanct. Never intercept, block, or interfere with it. Instead, provide dedicated UI for link management that coexists peacefully with selection behavior.

---

## 1. PROBLEM STATEMENT

### Current Issues with Context Menu Approach

**The Problem**:
- Right-click context menu on links intercepts native browser context menu
- Creates confusion: users expect browser context menu for "Copy link", "Open in new tab"
- Event handling complexity with stopPropagation breaks selection toolbar
- No way to see ALL links in an article at once
- Poor discoverability - users must right-click each link individually

**User Pain Points**:
1. "I want to copy this link but the custom menu doesn't have that option"
2. "I can't select text that includes a link anymore"
3. "How many Wikipedia links are in this article? I have to scroll to find out"
4. "I want to queue up several articles to ingest, not one at a time"

### Solution: Dedicated Links Sidebar

**The Fix**:
- Remove ALL context menu interception from links
- Add dedicated sidebar panel showing ALL links in the article
- Each link has clear "Ingest" and "Open" buttons
- Native text selection works perfectly - no interference
- Users can see link overview at a glance
- Similar pattern to existing Flashcard sidebar (familiar)

---

## 2. VISUAL MOCKUPS (ASCII)

### 2.1 Current Reading View (Before)

```
┌────────────────────────────────────────────────────────────────────────┐
│ [← Back]  Article Title                    Progress: 45%  [🔗][🔍][⋮] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Article content with some [clickable link] in the text...            │
│  ████████████████████████████████████████████ (read text)            │
│  More content with [another link] and regular text.                   │
│                                                                         │
│                                                                         │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
                                                                     No sidebar
```

### 2.2 Reading View with TWO Sidebar Modes (After)

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║ ┌─────────────────────────────────────────────────────────────────────────┐   ║
║ │ [← Back]  Article Title          Progress: 45%  [Cards][Links][🔍][⋮]  │   ║
║ │                                                    ^^^^^  ^^^^^          │   ║
║ │                                                    Toggle buttons        │   ║
║ └─────────────────────────────────────────────────────────────────────────┘   ║
║ ┌──────────────────────────────────────────┬──────────────────────────────┐   ║
║ │                                          │ ┌──────────────────────────┐ │   ║
║ │  Article content with some               │ │ Links (3)            [×] │ │   ║
║ │  [clickable link] in the text...         │ ├──────────────────────────┤ │   ║
║ │  ████████████████████████████████        │ │                          │ │   ║
║ │  ██████████████████ (read text)          │ │ ┌──────────────────────┐ │ │   ║
║ │  More content with [another link]        │ │ │ Natural Selection    │ │ │   ║
║ │  and regular text.                       │ │ │ en.wikipedia.org/... │ │ │   ║
║ │                                          │ │ │                      │ │ │   ║
║ │  Lorem ipsum with embedded               │ │ │ [📥 Ingest] [↗ Open]│ │ │   ║
║ │  [third link] in paragraph.              │ │ └──────────────────────┘ │ │   ║
║ │                                          │ │                          │ │   ║
║ │                                          │ │ ┌──────────────────────┐ │ │   ║
║ │                                          │ │ │ Charles Darwin       │ │ │   ║
║ │                                          │ │ │ en.wikipedia.org/... │ │ │   ║
║ │                                          │ │ │                      │ │ │   ║
║ │                                          │ │ │ [📥 Ingest] [↗ Open]│ │ │   ║
║ │                                          │ │ └──────────────────────┘ │ │   ║
║ │                                          │ │                          │ │   ║
║ │                                          │ │ ┌──────────────────────┐ │ │   ║
║ │                                          │ │ │ Evolution            │ │ │   ║
║ │                                          │ │ │ en.wikipedia.org/... │ │ │   ║
║ │                                          │ │ │                      │ │ │   ║
║ │                                          │ │ │ [📥 Ingest] [↗ Open]│ │ │   ║
║ │                                          │ │ └──────────────────────┘ │ │   ║
║ └──────────────────────────────────────────┴──────────────────────────────┘   ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Legend:
- [Cards] [Links] = Toggle buttons for sidebar mode
- Sidebar shows either Flashcards OR Links (not both simultaneously)
- Each link item shows title, preview URL, and action buttons
- No interference with text selection in main content area
```

### 2.3 LinkItem Component Detail

```
┌────────────────────────────────────────────────┐
│ Natural Selection                              │ ← Link title (or URL if no title)
│ en.wikipedia.org/wiki/Natural_selection        │ ← URL preview (truncated, with tooltip)
│                                                │
│ [📥 Ingest]  [↗ Open]  [📋]                   │ ← Action buttons
│  └─ Primary  └─ Secondary └─ Copy URL         │
└────────────────────────────────────────────────┘

States:
- Default: Card background with border
- Hover: Shadow intensifies, slight scale
- Pressed: Background darkens slightly
- Link already ingested: Show checkmark badge "✓ Ingested"
```

### 2.4 Empty State (No Links)

```
┌────────────────────────────────────────────────┐
│ Links (0)                                  [×] │
├────────────────────────────────────────────────┤
│                                                │
│                    🔗                          │
│                                                │
│           No links in this article             │
│                                                │
│     Links will appear here as you read        │
│                                                │
└────────────────────────────────────────────────┘
```

### 2.5 Deduplication Example

**Before Deduplication** (Same article, different anchors):
```
https://en.wikipedia.org/wiki/Natural_selection
https://en.wikipedia.org/wiki/Natural_selection#History
https://en.wikipedia.org/wiki/Natural_selection#Modern_synthesis
```

**After Deduplication** (Single entry):
```
┌────────────────────────────────────────────────┐
│ Natural Selection                              │
│ en.wikipedia.org/wiki/Natural_selection        │
│                                                │
│ Appears 3 times • Sections: History, Modern... │ ← Optional frequency indicator
│                                                │
│ [📥 Ingest]  [↗ Open]  [📋]                   │
└────────────────────────────────────────────────┘
```

### 2.6 Sidebar Toggle States

**Flashcards Mode (Existing)**:
```
┌─────────────────────────────────────────┐
│ Flashcards (12)                     [×] │
├─────────────────────────────────────────┤
│ [Existing flashcard UI...]              │
│                                         │
└─────────────────────────────────────────┘

Header buttons: [Cards]🔵  [Links]⚪
                 Active     Inactive
```

**Links Mode (New)**:
```
┌─────────────────────────────────────────┐
│ Links (5)                           [×] │
├─────────────────────────────────────────┤
│ [Link items as shown above...]          │
│                                         │
└─────────────────────────────────────────┘

Header buttons: [Cards]⚪  [Links]🔵
                 Inactive   Active
```

**Collapsed State** (Both modes):
```
┌─┐
│>│ ← Expand button
│ │
│C│ ← "C" for Cards or "L" for Links (vertical text)
│ │
└─┘
```

---

## 3. DEDUPLICATION ALGORITHM

### 3.1 URL Parsing & Grouping

**Philosophy**: URLs differing only by hash/anchor point to the same resource. Deduplicate these to avoid clutter.

**Implementation**:

```typescript
interface ParsedLink {
  originalUrl: string          // Full URL as found in markdown
  baseUrl: string              // URL without hash (for deduplication)
  title: string                // Link text from [text](url) or cleaned URL
  anchorFragment: string | null // Hash portion (e.g., "#History")
  positions: number[]          // Character positions where this link appears
}

interface DeduplicatedLink {
  baseUrl: string              // Unique identifier
  displayTitle: string         // Best title to show
  displayUrl: string           // URL for display (truncated)
  fullUrl: string              // Complete URL for actions
  frequency: number            // How many times it appears
  anchorFragments: string[]    // All unique anchors found
  allTitles: string[]          // All title variants found
}

function extractLinksFromMarkdown(content: string): ParsedLink[] {
  const links: ParsedLink[] = []

  // Pattern 1: Markdown links [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^\)]+)\)/g
  let match

  while ((match = markdownLinkRegex.exec(content)) !== null) {
    const [fullMatch, linkText, url] = match
    const position = match.index

    // Skip empty links [](...) - already filtered by renderer
    if (!linkText.trim()) continue

    const parsed = parseUrl(url)
    links.push({
      originalUrl: url,
      baseUrl: parsed.baseUrl,
      title: linkText.trim(),
      anchorFragment: parsed.hash,
      positions: [position]
    })
  }

  // Pattern 2: Bare URLs (if linksEnabled renders these)
  const bareUrlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g

  while ((match = bareUrlRegex.exec(content)) !== null) {
    const url = match[1]
    const position = match.index

    // Skip if this URL is already in a markdown link (avoid duplicates)
    const alreadyCaptured = links.some(link =>
      position >= link.positions[0] - 100 && // Rough range check
      position <= link.positions[0] + 100
    )
    if (alreadyCaptured) continue

    const parsed = parseUrl(url)
    links.push({
      originalUrl: url,
      baseUrl: parsed.baseUrl,
      title: formatUrlAsTitle(parsed.baseUrl), // Convert URL to readable title
      anchorFragment: parsed.hash,
      positions: [position]
    })
  }

  return links
}

function parseUrl(url: string): { baseUrl: string; hash: string | null } {
  try {
    const urlObj = new URL(url)

    // Base URL = protocol + host + pathname + search (NO hash)
    const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}${urlObj.search}`

    // Extract hash (e.g., "#Section" becomes "Section")
    const hash = urlObj.hash ? urlObj.hash.substring(1) : null

    return { baseUrl, hash }
  } catch (error) {
    // Invalid URL - return as-is
    console.warn('Invalid URL:', url, error)
    return { baseUrl: url, hash: null }
  }
}

function deduplicateLinks(parsedLinks: ParsedLink[]): DeduplicatedLink[] {
  const grouped = new Map<string, ParsedLink[]>()

  // Group by baseUrl
  parsedLinks.forEach(link => {
    const existing = grouped.get(link.baseUrl) || []
    existing.push(link)
    grouped.set(link.baseUrl, existing)
  })

  // Convert groups to deduplicated entries
  const deduplicated: DeduplicatedLink[] = []

  grouped.forEach((group, baseUrl) => {
    // Collect all unique anchors
    const anchorFragments = [...new Set(
      group.map(l => l.anchorFragment).filter(Boolean)
    )] as string[]

    // Collect all unique titles
    const allTitles = [...new Set(group.map(l => l.title))]

    // Choose best title: prefer non-URL titles, then shortest
    const displayTitle = allTitles
      .filter(t => !t.startsWith('http'))
      .sort((a, b) => a.length - b.length)[0] || allTitles[0]

    // Use first complete URL for actions (with or without hash)
    const fullUrl = group[0].originalUrl

    deduplicated.push({
      baseUrl,
      displayTitle,
      displayUrl: truncateUrl(baseUrl),
      fullUrl,
      frequency: group.length,
      anchorFragments,
      allTitles
    })
  })

  // Sort by frequency (most common first) then alphabetically
  return deduplicated.sort((a, b) => {
    if (a.frequency !== b.frequency) {
      return b.frequency - a.frequency // Descending
    }
    return a.displayTitle.localeCompare(b.displayTitle)
  })
}

function truncateUrl(url: string, maxLength: number = 50): string {
  if (url.length <= maxLength) return url

  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname
    const path = urlObj.pathname + urlObj.search

    // Show domain + truncated path
    const truncatedPath = path.length > (maxLength - domain.length - 3)
      ? path.substring(0, maxLength - domain.length - 6) + '...'
      : path

    return `${domain}${truncatedPath}`
  } catch {
    // Fallback: simple truncation
    return url.substring(0, maxLength - 3) + '...'
  }
}

function formatUrlAsTitle(url: string): string {
  try {
    const urlObj = new URL(url)
    // Extract last path segment and make it readable
    const segments = urlObj.pathname.split('/').filter(Boolean)
    const lastSegment = segments[segments.length - 1] || urlObj.hostname

    // Convert "Natural_selection" → "Natural Selection"
    return lastSegment
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase()) // Title case
  } catch {
    return url
  }
}
```

### 3.2 Edge Cases

**Case 1: Query Parameters**
```
Input:
  https://example.com/article?page=1
  https://example.com/article?page=2

Behavior: Treat as DIFFERENT (query params matter)
Output: 2 separate entries
```

**Case 2: Wikipedia Anchors**
```
Input:
  https://en.wikipedia.org/wiki/Natural_selection
  https://en.wikipedia.org/wiki/Natural_selection#History
  https://en.wikipedia.org/wiki/Natural_selection#Modern_synthesis

Behavior: Treat as SAME (anchors don't matter for ingestion)
Output: 1 entry
  Title: "Natural Selection"
  URL: en.wikipedia.org/wiki/Natural_selection
  Appears: 3 times • Sections: History, Modern synthesis
```

**Case 3: Mixed Title Variants**
```
Input:
  [Natural Selection](https://en.wikipedia.org/wiki/Natural_selection)
  [natural selection](https://en.wikipedia.org/wiki/Natural_selection)
  [NS](https://en.wikipedia.org/wiki/Natural_selection)

Behavior: Choose longest non-abbreviated title
Output: "Natural Selection" (title case preferred)
```

**Case 4: External vs Internal Wikipedia**
```
Input:
  https://en.wikipedia.org/wiki/Evolution
  https://simple.wikipedia.org/wiki/Evolution

Behavior: Treat as DIFFERENT (different domains)
Output: 2 entries (different Wikipedia editions)
```

---

## 4. STATE MANAGEMENT

### 4.1 New Zustand Store: `linksSidebar.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SidebarMode = 'flashcards' | 'links'

interface DeduplicatedLink {
  baseUrl: string
  displayTitle: string
  displayUrl: string
  fullUrl: string
  frequency: number
  anchorFragments: string[]
  allTitles: string[]
}

interface LinksSidebarState {
  // UI State
  sidebarMode: SidebarMode
  setSidebarMode: (mode: SidebarMode) => void
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void

  // Links Data
  links: DeduplicatedLink[]
  setLinks: (links: DeduplicatedLink[]) => void
  extractAndSetLinks: (markdownContent: string) => void

  // Actions
  clearLinks: () => void
}

export const useLinksSidebarStore = create<LinksSidebarState>()(
  persist(
    (set, get) => ({
      sidebarMode: 'flashcards', // Default to flashcards (existing behavior)
      isCollapsed: false,
      links: [],

      setSidebarMode: (mode) => {
        set({ sidebarMode: mode })
      },

      setIsCollapsed: (collapsed) => {
        set({ isCollapsed: collapsed })
      },

      setLinks: (links) => {
        set({ links })
      },

      extractAndSetLinks: (markdownContent) => {
        const parsedLinks = extractLinksFromMarkdown(markdownContent)
        const deduplicated = deduplicateLinks(parsedLinks)
        set({ links: deduplicated })
      },

      clearLinks: () => {
        set({ links: [] })
      }
    }),
    {
      name: 'trivium-links-sidebar',
      // Only persist UI preferences, not links (regenerate on load)
      partialize: (state) => ({
        sidebarMode: state.sidebarMode,
        isCollapsed: state.isCollapsed
      })
    }
  )
)
```

### 4.2 Integration with Reading View

```typescript
// In ReadPage component (/routes/read/[id].tsx)

const {
  sidebarMode,
  setSidebarMode,
  extractAndSetLinks
} = useLinksSidebarStore()

// Extract links when text loads or changes
useEffect(() => {
  if (currentText) {
    extractAndSetLinks(currentText.content)
  }
}, [currentText?.content, extractAndSetLinks])

// When user edits text inline and saves
const handleSaveInlineEdit = async () => {
  // ... existing save logic ...

  // Re-extract links from updated content
  extractAndSetLinks(editingContent)
}
```

---

## 5. COMPONENT ARCHITECTURE

### 5.1 Component Hierarchy

```
ReadPage
├── Header (existing)
├── Content Area (existing)
│   └── ReadHighlighter (NO CHANGES - remove context menu)
└── Sidebar (MODIFIED)
    ├── SidebarToggleButtons (NEW)
    │   ├── [Flashcards Button]
    │   └── [Links Button]
    └── SidebarContent (MODIFIED)
        ├── FlashcardSidebar (existing, shown when mode='flashcards')
        └── LinksSidebar (NEW, shown when mode='links')
            ├── LinksSidebarHeader
            ├── LinksPanel
            │   └── LinkItem (multiple)
            │       ├── LinkTitle
            │       ├── LinkPreview
            │       └── LinkActions
            │           ├── IngestButton
            │           ├── OpenButton
            │           └── CopyButton
            └── EmptyState (when no links)
```

### 5.2 Component Specifications

#### `LinksSidebar.tsx` (Main Component)

```typescript
import { useState } from 'react'
import { useLinksSidebarStore } from '../../stores/linksSidebar'
import { Button } from '../ui'
import { ChevronRight, Link as LinkIcon } from 'lucide-react'
import { LinkItem } from './LinkItem'

interface LinksSidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  onNavigateToIngest: (url: string) => void
}

export function LinksSidebar({
  isCollapsed,
  onToggleCollapse,
  onNavigateToIngest
}: LinksSidebarProps) {
  const { links } = useLinksSidebarStore()

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center border-l border-border bg-muted">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="mt-4"
          title="Expand links sidebar"
          aria-label="Expand links sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {/* Vertical "L" text indicator */}
        <div className="mt-8 text-muted-foreground text-xs rotate-90 origin-center">
          LINKS
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col border-l border-border bg-muted overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">
            Links ({links.length})
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          title="Collapse sidebar"
          aria-label="Collapse links sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable Links List */}
      <div className="flex-1 overflow-y-auto p-4">
        {links.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <LinkItem
                key={link.baseUrl}
                link={link}
                onIngest={() => onNavigateToIngest(link.fullUrl)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer (Optional: Add filter/search in v2) */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="text-xs text-muted-foreground text-center">
          {links.length} {links.length === 1 ? 'link' : 'links'} found
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center text-sm text-muted-foreground py-12">
      <LinkIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
      <p className="mb-2">No links in this article</p>
      <p className="text-xs">
        Links will appear here as you read
      </p>
    </div>
  )
}
```

#### `LinkItem.tsx` (Individual Link Card)

```typescript
import { useState } from 'react'
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui'
import { Download, ExternalLink, Copy, Check } from 'lucide-react'
import { openUrl } from '@tauri-apps/plugin-opener'

interface LinkItemProps {
  link: {
    baseUrl: string
    displayTitle: string
    displayUrl: string
    fullUrl: string
    frequency: number
    anchorFragments: string[]
  }
  onIngest: () => void
}

export function LinkItem({ link, onIngest }: LinkItemProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link.fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  const handleOpen = () => {
    openUrl(link.fullUrl).catch((error: Error) => {
      console.error('Failed to open URL:', error)
    })
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-all hover:scale-[1.02] p-3">
      {/* Title */}
      <h3 className="font-medium text-sm text-card-foreground mb-1 line-clamp-2">
        {link.displayTitle}
      </h3>

      {/* URL Preview */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-xs text-muted-foreground mb-2 truncate">
              {link.displayUrl}
            </p>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs break-all">{link.fullUrl}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Frequency & Anchors (Optional) */}
      {link.frequency > 1 && (
        <p className="text-xs text-muted-foreground/70 mb-2">
          Appears {link.frequency} times
          {link.anchorFragments.length > 0 && (
            <> • {link.anchorFragments.slice(0, 2).join(', ')}
            {link.anchorFragments.length > 2 && '...'}</>
          )}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={onIngest}
          className="flex-1 h-8"
          title="Open in Ingest page"
        >
          <Download className="h-3 w-3 mr-1" />
          Ingest
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleOpen}
          className="flex-1 h-8"
          title="Open in browser"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Open
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 w-8 p-0"
          title={copied ? 'Copied!' : 'Copy URL'}
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  )
}
```

#### `SidebarToggleButtons.tsx` (Mode Switcher)

```typescript
import { Button } from '../ui'
import { BookMarked, Link } from 'lucide-react'
import { useLinksSidebarStore } from '../../stores/linksSidebar'

export function SidebarToggleButtons() {
  const { sidebarMode, setSidebarMode } = useLinksSidebarStore()

  return (
    <div className="flex items-center gap-1 border border-border rounded-md p-1 bg-muted/50">
      <Button
        variant={sidebarMode === 'flashcards' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setSidebarMode('flashcards')}
        className="h-8 px-3"
        title="Show flashcards"
        aria-label="Show flashcards sidebar"
      >
        <BookMarked className="h-4 w-4 mr-1" />
        Cards
      </Button>

      <Button
        variant={sidebarMode === 'links' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setSidebarMode('links')}
        className="h-8 px-3"
        title="Show links"
        aria-label="Show links sidebar"
      >
        <Link className="h-4 w-4 mr-1" />
        Links
      </Button>
    </div>
  )
}
```

---

## 6. USER INTERACTION FLOWS

### 6.1 Discovering the Feature

**Entry Point 1: Header Button**
```
User sees: [Cards][Links] toggle buttons in reading view header
User clicks: [Links] button
Result: Sidebar switches to Links mode, showing all article links
```

**Entry Point 2: Keyboard Shortcut**
```
User presses: Ctrl+Shift+L (optional enhancement)
Result: Toggles sidebar to Links mode (or cycles: closed → flashcards → links)
```

**Entry Point 3: First-Time Tooltip**
```
On first visit to reading view after feature launch:
  Small tooltip appears above [Links] button:
  "NEW: View all article links here →"
  Dismissible, never shown again after first dismiss
```

### 6.2 Using the Feature

**Happy Path**:
```
1. User opens article with Wikipedia links
2. User clicks [Links] button in header
3. Sidebar switches from Flashcards to Links mode
4. User sees deduplicated list of 5 links
5. User clicks [Ingest] button on "Natural Selection" link
6. Navigation to /ingest page with URL pre-filled
7. User returns via back button
8. Scroll position preserved (existing behavior)
9. Links sidebar still visible with same link highlighted (optional enhancement)
```

**Alternative Flow 1: Open in Browser**
```
1. User sees interesting external link
2. User clicks [Open] button
3. Link opens in system default browser
4. User continues reading in Trivium
```

**Alternative Flow 2: Copy URL**
```
1. User wants to share link
2. User clicks [📋 Copy] icon button
3. URL copied to clipboard
4. Checkmark icon shows briefly (2s) as confirmation
5. User pastes URL elsewhere
```

### 6.3 Edge Cases

**Case: No Links Found**
```
User opens article without links (plain text)
Sidebar shows:
  - Empty state illustration (chain link icon)
  - Message: "No links in this article"
  - No error, just informative state
```

**Case: Many Links (20+)**
```
Sidebar becomes scrollable
Links sorted by:
  1. Frequency (most common first)
  2. Alphabetical order (within same frequency)
No virtualization needed for <100 links
```

**Case: Inline Editing Changes Links**
```
User edits article content, adds/removes links
On save:
  1. extractAndSetLinks() re-runs automatically
  2. Links list updates smoothly (no flash)
  3. Scroll position in sidebar preserved if possible
```

---

## 7. ACCESSIBILITY

### 7.1 Keyboard Navigation

**Tab Order**:
```
1. [Cards] button
2. [Links] button
3. Collapse sidebar button (×)
4. First link item - Ingest button
5. First link item - Open button
6. First link item - Copy button
7. Second link item - Ingest button
... (continues through all links)
```

**Keyboard Shortcuts**:
```
Ctrl+Shift+L  → Toggle Links sidebar (proposal)
Tab           → Navigate through link action buttons
Enter         → Activate focused button
Space         → Activate focused button
Escape        → Close sidebar (if open)
```

### 7.2 Screen Reader Support

**Announcements**:
```
On opening Links sidebar:
  "Links sidebar opened. 5 links found."

On link item focus:
  "Natural Selection. Wikipedia link. en.wikipedia.org/wiki/Natural_selection. Ingest button. Open button. Copy button."

On Ingest button click:
  "Navigating to ingest page for Natural Selection"

On Copy button click:
  "URL copied to clipboard"
```

**ARIA Attributes**:
```html
<div role="complementary" aria-label="Article links sidebar">
  <button aria-label="Collapse sidebar" aria-expanded="true">

  <div role="list" aria-label="Article links">
    <div role="listitem">
      <h3 id="link-1-title">Natural Selection</h3>
      <button aria-describedby="link-1-title" aria-label="Ingest Natural Selection">
      <button aria-describedby="link-1-title" aria-label="Open Natural Selection in browser">
      <button aria-describedby="link-1-title" aria-label="Copy URL for Natural Selection">
    </div>
  </div>
</div>
```

### 7.3 Visual Indicators

**Focus Rings**:
```css
.link-item-button:focus {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

**High Contrast Mode**:
```css
@media (prefers-contrast: high) {
  .link-item {
    border-width: 2px;
  }

  .link-item:hover {
    border-color: hsl(var(--foreground));
  }
}
```

---

## 8. PERFORMANCE CONSIDERATIONS

### 8.1 Link Extraction Performance

**Expected Scale**:
- Typical Wikipedia article: 50-200 links
- Long article: 500+ links
- Deduplication: Reduces to ~50-100 unique base URLs

**Optimization**:
```typescript
// Memoize extraction to avoid re-running on every render
const links = useMemo(() => {
  if (!currentText?.content) return []

  const parsed = extractLinksFromMarkdown(currentText.content)
  return deduplicateLinks(parsed)
}, [currentText?.content]) // Only re-run when content changes

// Debounce re-extraction during inline editing
const debouncedExtract = useMemo(
  () => debounce(extractAndSetLinks, 500),
  [extractAndSetLinks]
)
```

**Benchmarks** (Target):
- Extraction time: <50ms for 200 links
- Deduplication time: <20ms
- Total: <70ms (imperceptible)

### 8.2 Rendering Performance

**No Virtualization Needed (Yet)**:
- Assumption: <100 unique links per article
- React can render 100 small components easily (<16ms)
- If future articles have 500+ links, add `react-window` virtualization

**Lazy Loading Images** (Not applicable here - no images in link items)

**Scroll Performance**:
```css
.links-panel {
  overflow-y: auto;
  overscroll-behavior: contain; /* Prevent scroll chaining to main content */
  scroll-behavior: smooth; /* Smooth scrolling for keyboard navigation */
}
```

### 8.3 State Update Performance

**Avoid Unnecessary Re-renders**:
```typescript
// Use shallow comparison for links array
const links = useLinksSidebarStore(state => state.links, shallow)

// Memoize individual LinkItem components
export const LinkItem = memo(LinkItemComponent, (prev, next) => {
  return prev.link.baseUrl === next.link.baseUrl &&
         prev.link.frequency === next.link.frequency
})
```

---

## 9. STYLING & THEMING

### 9.1 Component Styling

**LinksSidebar Container**:
```css
.links-sidebar {
  background: hsl(var(--muted));
  border-left: 1px solid hsl(var(--border));
  width: 384px; /* Same as FlashcardSidebar (w-96) */
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.links-sidebar--collapsed {
  width: 48px; /* w-12 */
}
```

**LinkItem Card**:
```css
.link-item {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius-lg);
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.link-item:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  transform: scale(1.02);
}

.link-item:active {
  transform: scale(0.98);
}
```

**Action Buttons**:
```css
.link-action-button {
  font-size: 13px;
  height: 32px;
  padding: 0 12px;
  gap: 4px; /* Space between icon and text */
  font-weight: 500;
}

.link-action-button--primary {
  /* [Ingest] button */
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.link-action-button--secondary {
  /* [Open] button */
  background: transparent;
  border: 1px solid hsl(var(--border));
  color: hsl(var(--foreground));
}

.link-action-button--icon-only {
  /* [Copy] button */
  width: 32px;
  padding: 0;
}
```

### 9.2 Dark Mode Adaptations

**All components use CSS variables**, so dark mode works automatically:

```css
/* Light Mode (default) */
:root {
  --link-item-bg: var(--card);              /* white */
  --link-item-border: var(--border);        /* light gray */
  --link-item-hover: 0 4px 6px rgba(0,0,0,0.07); /* subtle shadow */
}

/* Dark Mode */
.dark {
  --link-item-bg: var(--card);              /* dark gray */
  --link-item-border: var(--border);        /* semi-transparent white */
  --link-item-hover: 0 4px 6px rgba(0,0,0,0.3); /* stronger shadow */
}
```

**Special Considerations**:
- Link icons (Download, ExternalLink) use `currentColor` - no changes needed
- Frequency text uses `muted-foreground` - readable in both modes
- Button hover states defined by shadcn/ui theme - consistent

---

## 10. MIGRATION FROM CONTEXT MENU

### 10.1 Removal Checklist

**Files to Modify**:
1. `/src/lib/components/reading/ReadHighlighter.tsx`
   - [x] Remove `LinkContextMenu` import
   - [x] Remove `contextMenu` state
   - [x] Remove `handleContextMenu` callback
   - [x] Remove `onContextMenu` prop from div
   - [x] Remove `<LinkContextMenu>` component render
   - [x] Keep text selection protection in `handleClick` (still needed for regular click)

2. `/src/lib/components/reading/LinkContextMenu.tsx`
   - [x] Delete entire file (no longer needed)

3. `/src/lib/components/reading/index.ts`
   - [x] Remove `LinkContextMenu` export

**Behavioral Changes**:
```diff
Before (Context Menu):
- User right-clicks link → Custom menu appears
- Options: "Open in Ingest", "Open in Browser"
- Problem: Breaks native context menu, confuses users

After (Links Sidebar):
- User right-clicks link → Native browser context menu
- Options: Copy link, Open in new tab, etc. (browser default)
- Links sidebar provides "Ingest" and "Open" actions instead
- No interference with text selection or native behavior
```

### 10.2 User Communication

**Changelog Entry** (for release notes):
```
## New Feature: Links Sidebar

We've replaced the link context menu with a dedicated Links sidebar that shows all article links in one place.

What's Changed:
• Right-clicking links now shows the native browser menu (copy link, etc.)
• New [Links] button in reading view header shows all article links
• Each link has clear [Ingest] and [Open] buttons
• Links are automatically deduplicated (same article, different sections)
• No more interference with text selection

Why This Change:
The context menu approach was blocking native browser functionality and making text selection difficult. The sidebar provides better discoverability and doesn't interfere with standard browser behavior.
```

---

## 11. IMPLEMENTATION PHASES

### Phase 1: Core Functionality (MVP)

**Duration**: ~8-12 hours

**Tasks**:
1. Create `/src/lib/stores/linksSidebar.ts` store
   - [x] State management
   - [x] Deduplication algorithm
   - [x] Link extraction logic

2. Create `/src/lib/components/reading/LinksSidebar.tsx`
   - [x] Main container
   - [x] Header with title and collapse button
   - [x] Scrollable list area
   - [x] Empty state

3. Create `/src/lib/components/reading/LinkItem.tsx`
   - [x] Card layout
   - [x] Title, URL preview
   - [x] Ingest and Open buttons

4. Create `/src/lib/components/reading/SidebarToggleButtons.tsx`
   - [x] [Cards] [Links] toggle UI
   - [x] Mode switching logic

5. Modify `/src/routes/read/[id].tsx`
   - [x] Integrate toggle buttons in header
   - [x] Conditional sidebar rendering based on mode
   - [x] Wire up onNavigateToIngest callback

6. Remove context menu code
   - [x] Clean up ReadHighlighter
   - [x] Delete LinkContextMenu.tsx

**Testing**:
- [x] Link extraction accuracy
- [x] Deduplication correctness
- [x] Navigation to ingest page
- [x] Sidebar collapse/expand
- [x] Mode switching

### Phase 2: Polish & UX Enhancements

**Duration**: ~4-6 hours

**Tasks**:
1. Add frequency display
   - "Appears 3 times • Sections: History, Modern..."

2. Add Copy URL button
   - Copy to clipboard
   - Checkmark confirmation

3. Improve empty state
   - Icon illustration
   - Better messaging

4. Add keyboard shortcut (Ctrl+Shift+L)
   - Toggle links sidebar
   - Focus first link item

5. Accessibility audit
   - ARIA labels
   - Keyboard navigation
   - Screen reader testing

6. Performance optimization
   - Memoization
   - Debouncing during inline edit

**Testing**:
- [x] Keyboard navigation
- [x] Screen reader compatibility
- [x] Copy to clipboard
- [x] Large articles (500+ links)

### Phase 3: Advanced Features (Future)

**Duration**: TBD (not in initial scope)

**Potential Features**:
1. Search/Filter links
   - Search by title or domain
   - Filter by domain (e.g., only Wikipedia)

2. Link grouping
   - Group by domain
   - Collapsible groups

3. "Already Ingested" indicator
   - Check if URL already in library
   - Show checkmark badge

4. Bulk ingest
   - Select multiple links
   - Queue for batch ingestion

5. Link annotations
   - User notes on links
   - Tags or categories

---

## 12. TESTING STRATEGY

### 12.1 Unit Tests

**Link Extraction**:
```typescript
describe('extractLinksFromMarkdown', () => {
  it('extracts markdown links [text](url)', () => {
    const content = 'See [Natural Selection](https://en.wikipedia.org/wiki/Natural_selection) for more.'
    const links = extractLinksFromMarkdown(content)

    expect(links).toHaveLength(1)
    expect(links[0].title).toBe('Natural Selection')
    expect(links[0].originalUrl).toBe('https://en.wikipedia.org/wiki/Natural_selection')
  })

  it('skips empty links [](url)', () => {
    const content = 'Text with [](https://example.com) empty link'
    const links = extractLinksFromMarkdown(content)

    expect(links).toHaveLength(0)
  })

  it('extracts bare URLs', () => {
    const content = 'Visit https://example.com for info'
    const links = extractLinksFromMarkdown(content)

    expect(links).toHaveLength(1)
    expect(links[0].baseUrl).toBe('https://example.com')
  })
})

describe('deduplicateLinks', () => {
  it('merges links with same base URL but different anchors', () => {
    const links: ParsedLink[] = [
      { originalUrl: 'https://example.com#intro', baseUrl: 'https://example.com', title: 'Example', anchorFragment: 'intro', positions: [0] },
      { originalUrl: 'https://example.com#section', baseUrl: 'https://example.com', title: 'Example Site', anchorFragment: 'section', positions: [100] }
    ]

    const deduplicated = deduplicateLinks(links)

    expect(deduplicated).toHaveLength(1)
    expect(deduplicated[0].frequency).toBe(2)
    expect(deduplicated[0].anchorFragments).toEqual(['intro', 'section'])
  })

  it('keeps links with different query parameters separate', () => {
    const links: ParsedLink[] = [
      { originalUrl: 'https://example.com?page=1', baseUrl: 'https://example.com?page=1', title: 'Page 1', anchorFragment: null, positions: [0] },
      { originalUrl: 'https://example.com?page=2', baseUrl: 'https://example.com?page=2', title: 'Page 2', anchorFragment: null, positions: [100] }
    ]

    const deduplicated = deduplicateLinks(links)

    expect(deduplicated).toHaveLength(2)
  })
})
```

### 12.2 Integration Tests

**Sidebar Mode Switching**:
```typescript
describe('Links Sidebar Integration', () => {
  it('switches between flashcards and links modes', async () => {
    render(<ReadPage />)

    const linksButton = screen.getByRole('button', { name: /show links/i })
    fireEvent.click(linksButton)

    expect(screen.getByText(/Links \(/i)).toBeInTheDocument()
    expect(screen.queryByText(/Flashcards \(/i)).not.toBeInTheDocument()

    const cardsButton = screen.getByRole('button', { name: /show flashcards/i })
    fireEvent.click(cardsButton)

    expect(screen.getByText(/Flashcards \(/i)).toBeInTheDocument()
    expect(screen.queryByText(/Links \(/i)).not.toBeInTheDocument()
  })

  it('navigates to ingest page when clicking Ingest button', async () => {
    const mockNavigate = jest.fn()
    jest.mock('react-router-dom', () => ({
      useNavigate: () => mockNavigate
    }))

    render(<ReadPage />)

    // Switch to links mode
    fireEvent.click(screen.getByRole('button', { name: /show links/i }))

    // Click first ingest button
    const ingestButton = screen.getAllByText(/ingest/i)[0]
    fireEvent.click(ingestButton)

    expect(mockNavigate).toHaveBeenCalledWith('/ingest', expect.objectContaining({
      state: expect.objectContaining({
        wikipediaUrl: expect.any(String)
      })
    }))
  })
})
```

### 12.3 Manual Testing Checklist

**Functionality**:
- [ ] Links extracted correctly from Wikipedia article
- [ ] Markdown links `[text](url)` parsed
- [ ] Bare URLs parsed
- [ ] Empty links `[](url)` skipped
- [ ] Deduplication works for same article with different anchors
- [ ] Frequency counter accurate
- [ ] Anchor fragments displayed
- [ ] Ingest button navigates to /ingest page
- [ ] Open button opens in external browser
- [ ] Copy button copies URL to clipboard
- [ ] Sidebar collapse/expand works
- [ ] Mode switching (Cards ↔ Links) works
- [ ] Empty state shows when no links

**Accessibility**:
- [ ] Keyboard navigation through all links
- [ ] Focus indicators visible
- [ ] Screen reader announces link count
- [ ] ARIA labels correct
- [ ] High contrast mode readable

**Performance**:
- [ ] Large article (500+ links) loads within 1s
- [ ] No jank during scroll
- [ ] Mode switching instantaneous
- [ ] Link extraction doesn't block UI

**Edge Cases**:
- [ ] Article with no links shows empty state
- [ ] Article with 1 link displays correctly
- [ ] Inline editing updates links list
- [ ] Navigation back preserves sidebar state
- [ ] Dark mode styling correct

---

## 13. DESIGN RATIONALE

### Why Sidebar Instead of Context Menu?

**Context Menu Problems**:
1. **Breaks native browser UX**: Users expect right-click to show "Copy link", "Open in new tab", etc.
2. **Selection interference**: Event handlers for context menu can interfere with text selection
3. **Discoverability**: Hidden feature - users must know to right-click
4. **Limited scope**: Only shows one link at a time
5. **Accessibility**: Context menus are harder to make keyboard-accessible

**Sidebar Advantages**:
1. **Preserves native behavior**: Links behave like normal browser links
2. **Overview**: See ALL links at once, understand article structure
3. **Discoverability**: Visible toggle button in header
4. **Accessibility**: Standard keyboard navigation
5. **Familiar pattern**: Matches existing Flashcard sidebar
6. **No interference**: Completely separate from reading flow

### Why Deduplicate by Base URL?

**Problem**: Wikipedia articles often reference the same article multiple times:
```
Natural Selection (main)
Natural Selection#History
Natural Selection#Modern_synthesis
```

**If NOT Deduplicated**: User sees 3 identical-looking items:
```
┌─────────────────────┐
│ Natural Selection   │  ← Same article
│ [Ingest] [Open]    │
└─────────────────────┘
┌─────────────────────┐
│ Natural Selection   │  ← Same article
│ [Ingest] [Open]    │
└─────────────────────┘
┌─────────────────────┐
│ Natural Selection   │  ← Same article
│ [Ingest] [Open]    │
└─────────────────────┘
```
This is cluttered and confusing.

**With Deduplication**: Single entry with context:
```
┌─────────────────────────────────┐
│ Natural Selection               │
│ en.wikipedia.org/wiki/Natural...│
│ Appears 3 times • Sections: ... │
│ [Ingest] [Open] [Copy]         │
└─────────────────────────────────┘
```
Clean, informative, actionable.

**Ingest behavior**: When user clicks [Ingest], they ingest the BASE article (without anchor). This is correct - they want the full article, not just one section.

### Why Show Frequency?

**Use Case**: User sees "Appears 5 times" and thinks:
- "This must be an important concept in the article"
- "Maybe I should ingest this one first"
- "This article references Evolution heavily"

**Information Scent**: Helps users prioritize which links to explore.

**Optional Enhancement**: In future, could add "Sort by frequency" to bubble most-referenced links to top.

### Why Separate Ingest and Open Buttons?

**Different Actions, Different Contexts**:
- **Ingest**: User wants to add article to Trivium library for later reading
- **Open**: User wants to quickly check something in browser (reference, clarification)

**Making Ingest Primary** (left, solid background):
- Ingest is the PRIMARY use case for Trivium users
- Open is secondary (fallback to browser)
- Visual hierarchy guides user to preferred action

**Alternative Considered**: Single button with dropdown
```
[Ingest ▼]
  ├─ Open in Ingest
  └─ Open in Browser
```
**Rejected**: Too many clicks for common action (Open). Current design optimizes for both.

---

## 14. OPEN QUESTIONS & FUTURE CONSIDERATIONS

### 14.1 Should We Group Links by Domain?

**Proposal**: Group Wikipedia links separately from external links

**Example**:
```
Wikipedia (12 links)
├─ Natural Selection
├─ Evolution
└─ Charles Darwin

External Links (3 links)
├─ Stanford Encyclopedia
├─ Nature.com Article
└─ YouTube Video
```

**Pros**:
- Easier to find Wikipedia links specifically
- Reduces visual clutter
- Shows domain distribution at a glance

**Cons**:
- Adds complexity
- Requires collapsible groups
- May be overkill for typical articles

**Decision**: Defer to Phase 3. Current flat list is simpler and sufficient for MVP.

### 14.2 Should We Show "Already Ingested" Status?

**Proposal**: Check if link URL already exists in library, show indicator

**Example**:
```
┌─────────────────────────────────┐
│ Natural Selection          ✓    │ ← Checkmark badge
│ en.wikipedia.org/wiki/Natural...│
│ Already in your library          │
│ [View] [Open] [Copy]            │ ← "Ingest" becomes "View"
└─────────────────────────────────┘
```

**Pros**:
- Prevents duplicate ingestion
- Helps user navigate to existing copy
- Shows progress ("I've already saved 8/12 links!")

**Cons**:
- Requires database lookup for every link (performance)
- UI complexity (different button states)
- What if URL is slightly different but same article?

**Decision**: Defer to Phase 3. Needs careful design and performance testing.

### 14.3 Should We Preserve Anchor Info?

**Current Behavior**: Anchors shown as "Sections: History, Modern..."

**Alternative**: Expand to show sub-items
```
┌─────────────────────────────────┐
│ ▾ Natural Selection             │ ← Expandable
│   en.wikipedia.org/wiki/...     │
│                                 │
│   • Main article                │
│   • #History                    │
│   • #Modern_synthesis           │
│                                 │
│   [Ingest] [Open] [Copy]       │
└─────────────────────────────────┘
```

**Pros**:
- User can choose to ingest specific section
- Shows article structure
- More detailed information

**Cons**:
- More vertical space
- Complexity: which section to ingest?
- Wikipedia sections may not work well for ingestion (context missing)

**Decision**: Keep current simple approach. Frequency + section names is informative enough. User ingests full article, not sections.

### 14.4 Should Links Be Searchable/Filterable?

**Proposal**: Add search box at top of sidebar

**Example**:
```
┌─────────────────────────────────┐
│ Links (23)                  [×] │
├─────────────────────────────────┤
│ [🔍 Search links...]            │ ← New search input
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Natural Selection           │ │
│ └─────────────────────────────┘ │
```

**Pros**:
- Useful for articles with 50+ links
- Quick way to find specific domain or topic
- Feels modern and powerful

**Cons**:
- Adds UI complexity
- Most articles have <20 links (not needed)
- Keyboard shortcut conflicts (Ctrl+F already used for in-page search)

**Decision**: Defer to Phase 2 or 3. Add only if user feedback indicates need.

---

## 15. COMPARISON WITH EXISTING PATTERNS

### Sidebar Comparison: Flashcards vs Links

| Aspect | Flashcards Sidebar | Links Sidebar |
|--------|-------------------|---------------|
| **Width** | 384px (w-96) | 384px (w-96) |
| **Collapsed Width** | 48px (w-12) | 48px (w-12) |
| **Header** | "Flashcards (12)" | "Links (5)" |
| **Item Height** | Variable (expandable) | ~100px (fixed) |
| **Primary Action** | Delete | Ingest |
| **Secondary Action** | Expand/Collapse | Open in Browser |
| **Sort Options** | 6 options (display order, alpha, due, difficulty) | None (frequency-based) |
| **Empty State** | "No flashcards yet" | "No links in this article" |

**Consistency Goal**: Use same layout pattern, colors, spacing as FlashcardSidebar for familiarity.

---

## 16. LAYOUT GUIDE UPDATE

**Append to `/trivium/layout-guide.md`**:

```markdown
## Links Sidebar Feature

**Status**: IMPLEMENTED - Phase 20 (2025-10-20)

### Overview

The Links Sidebar displays all article links in a dedicated panel, replacing the context menu approach. This preserves native browser text selection while providing easy access to link management.

### Sidebar Modes

The reading view sidebar now supports TWO modes:
1. **Flashcards Mode** (existing) - Shows flashcards for current article
2. **Links Mode** (new) - Shows all links found in article

**Toggle Buttons** (in header):
```
[Cards] [Links]
```

### Links Sidebar Components

**LinksSidebar.tsx**:
- Container: 384px width (w-96), bg-muted, border-left
- Header: Title "Links (N)", collapse button
- Body: Scrollable list of LinkItem components
- Footer: Count display
- Empty State: Icon + message when no links

**LinkItem.tsx**:
- Card: bg-card, border, shadow-sm, rounded-lg
- Title: font-medium, text-sm, line-clamp-2
- URL Preview: text-xs, text-muted-foreground, truncate
- Frequency: "Appears N times • Sections: ..." (if N > 1)
- Actions:
  - [Ingest] - Primary button (Download icon)
  - [Open] - Outline button (ExternalLink icon)
  - [Copy] - Ghost icon button (Copy icon)

### Deduplication Logic

Links are automatically deduplicated by base URL:
- `https://en.wikipedia.org/wiki/Article` (base)
- `https://en.wikipedia.org/wiki/Article#Section1` (same base)
- `https://en.wikipedia.org/wiki/Article#Section2` (same base)

Result: 1 entry with frequency = 3

Query parameters are NOT deduplicated:
- `?page=1` and `?page=2` are treated as different links

### State Management

**Store**: `useLinksSidebarStore` (Zustand)
- `sidebarMode`: 'flashcards' | 'links'
- `isCollapsed`: boolean
- `links`: DeduplicatedLink[]
- `extractAndSetLinks(content)`: Parses markdown and updates links

**Persistence**: Only UI preferences persisted (mode, collapsed state). Links regenerated on each load.

### Integration Points

**ReadPage.tsx**:
```typescript
// Extract links when text loads
useEffect(() => {
  if (currentText) {
    extractAndSetLinks(currentText.content)
  }
}, [currentText?.content])

// Re-extract after inline editing
const handleSaveInlineEdit = async () => {
  // ... save logic ...
  extractAndSetLinks(editingContent)
}
```

### Keyboard Shortcuts (Proposed)

- `Ctrl+Shift+L` - Toggle Links sidebar (future enhancement)

### Accessibility

- Full keyboard navigation through Tab
- ARIA labels on all buttons
- Screen reader announcements for link count
- Tooltip on truncated URLs (shows full URL on hover)

### Styling

Uses existing design system:
- Colors: CSS variables (--card, --muted, --border)
- Fonts: Inter for UI text, consistent with flashcard sidebar
- Transitions: 300ms cubic-bezier (matches sidebar collapse animation)
- Hover: scale(1.02) + shadow-md
- Focus: 2px ring outline

### Performance

- Link extraction: Memoized, only runs when content changes
- Rendering: No virtualization needed for <100 links
- Deduplication: O(n) algorithm, <20ms for typical articles

### Migration Notes

**Removed**:
- `LinkContextMenu.tsx` component (deleted)
- Context menu handling in `ReadHighlighter.tsx`
- `onContextMenu` event interception

**Preserved**:
- Native browser context menu on links (right-click)
- Native text selection behavior (no interference)
- Link click behavior (opens in external browser when links enabled)
```

---

## CONCLUSION

This Links Sidebar design provides a comprehensive solution that:

1. **Eliminates text selection issues** - No event interception, native browser behavior preserved
2. **Improves discoverability** - All links visible at once, not hidden behind context menus
3. **Maintains consistency** - Follows existing Flashcard sidebar pattern
4. **Scales well** - Handles articles with many links gracefully through deduplication
5. **Enhances UX** - Clear actions (Ingest/Open/Copy), frequency indicators, tooltips

**Ready for Implementation** - All components, algorithms, and integration points specified in detail.

---

**Files**: `/Users/why/repos/trivium/LINKS_SIDEBAR_DESIGN.md`
