# Unicode Bug Examples - Visual Demonstrations

## Example 1: Excluded Character Count Bug

### Test Input
```
Content: "Hello [[exclude]]👋 世界 测试[[/exclude]] World"
```

### Current Behavior (WRONG)
```rust
// Using .len() which counts bytes
excluded_text = "👋 世界 测试"
Bytes: 👋(4) + space(1) + 世(3) + 界(3) + space(1) + 测(3) + 试(3) = 18 bytes
Result: 18 characters (WRONG)
```

### Expected Behavior (CORRECT)
```rust
// Using .chars().count() which counts characters
excluded_text = "👋 世界 测试"
Characters: 👋(1) + space(1) + 世(1) + 界(1) + space(1) + 测(1) + 试(1) = 7 characters
Result: 7 characters (CORRECT)
```

### Impact on Progress
```
Total content length: "Hello [[exclude]]👋 世界 测试[[/exclude]] World"
- Total characters: 40 (using .chars().count())
- Excluded (WRONG): 18
- Countable (WRONG): 40 - 18 = 22 characters
- Excluded (CORRECT): 7
- Countable (CORRECT): 40 - 7 = 33 characters

If user reads 11 characters (e.g., "Hello World"):
- Progress (WRONG): 11/22 = 50%
- Progress (CORRECT): 11/33 = 33%

Error: 17 percentage points overestimation!
```

---

## Example 2: Header Character Count Bug

### Test Input
```
Content: "== Hello 👋 World ==\nSome content here"
```

### Current Behavior (WRONG)
```rust
// Regex returns byte positions
header_match.start() = 0 (bytes)
header_match.end() = 23 (bytes)
header_length = 23 - 0 = 23 bytes (WRONG)
```

### Expected Behavior (CORRECT)
```rust
// Should count characters
header_text = "== Hello 👋 World =="
header_length = 20 characters (CORRECT)
Characters: =(1) =(1) space(1) H(1) e(1) l(1) l(1) o(1) space(1) 👋(1) space(1) W(1) o(1) r(1) l(1) d(1) space(1) =(1) =(1)
```

### Impact on Progress
```
Total content: "== Hello 👋 World ==\nSome content here"
- Total characters: 38
- Header (WRONG): 23
- Countable (WRONG): 38 - 23 = 15 characters
- Header (CORRECT): 20
- Countable (CORRECT): 38 - 20 = 18 characters

If user reads 9 characters of content:
- Progress (WRONG): 9/15 = 60%
- Progress (CORRECT): 9/18 = 50%

Error: 10 percentage points overestimation!
```

---

## Example 3: Paragraph Detection Bug

### Test Input
```
Content: "First paragraph 👋\n\nSecond paragraph 世界"
```

### Current Behavior (WRONG)
```rust
// Using byte positions from .find() and .len()
Paragraph 1:
- Text: "First paragraph 👋"
- start (bytes): 0
- end (bytes): 19 (15 ASCII + 4 for 👋)
- character_count: 18 (CORRECT using .chars().count())

Paragraph 2:
- Text: "Second paragraph 世界"
- start (bytes): 21 (19 + 2 for "\n\n")
- end (bytes): 44 (21 + 17 ASCII + 3 for 世 + 3 for 界)
- character_count: 20 (CORRECT using .chars().count())
```

### When Frontend Uses These Positions
```javascript
// Frontend tries to slice using these byte positions as character positions
content.substring(0, 19)
// Result: Cuts off in the middle of 👋 emoji!
// May result in "First paragraph �" or crash

content.substring(21, 44)
// Result: Wrong start position, may start in middle of text
```

### Expected Behavior (CORRECT)
```rust
// Using character positions throughout
Paragraph 1:
- Text: "First paragraph 👋"
- start (chars): 0
- end (chars): 18
- character_count: 18

Paragraph 2:
- Text: "Second paragraph 世界"
- start (chars): 20 (18 + 2 for "\n\n")
- end (chars): 40
- character_count: 20
```

### Visual Demonstration of the Bug
```
Byte positions:  [0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15|16 17 18 19|20 21|...]
Char positions:  [0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15    16    |17 18|...]
Content:         [F i r s t   p a r a  g  r  a  p  h     👋    |\n \n|...]

Backend stores: byte 19 (middle of 👋)
Frontend uses: character 19 (somewhere in second paragraph)
Result: MISALIGNMENT!
```

---

## Example 4: UTF-16 vs Unicode Mismatch

### Test Input
```
Content: "Hello 👋 World"
Position: Select "World" (characters 9-14)
```

### Current Behavior (MISMATCHED)
```
Backend (Rust):
"Hello 👋 World"
 01234 5 678901234
 H e l l o   👋   W o r l d
Character positions: 0-5="Hello ", 6=👋, 7=" ", 8-12="World"

Frontend (JavaScript):
"Hello 👋 World"
 01234 5 6789012345
 H e l l o   👋👋   W o r l d
UTF-16 code units: 0-5="Hello ", 6-7=👋 (surrogate pair), 8=" ", 9-13="World"

User selects "World":
- Frontend reports: positions 9-13
- Backend interprets: positions 9-13
- Backend position 9 = 'o' in "World" (CORRECT by accident)
- But if there were more emoji before, positions would be wrong!
```

### Example with Multiple Emoji (Shows the Problem)
```
Content: "Hi 👋 Test 😀 World"

Backend (Rust):
 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15
 H i   👋   T e s t   😀    W  o  r  l  d

Frontend (JavaScript):
 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17
 H i   👋 👋   T e s t   😀  😀   W  o  r  l  d
     (surrogate pair)     (surrogate pair)

User selects "World" at the end:
- Frontend: positions 14-18 (in UTF-16 units)
- Backend interprets: characters 14-18
- Backend position 14 = 'd' in "World" (WRONG!)
- Backend position 18 = out of bounds (ERROR!)

Correct selection should be:
- Backend: positions 12-16
- But frontend sent: 14-18
- Off by 2 characters (one per emoji)
```

---

## Real-World Impact Examples

### Wikipedia Article Example
```
Title: "== Unicode History 🌐 =="
Content length: 500 characters
Headers: 50 bytes but only 45 characters (5 emoji)

Current calculation:
- Countable: 500 - 50 = 450 characters
- Read 225 characters
- Progress: 225/450 = 50%

Correct calculation:
- Countable: 500 - 45 = 455 characters
- Read 225 characters
- Progress: 225/455 = 49.5%

Small error in this case, but compounds with more emoji.
```

### User Paste with Emoji Example
```
Content: "Important! 🚨🚨🚨 [[exclude]]Figure 1: 📊 Chart data[[/exclude]] Read this! 💡"

Excluded section:
- Text: "Figure 1: 📊 Chart data"
- Current (bytes): "Figure 1: " (10) + 📊 (4) + " Chart data" (11) = 25 bytes
- Correct (chars): "Figure 1: " (10) + 📊 (1) + " Chart data" (11) = 22 characters

Progress error:
- Wrong countable chars: total - 25
- Right countable chars: total - 22
- 3 character difference leads to ~1-5% progress error depending on total length
```

---

## Test Cases for Validation

### Test Case 1: All ASCII (Should work correctly)
```rust
#[test]
fn test_ascii_only() {
    let content = "Hello [[exclude]]test[[/exclude]] World";
    let excluded = calculate_excluded_character_count(content);
    assert_eq!(excluded, 4); // "test"
}
```

### Test Case 2: Emoji in Excluded Section
```rust
#[test]
fn test_emoji_excluded() {
    let content = "Hello [[exclude]]👋 world[[/exclude]] Test";
    let excluded = calculate_excluded_character_count(content);
    assert_eq!(excluded, 7); // "👋 world" = 7 characters, not 11 bytes
}
```

### Test Case 3: Chinese/Japanese in Excluded Section
```rust
#[test]
fn test_cjk_excluded() {
    let content = "Hello [[exclude]]世界 测试[[/exclude]] World";
    let excluded = calculate_excluded_character_count(content);
    assert_eq!(excluded, 5); // "世界 测试" = 5 characters, not 13 bytes
}
```

### Test Case 4: Mixed Unicode in Headers
```rust
#[test]
fn test_unicode_header() {
    let content = "== Test 👋 世界 ==\nContent";
    let header_count = calculate_header_character_count(content);
    assert_eq!(header_count, 15); // "== Test 👋 世界 ==" = 15 characters
}
```

### Test Case 5: Paragraph Detection with Emoji
```rust
#[test]
fn test_paragraph_emoji() {
    let content = "First 👋\n\nSecond 世界";
    let paragraphs = detect_paragraphs(content);

    assert_eq!(paragraphs.len(), 2);

    // First paragraph: "First 👋"
    assert_eq!(paragraphs[0].start_position, 0);
    assert_eq!(paragraphs[0].end_position, 7);
    assert_eq!(paragraphs[0].character_count, 7);

    // Second paragraph: "Second 世界"
    assert_eq!(paragraphs[1].start_position, 9); // 7 + 2 for "\n\n"
    assert_eq!(paragraphs[1].end_position, 16);
    assert_eq!(paragraphs[1].character_count, 7);
}
```

### Test Case 6: Frontend/Backend Position Consistency
```typescript
test('utf16 position consistency', async () => {
    const content = "Hi 👋 Test 😀 World";

    // Frontend selection: "World"
    const jsLength = content.length; // 19 in UTF-16
    const worldStart = content.lastIndexOf("World"); // 15 in UTF-16
    const worldEnd = worldStart + "World".length; // 20 in UTF-16

    // Send to backend
    await markRangeAsRead(textId, worldStart, worldEnd);

    // Backend should interpret these positions correctly
    // This requires backend to use UTF-16 counting
    const ranges = await getReadRanges(textId);
    expect(ranges[0].startPosition).toBe(worldStart);
    expect(ranges[0].endPosition).toBe(worldEnd);

    // And progress should be correct
    const progress = await calculateProgress(textId);
    // "World" is 5 characters out of total text
    expect(progress).toBeCloseTo(26.3); // 5/19 * 100
});
```

---

## How to Verify Fixes

1. **Run unit tests**: All tests above should pass
2. **Manual testing with emoji**: Copy/paste emoji-heavy text and verify progress
3. **Manual testing with CJK**: Test with Chinese/Japanese/Korean Wikipedia articles
4. **Check paragraph boundaries**: Verify clicking on paragraphs selects the right content
5. **Check exclusion**: Mark text with emoji as excluded and verify progress calculation
6. **Integration test**: Select text with emoji, mark as read, verify highlighting is correct

## Performance Note

Converting between byte and character positions has a performance cost:
- `.chars().count()` is O(n) in the length of the string
- Byte indexing is O(1)

However:
- These operations are done infrequently (only during text ingestion and range marking)
- Correctness is more important than micro-optimization
- The performance impact is negligible for typical text lengths

For very large texts (>1MB), we could optimize by caching character/byte position mappings, but this is premature optimization.
