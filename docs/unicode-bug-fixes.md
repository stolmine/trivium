# Unicode Character Handling Bug Fixes

## Summary

The Trivium reading progress system has three critical bugs related to Unicode character handling that cause incorrect progress calculations and text positioning for any content containing non-ASCII characters (emoji, non-Latin scripts, etc.).

## Bug 1: Excluded Character Count Uses Bytes Instead of Characters

### Location
`/src-tauri/src/services/parser.rs:104`

### Current Code
```rust
pub fn calculate_excluded_character_count(content: &str) -> i64 {
    let re = Regex::new(r"\[\[exclude\]\](.*?)\[\[/exclude\]\]").unwrap();
    let mut total_excluded = 0i64;

    for cap in re.captures_iter(content) {
        if let Some(excluded_text) = cap.get(1) {
            total_excluded += excluded_text.as_str().len() as i64;  // BUG: counts bytes
        }
    }

    total_excluded
}
```

### Problem
- `.len()` returns the number of BYTES in UTF-8 encoding
- For ASCII characters: 1 byte = 1 character (works correctly)
- For Unicode: emoji and non-Latin scripts use 2-4 bytes per character
- Example: "👋" is 1 character but 4 bytes

### Impact
- Progress calculation is wrong for excluded sections containing Unicode
- Excluded text "[[exclude]]Hello 👋[[/exclude]]" would count as 10 bytes (9 intended) instead of 7 characters
- This creates a 3-character error in the total countable character calculation
- Progress percentages will be inflated or deflated incorrectly

### Fix
```rust
pub fn calculate_excluded_character_count(content: &str) -> i64 {
    let re = Regex::new(r"\[\[exclude\]\](.*?)\[\[/exclude\]\]").unwrap();
    let mut total_excluded = 0i64;

    for cap in re.captures_iter(content) {
        if let Some(excluded_text) = cap.get(1) {
            total_excluded += excluded_text.as_str().chars().count() as i64;  // FIXED: counts characters
        }
    }

    total_excluded
}
```

### Severity
**HIGH** - Affects any text with Unicode in excluded sections

---

## Bug 2: Header Character Count Uses Bytes Instead of Characters

### Location
`/src-tauri/src/services/parser.rs:136` (from recent changes)

### Current Code
```rust
pub fn calculate_header_character_count(content: &str) -> i64 {
    let header_ranges = detect_header_ranges(content);
    header_ranges.iter().map(|h| h.end_position - h.start_position).sum()
}
```

### Problem
The `detect_header_ranges` function returns ranges based on byte positions from regex matches:
```rust
pub fn detect_header_ranges(content: &str) -> Vec<HeaderRange> {
    let mut header_ranges = Vec::new();
    let re = Regex::new(r"(?m)^(={2,})\s*(.+?)\s*\1$").unwrap();

    for cap in re.captures_iter(content) {
        if let Some(full_match) = cap.get(0) {
            let start = full_match.start() as i64;  // BUG: byte position
            let end = full_match.end() as i64;      // BUG: byte position
            header_ranges.push(HeaderRange {
                start_position: start,
                end_position: end,
            });
        }
    }

    header_ranges
}
```

Regex `.start()` and `.end()` return BYTE offsets, not character positions!

### Impact
- Header character counts are wrong for headers containing Unicode
- Example: "== Hello 👋 ==" has 13 characters but returns 16 bytes
- Progress calculation subtracts wrong amount of header characters
- Inconsistent with how `content_length` is calculated (uses `.chars().count()`)

### Fix

Option 1: Convert byte offsets to character offsets
```rust
pub fn detect_header_ranges(content: &str) -> Vec<HeaderRange> {
    let mut header_ranges = Vec::new();
    let re = Regex::new(r"(?m)^(={2,})\s*(.+?)\s*\1$").unwrap();

    for cap in re.captures_iter(content) {
        if let Some(full_match) = cap.get(0) {
            // Convert byte offsets to character offsets
            let start_char = content[..full_match.start()].chars().count() as i64;
            let header_text = &content[full_match.start()..full_match.end()];
            let end_char = start_char + header_text.chars().count() as i64;

            header_ranges.push(HeaderRange {
                start_position: start_char,
                end_position: end_char,
            });
        }
    }

    header_ranges
}
```

Option 2: Count characters directly (simpler, slightly less efficient)
```rust
pub fn calculate_header_character_count(content: &str) -> i64 {
    let re = Regex::new(r"(?m)^(={2,})\s*(.+?)\s*\1$").unwrap();
    let mut total_header_chars = 0i64;

    for cap in re.captures_iter(content) {
        if let Some(full_match) = cap.get(0) {
            total_header_chars += full_match.as_str().chars().count() as i64;
        }
    }

    total_header_chars
}
```

### Severity
**HIGH** - Affects any Wikipedia article or text with headers containing Unicode

---

## Bug 3: Paragraph Detection Uses Inconsistent Byte/Character Positions

### Location
`/src-tauri/src/services/parser.rs:28-59`

### Current Code
```rust
pub fn detect_paragraphs(content: &str) -> Vec<Paragraph> {
    let mut paragraphs = Vec::new();
    let mut current_position = 0;  // Used as both byte and char position
    let mut paragraph_index = 0;

    let parts: Vec<&str> = content.split("\n\n").collect();

    for part in parts {
        let trimmed = part.trim();
        if trimmed.is_empty() {
            continue;
        }

        // .find() returns byte offset, not character position!
        let start = content[current_position..]
            .find(trimmed)
            .map(|pos| current_position + pos)
            .unwrap_or(current_position);

        let end = start + trimmed.len();  // BUG: adds byte length to byte position
        let char_count = trimmed.chars().count() as i64;  // Correct

        paragraphs.push(Paragraph {
            paragraph_index,
            start_position: start as i64,  // WRONG: byte position
            end_position: end as i64,      // WRONG: byte position
            character_count: char_count,   // CORRECT: character count
        });

        paragraph_index += 1;
        current_position = end;
    }
    // ...
}
```

### Problem
- String slicing `content[current_position..]` works with BYTE indices
- `.find()` returns BYTE offset
- `trimmed.len()` returns BYTE length
- But these are stored as if they were character positions
- `character_count` is correctly calculated but positions are wrong

### Impact
- Paragraph boundaries are wrong for paragraphs containing Unicode
- Frontend uses `substring(start, end)` which works with character positions
- This causes paragraphs to be sliced at wrong positions
- Text display may show wrong content or crash on invalid Unicode boundaries
- Read range marking may fail or mark wrong ranges

### Fix
```rust
pub fn detect_paragraphs(content: &str) -> Vec<Paragraph> {
    let mut paragraphs = Vec::new();
    let mut current_char_position = 0i64;
    let mut paragraph_index = 0;

    let parts: Vec<&str> = content.split("\n\n").collect();

    // Iterate through content with character positions
    for part in parts {
        let trimmed = part.trim();
        if trimmed.is_empty() {
            // Skip empty paragraphs but advance position
            current_char_position += part.chars().count() as i64;
            current_char_position += 2; // for "\n\n" separator
            continue;
        }

        // Find the start position in characters
        let remaining_content = &content.chars()
            .skip(current_char_position as usize)
            .collect::<String>();

        let start_char = if let Some(byte_pos) = remaining_content.find(trimmed) {
            // Convert byte position to character position
            let prefix = &remaining_content[..byte_pos];
            current_char_position + prefix.chars().count() as i64
        } else {
            current_char_position
        };

        let char_count = trimmed.chars().count() as i64;
        let end_char = start_char + char_count;

        paragraphs.push(Paragraph {
            paragraph_index,
            start_position: start_char,
            end_position: end_char,
            character_count: char_count,
        });

        paragraph_index += 1;
        current_char_position = end_char;
    }

    // Handle single paragraph case
    if paragraphs.is_empty() && !content.trim().is_empty() {
        let trimmed = content.trim();
        let char_count = trimmed.chars().count() as i64;
        paragraphs.push(Paragraph {
            paragraph_index: 0,
            start_position: 0,
            end_position: char_count,
            character_count: char_count,
        });
    }

    paragraphs
}
```

Alternative: Simpler approach using character indices throughout
```rust
pub fn detect_paragraphs(content: &str) -> Vec<Paragraph> {
    let mut paragraphs = Vec::new();
    let mut paragraph_index = 0;

    // Convert to Vec<char> for easy character indexing
    let chars: Vec<char> = content.chars().collect();
    let mut pos = 0;

    while pos < chars.len() {
        // Skip whitespace and find paragraph start
        while pos < chars.len() && (chars[pos] == '\n' || chars[pos] == '\r' || chars[pos] == ' ') {
            pos += 1;
        }

        if pos >= chars.len() {
            break;
        }

        let start = pos;

        // Find paragraph end (double newline or end of content)
        let mut consecutive_newlines = 0;
        while pos < chars.len() {
            if chars[pos] == '\n' {
                consecutive_newlines += 1;
                if consecutive_newlines >= 2 {
                    break;
                }
            } else if chars[pos] != '\r' {
                consecutive_newlines = 0;
            }
            pos += 1;
        }

        // Find the actual end (before trailing newlines)
        let mut end = pos;
        while end > start && (chars[end - 1] == '\n' || chars[end - 1] == '\r' || chars[end - 1] == ' ') {
            end -= 1;
        }

        if end > start {
            let char_count = (end - start) as i64;
            paragraphs.push(Paragraph {
                paragraph_index,
                start_position: start as i64,
                end_position: end as i64,
                character_count: char_count,
            });
            paragraph_index += 1;
        }
    }

    paragraphs
}
```

### Severity
**HIGH** - Affects all paragraph navigation and display for Unicode text

---

## Bug 4: Frontend/Backend Character Position Mismatch

### Locations
- Backend: `/src-tauri/src/commands/texts.rs:27`
- Frontend: `/src/lib/components/reading/TextSelectionMenu.tsx:36`

### Problem

**Backend (Rust):**
```rust
let content_length = request.content.chars().count() as i64;
```
- Counts Unicode scalar values (one emoji = 1 character)

**Frontend (JavaScript):**
```typescript
const startPosition = preCaretRange.toString().length
const endPosition = startPosition + selection.toString().length
```
- JavaScript `.length` counts UTF-16 code units
- Most characters = 1 code unit
- Emoji and rare Unicode = 2 code units (surrogate pairs)

### Example
Text: "Hello 👋 World"
- Rust `.chars().count()`: 12 characters
- JavaScript `.length`: 13 code units (👋 is a surrogate pair)

### Impact
- Read ranges selected in frontend have wrong positions when sent to backend
- For text with emoji: selection at position 10 in JS might be position 9 in Rust
- Progress highlighting may be off by 1 character per emoji before the selection
- Rare but confusing bug that only affects emoji-heavy text

### Fix Options

**Option 1: Convert Backend to UTF-16 Code Units (Recommended)**

This makes the backend match JavaScript's behavior, which is simpler since the frontend is the source of truth for user selections.

```rust
// In src-tauri/src/commands/texts.rs
let content_length = request.content.encode_utf16().count() as i64;
```

**Option 2: Convert Frontend to Unicode Scalar Values**

More complex, requires handling surrogate pairs correctly:

```typescript
function countUnicodeCharacters(text: string): number {
    // Use Array.from or [...text] to get proper Unicode characters
    return Array.from(text).length;
}

const startPosition = countUnicodeCharacters(preCaretRange.toString())
const endPosition = startPosition + countUnicodeCharacters(selection.toString())
```

**Option 3: Add Position Translation Layer**

Keep both systems but translate between them:

```rust
// Utility to convert between UTF-16 and Unicode positions
pub fn utf16_to_char_position(content: &str, utf16_pos: usize) -> usize {
    let mut char_pos = 0;
    let mut utf16_count = 0;

    for ch in content.chars() {
        if utf16_count >= utf16_pos {
            break;
        }
        utf16_count += ch.len_utf16();
        char_pos += 1;
    }

    char_pos
}

pub fn char_to_utf16_position(content: &str, char_pos: usize) -> usize {
    content.chars().take(char_pos).map(|c| c.len_utf16()).sum()
}
```

### Recommendation
**Option 1** - Convert backend to UTF-16 code units. This is the simplest and most consistent approach since:
1. Frontend is the source of user selections
2. All positions flow from frontend to backend
3. JavaScript's UTF-16 is the standard for web applications
4. Simpler to maintain one standard throughout

### Severity
**MEDIUM** - Only affects texts with emoji or rare Unicode characters, but causes confusing UX issues

---

## Recommended Fix Priority

1. **IMMEDIATE (Critical bugs):**
   - Bug 1: Excluded character count (one-line fix)
   - Bug 2: Header character count (one-line fix if using simple approach)
   - Bug 3: Paragraph detection (requires careful refactoring)

2. **NEXT SPRINT (Architecture issue):**
   - Bug 4: UTF-16 vs Unicode mismatch (requires coordinated frontend/backend changes)

## Testing Requirements

After fixes are applied, add these test cases:

### Test 1: Excluded Text with Unicode
```rust
#[test]
fn test_excluded_character_count_unicode() {
    let content = "Hello [[exclude]]👋 世界 测试[[/exclude]] World";
    let excluded = calculate_excluded_character_count(content);
    assert_eq!(excluded, 8); // "👋 世界 测试" = 8 characters (not bytes)
}
```

### Test 2: Header with Unicode
```rust
#[test]
fn test_header_character_count_unicode() {
    let content = "== Hello 👋 World ==\nContent";
    let header_count = calculate_header_character_count(content);
    assert_eq!(header_count, 20); // "== Hello 👋 World ==" = 20 characters
}
```

### Test 3: Paragraph with Unicode
```rust
#[test]
fn test_paragraph_detection_unicode() {
    let content = "First 👋\n\nSecond 世界";
    let paragraphs = detect_paragraphs(content);
    assert_eq!(paragraphs.len(), 2);
    assert_eq!(paragraphs[0].character_count, 7); // "First 👋"
    assert_eq!(paragraphs[1].character_count, 9); // "Second 世界"
}
```

### Test 4: UTF-16 Consistency
```typescript
// Frontend test
test('character counting matches backend', () => {
    const text = "Hello 👋 World";
    const length = text.length; // JavaScript UTF-16
    // This should match backend's encode_utf16().count()
    expect(length).toBe(13);
});
```

## Implementation Checklist

- [ ] Fix `calculate_excluded_character_count` to use `.chars().count()`
- [ ] Fix `calculate_header_character_count` to count characters not bytes
- [ ] Fix `detect_header_ranges` to return character positions
- [ ] Refactor `detect_paragraphs` to use character positions throughout
- [ ] Add unit tests for all Unicode scenarios
- [ ] Test with real Wikipedia articles containing Unicode
- [ ] Test with emoji-heavy text
- [ ] Test with Chinese/Japanese/Arabic text
- [ ] Decide on UTF-16 vs Unicode strategy (Option 1 recommended)
- [ ] Implement UTF-16 conversion if choosing Option 1
- [ ] Update documentation with character counting approach
- [ ] Add integration tests for frontend/backend consistency

## Migration Notes

These changes affect stored data in the database:
- `texts.content_length` - may need recalculation if changing to UTF-16
- `paragraphs.start_position`, `end_position` - may need recalculation for Unicode texts
- `read_ranges.start_position`, `end_position` - existing data may be inconsistent

**Recommendation:** Add a database migration to recalculate all positions:

```sql
-- Migration: recalculate_positions_for_unicode.sql
-- Note: This needs to be done in Rust code, not pure SQL

-- Mark all texts for position recalculation
ALTER TABLE texts ADD COLUMN needs_position_recalc INTEGER DEFAULT 1;
```

Then add a maintenance command to recalculate positions for all texts.
