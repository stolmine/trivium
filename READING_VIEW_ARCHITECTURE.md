# Reading View Architecture Diagram

## Component Hierarchy

```
ReadPage (/routes/read/[id].tsx)
│
├─ Header (sticky)
│  ├─ Back Button
│  ├─ Title + Author
│  ├─ Progress Display
│  ├─ Links Toggle Button ← IDEAL LOCATION FOR SEARCH BUTTON
│  ├─ More Options Dropdown (Rename, Delete)
│  └─ Cards Toggle (mobile)
│
├─ Main Content Area (flex-1, overflow-y-auto)
│  │
│  └─ TextSelectionMenu (ContextMenuTrigger)
│     │
│     └─ ReadHighlighter
│        ├─ parseExcludedRanges() → cleanedContent, renderedContent, excludedRanges
│        │
│        ├─ useMemo: Convert readRanges to TextSegments
│        │  ├─ detectHeaderRanges()
│        │  ├─ renderedPosToCleanedPos() [position conversion]
│        │  └─ Merge/sort ranges
│        │
│        └─ Render: segments.map(segment => <span>{segment.text}</span>)
│           └─ CSS classes: .excluded-text, .read-header, or inline styles
│
└─ FlashcardSidebar (right, w-96 or w-12 when collapsed)
   └─ List of flashcards for this text


KEYBOARD SHORTCUTS
│
├─ Local (TextSelectionMenu)
│  ├─ Ctrl+M: Toggle read on selected text
│  └─ Ctrl+N: Create flashcard from selected text
│
└─ Global (useKeyboardShortcuts hook)
   ├─ Ctrl+L: Toggle links
   ├─ Ctrl+B: Toggle sidebar
   ├─ Ctrl+1/2/3: Navigate
   ├─ Ctrl+/: Show shortcuts
   └─ Ctrl+N: Open ingest (CONFLICT!)


STATE MANAGEMENT (Zustand Stores)
│
├─ Reading Store (reading.ts)
│  ├─ currentText: Text | null
│  ├─ readRanges: ReadRange[] (positions in RENDERED space)
│  ├─ excludedRanges: ExcludedRange[] (positions in RENDERED space)
│  ├─ totalProgress: number
│  ├─ paragraphs: Paragraph[]
│  └─ currentParagraphIndex: number
│
└─ Settings Store (settings.ts)
   └─ linksEnabled: boolean (localStorage persisted)


TEXT REPRESENTATION LAYERS
│
Original Content (from backend)
│  │── Contains: [[exclude]]...[[/exclude]], [link text](url), == Header ==
│  │
├─ parseExcludedRanges()
│  │
├─ Cleaned Content (exclude tags removed, markdown remains)
│  │── Contains: [link text](url), == Header ==
│  │
├─ Rendered Content (all markdown stripped)
│  │── Contains: link text, Header (no special chars)
│  │── This is what user sees in DOM
│  │── This is what readRanges positions reference
│  │
└─ Segment Objects (rendered, styled groups)
   ├─ text: string (from cleaned content)
   ├─ isRead: boolean
   ├─ isExcluded: boolean
   └─ isHeader: boolean


POSITION SPACE CONVERSION
│
DOM Selection Position (user clicks/drags)
│    ↓ (textContent extraction)
Rendered Space Position (after markdown stripped)
│    ↓ (renderedPosToCleanedPos)
Cleaned Space Position (with original markdown)
│    ↓ (used in segments/highlighting)
Final Segment Index


HIGHLIGHTING FLOW
│
User selects text in DOM
│    ↓
TextSelectionMenu detects selection
│    ↓
Calculate position in rendered space
│    ↓
markRangeAsRead(startPos, endPos) in rendered space
│    ↓
Store updates readRanges array
│    ↓
ReadHighlighter useMemo recomputes segments
│    ↓
Render segments with isRead=true styling
│    └─ Style: backgroundColor: black, color: white


API INTEGRATION (Tauri Commands)
│
useReadingStore actions
│    ↓
api.reading.* / api.texts.*
│    ↓
Tauri backend
│    ↓
src-tauri/src/commands/reading.rs
│    ↓
Database operations


SEARCH IMPLEMENTATION ARCHITECTURE (Proposed)
│
SearchBar Component (new)
│    ↓
useKeyboardShortcuts hook
│  ├─ Ctrl+F: Open search
│  ├─ Ctrl+G: Next match
│  └─ Ctrl+Shift+G: Prev match
│
Search Store (new, src/lib/stores/search.ts)
│  ├─ query: string
│  ├─ matches: SearchMatch[] (positions in rendered space)
│  ├─ currentMatchIndex: number
│  └─ visible: boolean
│
searchEngine utility (new, src/lib/utils/searchEngine.ts)
│  ├─ findMatches(content, query): SearchMatch[]
│  ├─ handleCaseSensitive: boolean
│  └─ handleWholeWord: boolean
│
ReadHighlighter modifications
│  ├─ Accept searchMatches prop
│  ├─ Add .search-match highlighting layer
│  └─ Merge with read/excluded highlights
│
CSS additions (index.css)
│  ├─ .search-match { background: yellow }
│  └─ .search-match.current { background: darker yellow, box-shadow }


CRITICAL FUNCTIONS FOR SEARCH

parseExcludedRanges(content)
│  Returns: { cleanedContent, renderedContent, excludedRanges }
│  Why: Get renderedContent (what user sees) for searching
│
renderedPosToCleanedPos(renderedPos, cleanedContent)
│  Converts: DOM position → internal position
│  Why: Handle markdown links/headers that shift positions
│
stripMarkdownLinks(text)
│  Removes: [text](url) → text, == header == → header
│  Why: Positions in rendered space don't include markdown syntax


DATA FLOW WITH SEARCH

1. User presses Ctrl+F
   → searchStore.setVisible(true)
   → SearchBar mounts and focuses

2. User types "hello"
   → searchStore.setQuery("hello")
   → searchEngine.findMatches(currentText.content, "hello")
   → Returns matches array with positions in rendered space
   → searchStore.setMatches(matches)

3. ReadHighlighter receives:
   - readRanges (existing)
   - searchMatches (new)
   
4. ReadHighlighter renders:
   - Segments with isRead highlighting
   - Plus searchMatches layer (different color)

5. User presses Ctrl+G (next)
   → searchStore.setCurrentMatchIndex(index + 1)
   → Component scrolls to current match
   → Highlights current match differently

