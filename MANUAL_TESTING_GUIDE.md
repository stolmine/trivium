# Manual Testing Guide: Hybrid Boundary Expansion

## Quick Test Text

Copy this text into a document in Trivium for testing:

```
This is the first sentence. This is the second sentence with some additional content. This is the third sentence. This is the fourth sentence with even more content to make it longer and more substantial.

This is the first paragraph with multiple sentences. It contains enough text to be meaningful. You should be able to test various selection scenarios here.

This is the second paragraph. It is shorter. But still useful.

This is a very long paragraph that contains significantly more text than the others. It has multiple sentences that flow together naturally. The purpose is to test selections that are over 200 characters long. When you select this entire paragraph, the system should respect your exact selection and not try to expand it further. This demonstrates the "always respect large selections" behavior.
```

## Test Scenarios

### Test 1: Small Partial Selection (< 20 chars) - Should EXPAND

1. **Select**: "second sentence" (15 characters, in middle of sentence)
2. **Press**: Ctrl+E (or click "Inline Edit" in selection toolbar)
3. **Expected**: Editor expands to full sentence: "This is the second sentence with some additional content."
4. **Check console**: Should see `[ReadPage] Expanding partial selection to boundaries`

**Result**: ⬜ PASS / ⬜ FAIL

---

### Test 2: Single Word Selection - Should EXPAND

1. **Select**: "additional" (10 characters)
2. **Press**: Ctrl+E
3. **Expected**: Editor expands to full sentence
4. **Check console**: Should see `Expanding partial selection`

**Result**: ⬜ PASS / ⬜ FAIL

---

### Test 3: Complete Sentence at Boundaries (40+ chars) - Should RESPECT

1. **Select**: "This is the second sentence with some additional content." (from start of "This" to period after "content")
   - Selection is 57 characters
   - Starts at sentence boundary (after ". ")
   - Ends at sentence boundary (at period)
2. **Press**: Ctrl+E
3. **Expected**: Editor respects exact selection (doesn't expand)
4. **Check console**: Should see `[ReadPage] Respecting exact user selection`

**Result**: ⬜ PASS / ⬜ FAIL

---

### Test 4: Triple-Click Paragraph - Should RESPECT

1. **Triple-click**: Any complete paragraph (selects entire paragraph)
2. **Press**: Ctrl+E
3. **Expected**: Editor respects exact paragraph selection
4. **Check console**: Should see `Respecting exact user selection`

**Result**: ⬜ PASS / ⬜ FAIL

---

### Test 5: Very Large Selection (> 200 chars) - Should RESPECT

1. **Select**: The entire long paragraph (last paragraph, > 200 characters)
2. **Press**: Ctrl+E
3. **Expected**: Editor respects exact selection (even if boundaries don't perfectly align)
4. **Check console**: Should see `Respecting exact user selection`

**Result**: ⬜ PASS / ⬜ FAIL

---

### Test 6: Partial Mid-Sentence (30-50 chars) - Should EXPAND

1. **Select**: "sentence with some additional" (30 characters, in middle of sentence)
   - NOT at sentence start
   - NOT at sentence end
2. **Press**: Ctrl+E
3. **Expected**: Editor expands to full sentence
4. **Check console**: Should see `Expanding partial selection`

**Result**: ⬜ PASS / ⬜ FAIL

---

### Test 7: Multiple Complete Sentences at Boundaries - Should RESPECT

1. **Select**: "This is the first sentence. This is the second sentence with some additional content." (from start of first to end of second)
   - Starts at sentence boundary
   - Ends at sentence boundary
   - > 30 characters
2. **Press**: Ctrl+E
3. **Expected**: Editor respects exact selection
4. **Check console**: Should see `Respecting exact user selection`

**Result**: ⬜ PASS / ⬜ FAIL

---

### Test 8: Word at Paragraph Start - Should EXPAND

1. **Select**: "This" (first word of first paragraph, 4 characters)
2. **Press**: Ctrl+E
3. **Expected**: Editor expands to full sentence or paragraph
4. **Check console**: Should see `Expanding partial selection`

**Result**: ⬜ PASS / ⬜ FAIL

---

### Test 9: End of Sentence Selection - Should EXPAND

1. **Select**: "additional content" (18 characters, at end of sentence but not including period)
2. **Press**: Ctrl+E
3. **Expected**: Editor expands to full sentence
4. **Check console**: Should see `Expanding partial selection`

**Result**: ⬜ PASS / ⬜ FAIL

---

### Test 10: Complete Short Sentence (20-30 chars) at Boundaries - Should EXPAND

1. **Select**: "This is shorter." (17 characters - below 20 threshold)
2. **Press**: Ctrl+E
3. **Expected**: Editor expands (because < 20 chars, even if aligned)
4. **Check console**: Should see `Expanding partial selection`

**Result**: ⬜ PASS / ⬜ FAIL

---

## Console Log Reference

When testing, check browser console (F12) for these messages:

**When expanding (partial selection)**:
```
[ReadPage] Expanding partial selection to smart boundaries: {
  originalLength: 15,
  text: "second sentence"
}
[ReadPage] Expanded to: {
  boundaryType: "sentence",
  newLength: 57,
  text: "This is the second sentence with some addition..."
}
```

**When respecting (intentional selection)**:
```
[ReadPage] Respecting exact user selection: {
  length: 57,
  text: "This is the second sentence with some addition..."
}
```

## Expected Results Summary

| Test | Selection Type | Expected Behavior |
|------|---------------|------------------|
| 1 | 15 chars, partial | EXPAND to sentence |
| 2 | 10 chars, word | EXPAND to sentence |
| 3 | 57 chars, aligned boundaries | RESPECT exact |
| 4 | Full paragraph, triple-click | RESPECT exact |
| 5 | > 200 chars | RESPECT exact |
| 6 | 30 chars, mid-sentence | EXPAND to sentence |
| 7 | Multiple sentences, aligned | RESPECT exact |
| 8 | 4 chars, word | EXPAND to sentence |
| 9 | 18 chars, end of sentence | EXPAND to sentence |
| 10 | 17 chars, complete sentence | EXPAND (< 20 threshold) |

## Troubleshooting

**If selection doesn't expand when it should**:
- Check console for error messages
- Verify selection length (must be < 20 or not at boundaries)
- Try selecting again

**If selection expands when it shouldn't**:
- Check if both boundaries are aligned (start after ". " and end at ".")
- Check if selection is > 30 characters
- Verify in console logs which path was taken

**If editor doesn't activate**:
- Make sure you have text selected
- Try Ctrl+E keyboard shortcut
- Check that you're not already in edit mode

## Test Environment

- **Browser**: _________________
- **Date**: _________________
- **Trivium Version/Commit**: _________________
- **Tester**: _________________

## Overall Results

- Tests Passed: _____ / 10
- Tests Failed: _____ / 10
- Issues Found: _____________________________

## Notes

_____________________________________
_____________________________________
_____________________________________
