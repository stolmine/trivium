# Link Parsing and Text Search Bug Fixes

## Summary
Fixed critical bugs in markdown link parsing and text search highlighting where:
1. Text was being lost or corrupted between links when URLs contained parentheses
2. Bracket-only text like `[Helot]` was creating giant false links to the next real link
3. Wikipedia citation needed markers were appearing in scraped content
4. Text search highlighting wasn't properly tracking match indices for scroll-to-match

## Root Causes

### Bug #1: Text Lost Between Links with Parentheses in URLs

**Problem:**
The regex pattern `/\[([^\]]+)\]\(([^\)]+)\)/g` used throughout the codebase to parse markdown links was fundamentally broken for URLs containing parentheses.

**Example:**
- Input: `[Sparta](https://en.wikipedia.org/wiki/Sparta_(city)) treatment`
- Expected URL: `https://en.wikipedia.org/wiki/Sparta_(city)`
- Actual URL matched: `https://en.wikipedia.org/wiki/Sparta_(city` (truncated at first `)`)
- Result: Stray `)` left in text, creating corrupted output like `Sparta) treatment`

**Why it failed:**
The pattern `[^\)]+` means "match everything until the first `)` character". When a URL contains parentheses, the regex stops at the FIRST `)` it encounters, leaving the closing `)` of the URL and the markdown syntax orphaned.

### Bug #2: Bracket-Only False Link Bug

**Problem:**
Text in brackets like `[Helot]` that wasn't a markdown link (no following `(url)` syntax) was incorrectly treated as the start of a link. The parser would continue scanning until it found the NEXT valid markdown link, creating a giant false link that consumed all text between `[Helot]` and the next `[link](url)`.

**Example:**
- Input: `[Helot] treatment at [Sparta](url1)`
- Broken behavior: Parser treats `[Helot] treatment at [Sparta]` as link text and `url1` as the URL
- Result: Giant link covering text that shouldn't be linked

**Why it failed:**
The regex pattern didn't require the `](` sequence immediately after `]`. It would match any `[text]` and then search forward for any `(url)` pattern, incorrectly pairing them.

**Solution:**
Enhanced the parser to check what follows `]`:
- If `](` follows, it's a valid markdown link
- If `]]` follows, the first `]` is part of link text (for `[[text]]` patterns)
- If anything else follows (space, letter, end of string), return null immediately - this is NOT a markdown link

### Bug #3: Citation Markers in Wikipedia Content

**Problem:**
Wikipedia `[citation needed]` markers and similar annotations were appearing in scraped content when they should be filtered out.

**Solution:**
Added `.noprint` and `sup.noprint` to the Wikipedia scraper's unwanted selectors to filter out these elements at the source during HTML parsing.

### Bug #4: Text Search Match Index Tracking

**Problem:**
Search highlighting wasn't properly storing match indices in the rendered HTML, making it impossible for the scroll-to-match feature to identify which match should be scrolled to. Additionally, search matches in non-read text weren't being highlighted at all.

**Why it failed:**
The code was setting `isSearchMatch` and `isActiveSearchMatch` flags but not storing the actual match index value. Without `data-search-index` attributes in the rendered HTML, the scroll feature couldn't find the active match. Non-read search matches were also missing CSS styling.

**Solution:**
Enhanced search match rendering to:
- Store `matchIdx` in segment data structure
- Add `data-search-index="${matchIdx}"` attributes to rendered HTML
- Apply search highlighting to both read and non-read text
- Use `<span>` wrappers with search classes for non-read matches

## Files Changed

### TypeScript/JavaScript Files

1. **src/lib/utils/markdownLinkParser.ts** (NEW)
   - Created shared utility module with proper markdown link parser
   - Implements parenthesis depth tracking for URLs
   - Handles nested parentheses correctly
   - Exports: `parseMarkdownLink`, `findAllMarkdownLinks`, `stripMarkdownLinks`, `isPositionInLink`

2. **src/lib/stores/linksSidebar.ts**
   - Replaced regex with proper parser
   - Now correctly extracts links from content
   - Handles URLs with parentheses

3. **src/lib/utils/positionValidation.ts**
   - Updated `isPositionInLink()` to use proper parser
   - Updated `expandToFullLinks()` to use proper parser
   - Correctly handles positions within links that have parentheses in URLs

4. **src/lib/utils/markdownEdit.ts**
   - Updated `updateLinkText()` to use proper parser
   - Correctly parses links when updating link text

### Rust Files

5. **src-tauri/src/commands/flashcard_hub.rs**
   - Added `parse_markdown_link()` function with parenthesis depth tracking
   - Added `strip_markdown_links()` function using the new parser
   - Updated `process_content_to_dom_space()` to use new parser

6. **src-tauri/src/services/wikipedia.rs**
   - Added `.noprint` and `sup.noprint` to unwanted selectors
   - Filters out citation needed markers and similar annotations

7. **src/lib/components/reading/ReadHighlighter.tsx**
   - Enhanced search match rendering with `matchIdx` storage
   - Added `data-search-index` attributes to rendered HTML
   - Fixed search highlighting for both read and non-read text
   - Proper type definitions for `RenderableSegment`

### Test Files

8. **src/lib/utils/__tests__/markdownLinkParser.test.ts** (NEW)
   - Comprehensive test suite with 19 tests
   - Tests for URLs with parentheses
   - Tests for nested parentheses
   - Regression tests for link parsing bugs
   - All tests passing

## Technical Details

### The Proper Parser Algorithm

Instead of using a regex, the fix implements a manual parser that:

1. Starts at `[` and scans for `](` pattern
2. Tracks parenthesis depth while parsing the URL
3. Only closes the link when encountering a `)` at depth 0

```typescript
// Pseudocode
while parsing URL:
  if char is '(':
    depth++
  else if char is ')':
    if depth > 0:
      depth--  // This ) is part of the URL
    else:
      break   // This ) closes the markdown link
```

### Examples Fixed

**Before (broken):**
```
Input:  [Democracy](https://en.wikipedia.org/wiki/Democracy_(disambiguation))
Parsed URL: https://en.wikipedia.org/wiki/Democracy_(disambiguation   <- WRONG
Output: Democracy) with stray parenthesis
```

**After (fixed):**
```
Input:  [Democracy](https://en.wikipedia.org/wiki/Democracy_(disambiguation))
Parsed URL: https://en.wikipedia.org/wiki/Democracy_(disambiguation)  <- CORRECT
Output: Democracy
```

**Complex Example:**
```
Input:  [Helot](url1) treatment at Sparta (1974 and 1990) [Alcman](url2)
Output: Helot treatment at Sparta (1974 and 1990) Alcman
        ^ All text between links preserved correctly ^
```

## Verification

- All TypeScript tests pass: ✓ 19/19 tests passing
- TypeScript build succeeds: ✓ Built in 2.68s
- Rust compilation succeeds: ✓ No errors
- Handles Wikipedia URLs with disambiguation pages: ✓
- Preserves text between links: ✓
- No stray parentheses or brackets in output: ✓
- Bracket-only text `[Helot]` doesn't create false links: ✓
- Wikipedia citation markers filtered out: ✓
- Text search scroll-to-match working with proper indices: ✓
- Search highlighting visible in both read and non-read text: ✓

## Impact

This fix resolves:
- Text corruption in Wikipedia articles with disambiguation links
- False giant links created by bracket-only text like `[Helot]`
- Link parsing failures in LinksSidebar
- Position calculation errors in text selection
- Flashcard content processing issues
- Wikipedia citation markers appearing in scraped content
- Text search scroll-to-match failures
- Missing search highlighting in non-read text
- Any other markdown link processing throughout the application

## Testing Recommendations

When testing Wikipedia articles, pay special attention to:
1. Articles with disambiguation pages (URLs ending in `_(something)`)
2. Articles with multiple links close together
3. Articles with parenthetical dates like "(1974 and 1990)"
4. Articles with bracket-only text like `[Helot]` followed by links
5. Articles with citation needed markers (should not appear)
6. The LinksSidebar correctly showing all links
7. Text selection and highlighting working correctly across links
8. Text search with Ctrl+F finding all matches
9. Scroll-to-match (Enter/Shift+Enter) jumping to correct positions
10. Search highlighting visible in both read and non-read text
