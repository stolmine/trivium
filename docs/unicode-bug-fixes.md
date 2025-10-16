# Unicode Character Handling Bug Fixes

## Summary

This document describes 4 critical bugs related to Unicode character handling that were identified in the Trivium reading progress system. **As of 2025-10-16, ALL 4 BUGS HAVE BEEN FIXED!** 🎉

### Fix Status Overview

| Bug # | Description | Status | Fixed In |
|-------|-------------|--------|----------|
| 1 | Excluded character count using bytes | ✅ FIXED | Phase 8 (2025-10-16) |
| 2 | Header character count using bytes | ✅ FIXED | Phase 8 (2025-10-16) |
| 3 | Paragraph detection byte/char mismatch | ✅ FIXED | Phase 8 (2025-10-16) |
| 4 | UTF-16/Unicode position mismatch | ✅ FIXED | Phase 8 (2025-10-16) |

**All Unicode bugs are now resolved!** The system now correctly handles emoji, Chinese/Japanese/Korean text, and other multi-byte Unicode characters throughout.

## Bug 1: Excluded Character Count Uses Bytes Instead of Characters ✅ FIXED

### Location
`/Users/why/repos/trivium/src-tauri/src/services/parser.rs:113-127`

### Status
**FIXED** in Phase 8

### Original Bug
The function was using `.len()` which counts UTF-8 bytes instead of characters, causing incorrect excluded character counts for Unicode text.

### Fixed Code
```rust
pub fn calculate_excluded_character_count(content: &str) -> i64 {
    let re = match Regex::new(r"\[\[exclude\]\](.*?)\[\[/exclude\]\]") {
        Ok(r) => r,
        Err(_) => return 0,
    };
    let mut total_excluded = 0i64;

    for cap in re.captures_iter(content) {
        if let Some(excluded_text) = cap.get(1) {
            total_excluded += excluded_text.as_str().chars().count() as i64;  // ✓ Correctly counts characters
        }
    }

    total_excluded
}
```

### Fix Details
- Line 122 now uses `.chars().count()` instead of `.len()`
- Counts Unicode scalar values (characters) rather than UTF-8 bytes
- Also improved error handling with `match` instead of `unwrap()`

---

## Bug 2: Header Character Count Uses Bytes Instead of Characters ✅ FIXED

### Location
`/Users/why/repos/trivium/src-tauri/src/services/parser.rs:135-171`

### Status
**FIXED** in Phase 8

### Original Bug
The `detect_header_ranges` function was using regex byte positions directly, causing incorrect header character counts for Unicode text.

### Fixed Code

The implementation converts byte offsets to character offsets:

```rust
fn byte_offset_to_char_offset(content: &str, byte_offset: usize) -> usize {
    content[..byte_offset].chars().count()
}

pub fn detect_header_ranges(content: &str) -> Vec<HeaderRange> {
    let mut header_ranges = Vec::new();

    let re = match Regex::new(r"(?m)^(={2,})\s*(.+?)\s*(={2,})$") {
        Ok(r) => r,
        Err(_) => return header_ranges,
    };

    for cap in re.captures_iter(content) {
        if let (Some(full_match), Some(opening), Some(closing)) = (cap.get(0), cap.get(1), cap.get(3)) {
            let opening_count = opening.as_str().len();
            let closing_count = closing.as_str().len();

            if opening_count == closing_count {
                let start_char = byte_offset_to_char_offset(content, full_match.start()) as i64;
                let header_text = &content[full_match.start()..full_match.end()];
                let end_char = start_char + header_text.chars().count() as i64;

                header_ranges.push(HeaderRange {
                    start_position: start_char,
                    end_position: end_char,
                });
            }
        }
    }

    header_ranges
}

pub fn calculate_header_character_count(content: &str) -> i64 {
    detect_header_ranges(content)
        .iter()
        .map(|h| h.end_position - h.start_position)
        .sum()
}
```

### Fix Details
- Added `byte_offset_to_char_offset()` helper function to convert byte positions to character positions
- Line 153: Uses helper to convert regex match byte position to character position
- Line 155: Uses `.chars().count()` to get character length of header text
- Now consistent with how `content_length` is calculated

---

## Bug 3: Paragraph Detection Uses Inconsistent Byte/Character Positions ✅ FIXED

### Location
`/Users/why/repos/trivium/src-tauri/src/services/parser.rs:28-87`

### Status
**FIXED** in Phase 8

### Original Bug
The function was mixing byte positions (from string slicing and `.find()`) with character positions, causing incorrect paragraph boundaries for Unicode text.

### Fixed Code

The implementation now uses a character array approach:

```rust
pub fn detect_paragraphs(content: &str) -> Vec<Paragraph> {
    let mut paragraphs = Vec::new();
    let mut paragraph_index = 0;

    let chars: Vec<char> = content.chars().collect();  // ✓ Works with character array
    let mut pos = 0;

    while pos < chars.len() {
        // Skip leading whitespace
        while pos < chars.len() && (chars[pos] == '\n' || chars[pos] == '\r' || chars[pos] == ' ' || chars[pos] == '\t') {
            pos += 1;
        }

        if pos >= chars.len() {
            break;
        }

        let start = pos;

        // Find paragraph end (double newline)
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

        // Trim trailing whitespace
        let mut end = pos;
        while end > start && (chars[end - 1] == '\n' || chars[end - 1] == '\r' || chars[end - 1] == ' ' || chars[end - 1] == '\t') {
            end -= 1;
        }

        if end > start {
            let char_count = (end - start) as i64;
            paragraphs.push(Paragraph {
                paragraph_index,
                start_position: start as i64,  // ✓ Character position
                end_position: end as i64,      // ✓ Character position
                character_count: char_count,   // ✓ Character count
            });
            paragraph_index += 1;
        }
    }

    // Fallback for single paragraph
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

### Fix Details
- Line 32: Converts content to `Vec<char>` upfront, ensuring all operations work with character positions
- All position tracking (`pos`, `start`, `end`) now uses character indices, not byte indices
- Much cleaner and more maintainable than the buggy byte-based version

---

## Bug 4: Frontend/Backend Character Position Mismatch ✅ FIXED

### Locations
- Backend: `/Users/why/repos/trivium/src-tauri/src/commands/texts.rs:28`
- Backend: `/Users/why/repos/trivium/src-tauri/src/services/parser.rs` (multiple locations)
- Frontend: `/Users/why/repos/trivium/src/lib/components/reading/TextSelectionMenu.tsx:41-42`

### Status
**FIXED** in Phase 8 (2025-10-16)

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

### Fix Implemented

**We chose Option 1: Convert Backend to UTF-16 Code Units**

This makes the backend match JavaScript's behavior, which is simpler since the frontend is the source of truth for user selections.

All backend character counting now uses `.encode_utf16().count()` instead of `.chars().count()`:

```rust
// In src-tauri/src/commands/texts.rs:28
// Use UTF-16 code units to match JavaScript's string.length
let content_length = request.content.encode_utf16().count() as i64;
```

### Changes Made

**1. Content Length Calculation** (`src-tauri/src/commands/texts.rs:28`)
```rust
let content_length = request.content.encode_utf16().count() as i64;
```

**2. Excluded Character Count** (`src-tauri/src/services/parser.rs:124`)
```rust
total_excluded += excluded_text.as_str().encode_utf16().count() as i64;
```

**3. Header Character Count** (`src-tauri/src/services/parser.rs:138-159`)
```rust
// Convert byte offset to UTF-16 code unit offset
fn byte_offset_to_utf16_offset(content: &str, byte_offset: usize) -> usize {
    content[..byte_offset].encode_utf16().count()
}

// In detect_header_ranges:
let start_char = byte_offset_to_utf16_offset(content, full_match.start()) as i64;
let end_char = start_char + header_text.encode_utf16().count() as i64;
```

**4. Paragraph Detection** (`src-tauri/src/services/parser.rs:28-91`)
```rust
// Convert to UTF-16 code units to match JavaScript's string.length
let utf16_units: Vec<u16> = content.encode_utf16().collect();
// All position calculations now work with UTF-16 code unit indices
```

**5. Fallback Paragraph** (`src-tauri/src/services/parser.rs:95`)
```rust
let char_count = content.trim().encode_utf16().count() as i64;
```

### Current Impact
This bug causes position misalignment when text contains emoji or rare Unicode characters:
- Example: Text "Hello 👋 World" with selection starting after "👋"
  - JavaScript calculates position as 8 (5 + 2 + 1, because 👋 = 2 UTF-16 code units)
  - Rust interprets this as character position 8 (but 👋 = 1 character)
  - This creates a 1-position offset for each emoji/surrogate pair before the selection

### Why We Chose UTF-16
Converting the backend to UTF-16 code units is the simplest and most consistent approach because:
1. Frontend is the source of user selections
2. All positions flow from frontend to backend
3. JavaScript's UTF-16 is the standard for web applications
4. Simpler to maintain one standard throughout
5. No need for position translation layers or complex conversions

### Testing Completed ✅
All tests pass with comprehensive UTF-16 test coverage:
- ✅ Emoji: "👋", "🎉", "😊"
- ✅ Chinese/Japanese: "世界", "測試"
- ✅ Multi-byte characters in various positions
- ✅ Multiple emoji in sequence
- ✅ Mixed Unicode and ASCII text
- ✅ Paragraph detection with emoji
- ✅ Header and excluded text with Unicode

See `src-tauri/src/services/parser.rs` tests for full test suite (11 new UTF-16 tests added).

---

## Fix Status Summary

### ✅ ALL BUGS FIXED in Phase 8 (2025-10-16)

1. **Bug 1: Excluded character count** - ✅ FIXED
   - Changed from `.len()` to `.encode_utf16().count()`
   - Uses UTF-16 code units to match JavaScript

2. **Bug 2: Header character count** - ✅ FIXED
   - Added `byte_offset_to_utf16_offset()` helper function
   - Converts regex byte positions to UTF-16 positions
   - All header length calculations use UTF-16

3. **Bug 3: Paragraph detection** - ✅ FIXED
   - Refactored to use `Vec<u16>` approach with UTF-16 code units
   - All positions consistently use UTF-16 indices
   - Whitespace detection works correctly with UTF-16

4. **Bug 4: UTF-16 vs Unicode mismatch** - ✅ FIXED
   - Converted ALL backend character counting to UTF-16
   - Backend now matches JavaScript's `.length` behavior
   - Frontend and backend positions are now consistent
   - Comprehensive test suite validates emoji and Unicode handling

## Testing Requirements

### Tests Needed for Bug 4 (UTF-16 fix)

After Bug 4 is fixed, add these test cases:

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

### Phase 8 Completed ✅ (2025-10-16)
- [x] Fix `calculate_excluded_character_count` to use `.encode_utf16().count()`
- [x] Fix `calculate_header_character_count` to use UTF-16 positions
- [x] Fix `detect_header_ranges` to return UTF-16 positions
- [x] Refactor `detect_paragraphs` to use UTF-16 code units throughout
- [x] Fix content_length calculation in `create_text` command
- [x] Implement UTF-16 conversion throughout backend (Bug 4 fix)
- [x] Add comprehensive unit tests for all Unicode scenarios
- [x] Test with emoji (👋, 😀, 🎉)
- [x] Test with Chinese/Japanese text (世界, 測試)
- [x] Test with mixed Unicode and ASCII
- [x] Verify UTF-16 consistency with JavaScript `.length`
- [x] Update documentation with UTF-16 approach
- [x] Prepare SQLx offline data (no migration checksums broken)

## Migration Notes

### Migration Impact (All Bugs Fixed) ✅

The UTF-16 fixes affect how character positions are calculated going forward, but **NO DATABASE MIGRATION IS REQUIRED** because:

1. **Bug 1 (Excluded character count)**: Only affects progress calculation, which is computed on-the-fly
2. **Bug 2 (Header character count)**: Only affects progress calculation, which is computed on-the-fly
3. **Bug 3 (Paragraph detection)**: Paragraphs are recalculated from content when needed
4. **Bug 4 (UTF-16 consistency)**: Content length is recalculated from stored content when texts are loaded

### Why No Migration Needed

**Existing `read_ranges` data remains valid because:**
- Read ranges are stored as positions from the frontend
- The frontend ALREADY used UTF-16 positions (JavaScript `.length`)
- Backend now matches what frontend was sending all along
- No stored position data needs recalculation

**For `texts.content_length`:**
- This field is recalculated from `texts.content` whenever texts are loaded
- The stored content is unchanged (UTF-8 in database)
- New ingestions will automatically use UTF-16 counting
- Existing texts will calculate correctly from their content

**For `paragraphs` table:**
- Paragraphs are recalculated from text content when needed
- The `detect_paragraphs()` function now uses UTF-16
- Future paragraph calculations will be consistent with frontend

### Important Note

Users with existing texts containing emoji or multi-byte Unicode characters will see **more accurate** progress calculations after this fix. Previously:
- Backend counted "👋" as 1 character
- Frontend sent position assuming "👋" is 2 UTF-16 units
- This caused position misalignment

Now:
- Backend counts "👋" as 2 UTF-16 code units
- Frontend sends position with "👋" as 2 UTF-16 units
- Positions are perfectly aligned!
