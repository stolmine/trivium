# Card Enumeration Examples

This document provides concrete examples illustrating the problem and solution for card enumeration.

## Problem Illustration

### Current System (Broken)

#### Timeline: User Reading Session 1
```
User highlights: "The mitochondria is the powerhouse of the cell"
User creates cloze: "The {{c1::mitochondria}} is the {{c2::powerhouse}} of the cell"

Database:
┌─────────────┬──────────┬───────────────┬──────────────┬──────────────┐
│ flashcard_id│ text_id  │ cloze_note_id │ cloze_index  │ created_at   │
├─────────────┼──────────┼───────────────┼──────────────┼──────────────┤
│     1       │    5     │      1        │      1       │  2025-10-13  │
│     2       │    5     │      1        │      2       │  2025-10-13  │
└─────────────┴──────────┴───────────────┴──────────────┴──────────────┘

UI Display:
┌──────────────────────────────────────────────────┐
│ Flashcards for Text #5                           │
├──────────────────────────────────────────────────┤
│ Card #1                                          │
│ The [...] is the powerhouse of the cell         │
│                                                  │
│ Card #2                                          │
│ The mitochondria is the [...] of the cell       │
└──────────────────────────────────────────────────┘
```

#### Timeline: User Reading Session 2 (2 days later)
```
User highlights: "Cells contain organelles like mitochondria"
User creates cloze: "Cells contain {{c1::organelles}} like {{c2::mitochondria}}"

Database:
┌─────────────┬──────────┬───────────────┬──────────────┬──────────────┐
│ flashcard_id│ text_id  │ cloze_note_id │ cloze_index  │ created_at   │
├─────────────┼──────────┼───────────────┼──────────────┼──────────────┤
│     1       │    5     │      1        │      1       │  2025-10-13  │
│     2       │    5     │      1        │      2       │  2025-10-13  │
│     3       │    5     │      2        │      1       │  2025-10-15  │ ← NEW
│     4       │    5     │      2        │      2       │  2025-10-15  │ ← NEW
└─────────────┴──────────┴───────────────┴──────────────┴──────────────┘

UI Display:
┌──────────────────────────────────────────────────┐
│ Flashcards for Text #5                           │
├──────────────────────────────────────────────────┤
│ Card #1  ← From note 1                           │
│ The [...] is the powerhouse of the cell         │
│                                                  │
│ Card #2  ← From note 1                           │
│ The mitochondria is the [...] of the cell       │
│                                                  │
│ Card #1  ← From note 2 ⚠️ DUPLICATE NUMBER       │
│ Cells contain [...] like mitochondria           │
│                                                  │
│ Card #2  ← From note 2 ⚠️ DUPLICATE NUMBER       │
│ Cells contain organelles like [...]             │
└──────────────────────────────────────────────────┘

❌ PROBLEM: Two "Card #1" and two "Card #2" for the same text!
```

#### Timeline: User Reading Session 3
```
User highlights: "The nucleus contains DNA and RNA"
User creates cloze: "The {{c3::nucleus}} contains {{c1::DNA}} and {{c5::RNA}}"

Database:
┌─────────────┬──────────┬───────────────┬──────────────┬──────────────┐
│ flashcard_id│ text_id  │ cloze_note_id │ cloze_index  │ created_at   │
├─────────────┼──────────┼───────────────┼──────────────┼──────────────┤
│     1       │    5     │      1        │      1       │  2025-10-13  │
│     2       │    5     │      1        │      2       │  2025-10-13  │
│     3       │    5     │      2        │      1       │  2025-10-15  │
│     4       │    5     │      2        │      2       │  2025-10-15  │
│     5       │    5     │      3        │      3       │  2025-10-16  │ ← NEW
│     6       │    5     │      3        │      1       │  2025-10-16  │ ← NEW
│     7       │    5     │      3        │      5       │  2025-10-16  │ ← NEW
└─────────────┴──────────┴───────────────┴──────────────┴──────────────┘

UI Display:
┌──────────────────────────────────────────────────┐
│ Flashcards for Text #5                           │
├──────────────────────────────────────────────────┤
│ Card #1  ← From note 1                           │
│ Card #2  ← From note 1                           │
│ Card #1  ← From note 2 ⚠️ DUPLICATE              │
│ Card #2  ← From note 2 ⚠️ DUPLICATE              │
│ Card #3  ← From note 3                           │
│ Card #1  ← From note 3 ⚠️ ANOTHER DUPLICATE      │
│ Card #5  ← From note 3 (why #5? confusing!)     │
└──────────────────────────────────────────────────┘

❌ PROBLEMS:
- Three "Card #1" entries
- Three "Card #2" entries
- No Card #4, but there is Card #5
- User has no way to uniquely identify cards
```

---

## Solution: Display Index

### New System (Fixed)

#### Timeline: User Reading Session 1
```
User highlights: "The mitochondria is the powerhouse of the cell"
User creates cloze: "The {{c1::mitochondria}} is the {{c2::powerhouse}} of the cell"

Database:
┌─────────────┬──────────┬───────────────┬──────────────┬───────────────┬──────────────┐
│ flashcard_id│ text_id  │ cloze_note_id │ cloze_index  │ display_index │ created_at   │
├─────────────┼──────────┼───────────────┼──────────────┼───────────────┼──────────────┤
│     1       │    5     │      1        │      1       │      1        │  2025-10-13  │
│     2       │    5     │      1        │      2       │      2        │  2025-10-13  │
└─────────────┴──────────┴───────────────┴──────────────┴───────────────┴──────────────┘

Calculation:
- For flashcard #1: SELECT MAX(display_index) WHERE text_id=5 → 0, so use 1
- For flashcard #2: SELECT MAX(display_index) WHERE text_id=5 → 1, so use 2

UI Display:
┌──────────────────────────────────────────────────┐
│ Flashcards for Text #5                           │
├──────────────────────────────────────────────────┤
│ Card #1 (Cloze 1)                                │
│ The [...] is the powerhouse of the cell         │
│                                                  │
│ Card #2 (Cloze 2)                                │
│ The mitochondria is the [...] of the cell       │
└──────────────────────────────────────────────────┘
```

#### Timeline: User Reading Session 2 (2 days later)
```
User highlights: "Cells contain organelles like mitochondria"
User creates cloze: "Cells contain {{c1::organelles}} like {{c2::mitochondria}}"

Database:
┌─────────────┬──────────┬───────────────┬──────────────┬───────────────┬──────────────┐
│ flashcard_id│ text_id  │ cloze_note_id │ cloze_index  │ display_index │ created_at   │
├─────────────┼──────────┼───────────────┼──────────────┼───────────────┼──────────────┤
│     1       │    5     │      1        │      1       │      1        │  2025-10-13  │
│     2       │    5     │      1        │      2       │      2        │  2025-10-13  │
│     3       │    5     │      2        │      1       │      3        │  2025-10-15  │ ← NEW
│     4       │    5     │      2        │      2       │      4        │  2025-10-15  │ ← NEW
└─────────────┴──────────┴───────────────┴──────────────┴───────────────┴──────────────┘

Calculation:
- For flashcard #3: SELECT MAX(display_index) WHERE text_id=5 → 2, so use 3
- For flashcard #4: SELECT MAX(display_index) WHERE text_id=5 → 3, so use 4

UI Display:
┌──────────────────────────────────────────────────┐
│ Flashcards for Text #5                           │
├──────────────────────────────────────────────────┤
│ Card #1 (Cloze 1)                                │
│ The [...] is the powerhouse of the cell         │
│                                                  │
│ Card #2 (Cloze 2)                                │
│ The mitochondria is the [...] of the cell       │
│                                                  │
│ Card #3 (Cloze 1)  ✓ UNIQUE                     │
│ Cells contain [...] like mitochondria           │
│                                                  │
│ Card #4 (Cloze 2)  ✓ UNIQUE                     │
│ Cells contain organelles like [...]             │
└──────────────────────────────────────────────────┘

✓ SOLUTION: Each card has a unique number!
```

#### Timeline: User Reading Session 3
```
User highlights: "The nucleus contains DNA and RNA"
User creates cloze: "The {{c3::nucleus}} contains {{c1::DNA}} and {{c5::RNA}}"

Database:
┌─────────────┬──────────┬───────────────┬──────────────┬───────────────┬──────────────┐
│ flashcard_id│ text_id  │ cloze_note_id │ cloze_index  │ display_index │ created_at   │
├─────────────┼──────────┼───────────────┼──────────────┼───────────────┼──────────────┤
│     1       │    5     │      1        │      1       │      1        │  2025-10-13  │
│     2       │    5     │      1        │      2       │      2        │  2025-10-13  │
│     3       │    5     │      2        │      1       │      3        │  2025-10-15  │
│     4       │    5     │      2        │      2       │      4        │  2025-10-15  │
│     5       │    5     │      3        │      3       │      5        │  2025-10-16  │ ← NEW
│     6       │    5     │      3        │      1       │      6        │  2025-10-16  │ ← NEW
│     7       │    5     │      3        │      5       │      7        │  2025-10-16  │ ← NEW
└─────────────┴──────────┴───────────────┴──────────────┴───────────────┴──────────────┘

Calculation:
- For flashcard #5: SELECT MAX(display_index) WHERE text_id=5 → 4, so use 5
- For flashcard #6: SELECT MAX(display_index) WHERE text_id=5 → 5, so use 6
- For flashcard #7: SELECT MAX(display_index) WHERE text_id=5 → 6, so use 7

UI Display:
┌──────────────────────────────────────────────────┐
│ Flashcards for Text #5                           │
├──────────────────────────────────────────────────┤
│ Card #1 (Cloze 1)                                │
│ Card #2 (Cloze 2)                                │
│ Card #3 (Cloze 1)  ✓ UNIQUE                     │
│ Card #4 (Cloze 2)  ✓ UNIQUE                     │
│ Card #5 (Cloze 3)  ✓ UNIQUE                     │
│ Card #6 (Cloze 1)  ✓ UNIQUE                     │
│ Card #7 (Cloze 5)  ✓ UNIQUE                     │
└──────────────────────────────────────────────────┘

✓ BENEFITS:
- All cards uniquely numbered (1-7)
- Sequential numbering (no gaps)
- Cloze numbers (c3, c1, c5) are preserved but don't affect display
- User can clearly identify and reference any card
```

---

## Deletion Handling

### Scenario: Delete Card #4

#### Before Deletion
```
Database:
┌─────────────┬──────────┬───────────────┬──────────────┬───────────────┐
│ flashcard_id│ text_id  │ cloze_note_id │ cloze_index  │ display_index │
├─────────────┼──────────┼───────────────┼──────────────┼───────────────┤
│     1       │    5     │      1        │      1       │      1        │
│     2       │    5     │      1        │      2       │      2        │
│     3       │    5     │      2        │      1       │      3        │
│     4       │    5     │      2        │      2       │      4        │ ← DELETE THIS
│     5       │    5     │      3        │      3       │      5        │
│     6       │    5     │      3        │      1       │      6        │
│     7       │    5     │      3        │      5       │      7        │
└─────────────┴──────────┴───────────────┴──────────────┴───────────────┘

UI Display:
Card #1, Card #2, Card #3, Card #4, Card #5, Card #6, Card #7
```

#### Option 1a: After Deletion (Allow Gaps) - RECOMMENDED
```sql
DELETE FROM flashcards WHERE id = 4;
-- No further action needed
```

Database:
┌─────────────┬──────────┬───────────────┬──────────────┬───────────────┐
│ flashcard_id│ text_id  │ cloze_note_id │ cloze_index  │ display_index │
├─────────────┼──────────┼───────────────┼──────────────┼───────────────┤
│     1       │    5     │      1        │      1       │      1        │
│     2       │    5     │      1        │      2       │      2        │
│     3       │    5     │      2        │      1       │      3        │
│     5       │    5     │      3        │      3       │      5        │ ← Gap at 4
│     6       │    5     │      3        │      1       │      6        │
│     7       │    5     │      3        │      5       │      7        │
└─────────────┴──────────┴───────────────┴──────────────┴───────────────┘

UI Display:
┌──────────────────────────────────────────────────┐
│ Card #1                                          │
│ Card #2                                          │
│ Card #3                                          │
│ [Card #4 was deleted]                            │
│ Card #5                                          │
│ Card #6                                          │
│ Card #7                                          │
└──────────────────────────────────────────────────┘

Pros:
✓ Stable numbers (Card #5 stays Card #5)
✓ Simple (no cascading updates)
✓ Fast deletion
✓ No race conditions

Cons:
⚠ Visual gaps in numbering
⚠ Total count ≠ highest number
```

#### Option 1b: After Deletion (Renumber) - NOT RECOMMENDED
```sql
DELETE FROM flashcards WHERE id = 4;
UPDATE flashcards
SET display_index = display_index - 1
WHERE text_id = 5 AND display_index > 4;
```

Database:
┌─────────────┬──────────┬───────────────┬──────────────┬───────────────┐
│ flashcard_id│ text_id  │ cloze_note_id │ cloze_index  │ display_index │
├─────────────┼──────────┼───────────────┼──────────────┼───────────────┤
│     1       │    5     │      1        │      1       │      1        │
│     2       │    5     │      1        │      2       │      2        │
│     3       │    5     │      2        │      1       │      3        │
│     5       │    5     │      3        │      3       │      4        │ ← Was 5
│     6       │    5     │      3        │      1       │      5        │ ← Was 6
│     7       │    5     │      3        │      5       │      6        │ ← Was 7
└─────────────┴──────────┴───────────────┴──────────────┴───────────────┘

UI Display:
┌──────────────────────────────────────────────────┐
│ Card #1                                          │
│ Card #2                                          │
│ Card #3                                          │
│ Card #4  (was Card #5)                           │
│ Card #5  (was Card #6)                           │
│ Card #6  (was Card #7)                           │
└──────────────────────────────────────────────────┘

Pros:
✓ No gaps
✓ Clean sequential numbering

Cons:
❌ Unstable numbers (Card #5 becomes Card #4)
❌ More complex code
❌ Slower deletion (needs UPDATE)
❌ Potential race conditions
❌ Confusing if user references "Card #5"
```

---

## Multi-Text Scenario

### Multiple Texts Have Independent Numbering

```
Text #5: "Cell Biology"
┌─────────────┬──────────┬───────────────┬──────────────┬───────────────┐
│ flashcard_id│ text_id  │ cloze_note_id │ cloze_index  │ display_index │
├─────────────┼──────────┼───────────────┼──────────────┼───────────────┤
│     1       │    5     │      1        │      1       │      1        │
│     2       │    5     │      1        │      2       │      2        │
│     3       │    5     │      2        │      1       │      3        │
└─────────────┴──────────┴───────────────┴──────────────┴───────────────┘

Text #8: "Chemistry Basics"
┌─────────────┬──────────┬───────────────┬──────────────┬───────────────┐
│ flashcard_id│ text_id  │ cloze_note_id │ cloze_index  │ display_index │
├─────────────┼──────────┼───────────────┼──────────────┼───────────────┤
│     10      │    8     │      5        │      1       │      1        │ ← Card #1
│     11      │    8     │      5        │      2       │      2        │ ← Card #2
└─────────────┴──────────┴───────────────┴──────────────┴───────────────┘

✓ Each text has its own Card #1, Card #2, etc.
✓ UNIQUE constraint on (text_id, display_index) enforces this
```

---

## Edge Cases

### Edge Case 1: User Creates Cards with Non-Sequential Cloze Numbers

```
User input: "{{c5::Alpha}} and {{c2::Beta}} and {{c9::Gamma}}"

Cloze numbers: [5, 2, 9]
Sorted unique: [2, 5, 9]

Database insertion order:
1. Cloze 2 → display_index = 1
2. Cloze 5 → display_index = 2
3. Cloze 9 → display_index = 3

UI Display:
┌──────────────────────────────────────────────────┐
│ Card #1 (Cloze 2)                                │
│ [...] and Beta and Gamma                         │
│                                                  │
│ Card #2 (Cloze 5)                                │
│ Alpha and [...] and Gamma                        │
│                                                  │
│ Card #3 (Cloze 9)                                │
│ Alpha and Beta and [...]                         │
└──────────────────────────────────────────────────┘

✓ Display index is sequential (1, 2, 3)
✓ Cloze index is preserved (2, 5, 9)
✓ Order follows cloze number order (as sorted by extract_cloze_numbers)
```

### Edge Case 2: First Card After Deleting All Cards

```
Initial state:
Text #5 has Cards #1, #2, #3

User deletes all cards:
DELETE FROM flashcards WHERE text_id = 5;

Database is now empty for text_id=5:
┌─────────────┬──────────┬───────────────┬──────────────┬───────────────┐
│ flashcard_id│ text_id  │ cloze_note_id │ cloze_index  │ display_index │
├─────────────┼──────────┼───────────────┼──────────────┼───────────────┤
│ (empty)     │          │               │              │               │
└─────────────┴──────────┴───────────────┴──────────────┴───────────────┘

User creates new card:
SELECT MAX(display_index) FROM flashcards WHERE text_id = 5;
→ Returns NULL
→ COALESCE(NULL, 0) = 0
→ Next display_index = 0 + 1 = 1

Result:
┌─────────────┬──────────┬───────────────┬──────────────┬───────────────┐
│ flashcard_id│ text_id  │ cloze_note_id │ cloze_index  │ display_index │
├─────────────┼──────────┼───────────────┼──────────────┼───────────────┤
│    100      │    5     │      50       │      1       │      1        │
└─────────────┴──────────┴───────────────┴──────────────┴───────────────┘

✓ Numbering restarts from 1 (makes sense: fresh start)
```

### Edge Case 3: Same Cloze Number Used Multiple Times in One Note

```
User input: "{{c1::Paris}} and {{c1::London}} are cities"

Cloze numbers extracted: [1, 1]
Unique cloze numbers: [1]

Result:
Only ONE flashcard is created (display_index = 1)
When shown, both {{c1::...}} are hidden simultaneously

UI Display:
┌──────────────────────────────────────────────────┐
│ Card #1 (Cloze 1)                                │
│ [...] and [...] are cities                       │
└──────────────────────────────────────────────────┘

✓ This is expected Anki behavior
✓ One cloze number → One flashcard
✓ display_index correctly assigned as 1
```

### Edge Case 4: Very Large display_index Values

```
Hypothetical: User has created 1,000,000 cards for one text

Database:
┌─────────────┬──────────┬───────────────┬──────────────┬───────────────┐
│ flashcard_id│ text_id  │ cloze_note_id │ cloze_index  │ display_index │
├─────────────┼──────────┼───────────────┼──────────────┼───────────────┤
│  999999     │    5     │    500000     │      1       │    999999     │
│ 1000000     │    5     │    500000     │      2       │   1000000     │
└─────────────┴──────────┴───────────────┴──────────────┴───────────────┘

UI Display:
Card #999999
Card #1000000

SQLite INTEGER range: -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807

✓ No overflow concerns (would need 9 quintillion cards)
✓ Query performance may degrade with millions of cards per text
✓ Practical limit: If a text has >10,000 cards, consider UI pagination
```

---

## Comparison: Old vs New System

### Creating 3 Notes Over Time

```
Timeline:
Day 1: Create note "{{c1::A}} and {{c2::B}}"
Day 2: Create note "{{c1::C}}"
Day 3: Create note "{{c3::D}} and {{c1::E}}"

OLD SYSTEM (cloze_index only):
┌──────────────────────┬──────────────────────┐
│ UI Display           │ Issues               │
├──────────────────────┼──────────────────────┤
│ Card #1 (A)          │                      │
│ Card #2 (B)          │                      │
│ Card #1 (C)          │ ❌ Duplicate #1      │
│ Card #3 (D)          │                      │
│ Card #1 (E)          │ ❌ Another #1        │
└──────────────────────┴──────────────────────┘
Three "Card #1" entries - confusing!

NEW SYSTEM (display_index):
┌──────────────────────┬──────────────────────┐
│ UI Display           │ Status               │
├──────────────────────┼──────────────────────┤
│ Card #1 (Cloze 1)    │ ✓ Unique             │
│ Card #2 (Cloze 2)    │ ✓ Unique             │
│ Card #3 (Cloze 1)    │ ✓ Unique             │
│ Card #4 (Cloze 3)    │ ✓ Unique             │
│ Card #5 (Cloze 1)    │ ✓ Unique             │
└──────────────────────┴──────────────────────┘
All cards have unique sequential numbers!
```

---

## Visual Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    CARD ENUMERATION SOLUTION                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PROBLEM: cloze_index (c1, c2, c3) creates duplicate numbers   │
│           when user creates multiple notes over time            │
│                                                                 │
│  SOLUTION: display_index provides unique, sequential numbering  │
│            independent of user's cloze numbering scheme         │
│                                                                 │
│  HOW IT WORKS:                                                  │
│  1. When creating card, query: MAX(display_index) for text_id  │
│  2. Assign: next_display_index = max + 1                       │
│  3. Store in database with UNIQUE constraint                   │
│  4. Display: "Card #{display_index}"                           │
│                                                                 │
│  BENEFITS:                                                      │
│  ✓ Unique identification per text                              │
│  ✓ Stable numbers (don't change)                               │
│  ✓ Sequential (1, 2, 3, 4...)                                  │
│  ✓ Works across multiple sessions                              │
│  ✓ Simple implementation                                       │
│  ✓ Good performance                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
