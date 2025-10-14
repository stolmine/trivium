# Card Enumeration System Design

## Executive Summary

This document provides a comprehensive analysis and recommended solution for implementing a robust card enumeration system that assigns unique, stable display numbers to flashcards independent of the user's cloze numbering scheme ({{c1::, {{c2::, etc.).

## Problem Analysis

### Current System

**Database Schema:**
```sql
CREATE TABLE cloze_notes (
    id INTEGER PRIMARY KEY,
    text_id INTEGER,
    original_text TEXT,
    parsed_segments TEXT,
    cloze_count INTEGER,
    created_at DATETIME
);

CREATE TABLE flashcards (
    id INTEGER PRIMARY KEY,
    cloze_note_id INTEGER,
    text_id INTEGER,
    cloze_index INTEGER,  -- Currently stores the cN number from user input
    created_at DATETIME
);
```

**Current Behavior:**
- `cloze_index` stores the cloze number from the user's input (c1, c2, c3, etc.)
- Each cloze_note can generate multiple flashcards (one per unique cloze number)
- UI displays: "Card #{flashcard.clozeIndex}" (line 129 in FlashcardSidebar.tsx)

### The Problem Illustrated

**Scenario 1: Initial Creation**
```
User creates note: "The {{c1::mitochondria}} is the {{c2::powerhouse}} of the cell"
→ Creates cloze_note #1 with 2 flashcards:
  - Flashcard A: cloze_index=1 → Displays "Card #1"
  - Flashcard B: cloze_index=2 → Displays "Card #2"
```

**Scenario 2: Later Session (Same Text)**
```
User creates another note: "Cells have {{c1::organelles}} like {{c2::mitochondria}}"
→ Creates cloze_note #2 with 2 more flashcards:
  - Flashcard C: cloze_index=1 → Displays "Card #1" ❌ DUPLICATE
  - Flashcard D: cloze_index=2 → Displays "Card #2" ❌ DUPLICATE
```

**Scenario 3: Non-Sequential Numbering**
```
User creates: "The {{c3::nucleus}} contains {{c1::DNA}}"
→ Creates cloze_note #3 with 2 flashcards:
  - Flashcard E: cloze_index=3 → Displays "Card #3"
  - Flashcard F: cloze_index=1 → Displays "Card #1" ❌ ANOTHER DUPLICATE
```

**Result:** Multiple cards show "Card #1", "Card #2", etc. for the same text, causing confusion and making it impossible to uniquely identify cards.

### Anki's Approach

After researching Anki's documentation and forums:

1. **Anki uses cloze numbers (c1, c2, etc.) as the card identifier** - there is no separate display index
2. **Anki displays cards by their card type/template name**: For cloze cards, this shows as "Cloze" in the browser
3. **Sibling cards** (cards from the same note) share properties but are identified by their cloze number
4. **Key insight**: Anki expects users to create all cloze deletions in a single note-editing session. If you want to add more cards to the same content, you edit the existing note and add new cloze numbers, not create a new note.

**Why Anki's approach doesn't translate well to Trivium:**
- Anki assumes a traditional note-editing workflow where you explicitly edit notes
- Trivium uses an incremental reading workflow where users create cards on-the-fly during reading
- Users may return to the same text multiple times and create new cards each time
- Each card creation session creates a new cloze_note, not editing an existing one

## Requirements Analysis

### Functional Requirements

1. **Unique Identification**: Each flashcard for a given text_id must have a unique display number
2. **Stability**: Display numbers should not change once assigned (except possibly during deletions)
3. **Sequential**: Numbers should be intuitive (1, 2, 3, 4...) not sparse (1, 3, 7, 12...)
4. **Session Independence**: Multiple card creation sessions should not create duplicate display numbers
5. **Creation-Order Based**: Cards should be numbered in the order they were created (chronological)
6. **Query Performance**: Retrieving cards with their display numbers should be efficient

### Non-Functional Requirements

1. **Backward Compatibility**: Existing data should work (or be migrated)
2. **Minimal Schema Changes**: Prefer solutions that don't require major restructuring
3. **Clear Code**: Implementation should be maintainable and understandable
4. **Atomic Operations**: Card creation should handle numbering atomically

## Design Options

### Option 1: Auto-Incrementing display_index Column (RECOMMENDED)

**Schema Changes:**
```sql
ALTER TABLE flashcards ADD COLUMN display_index INTEGER;
CREATE UNIQUE INDEX idx_flashcards_text_display ON flashcards(text_id, display_index);
CREATE INDEX idx_flashcards_text_created ON flashcards(text_id, created_at);
```

**Implementation:**
```rust
// In create_flashcard_from_cloze command
for cloze_number in cloze_numbers {
    // Get the next display_index for this text_id
    let max_display_index = sqlx::query!(
        r#"
        SELECT COALESCE(MAX(display_index), 0) as "max_index: i64"
        FROM flashcards
        WHERE text_id = ?
        "#,
        text_id
    )
    .fetch_one(pool)
    .await?;

    let display_index = max_display_index.max_index + 1;

    // Insert flashcard with display_index
    sqlx::query!(
        r#"
        INSERT INTO flashcards (
            text_id, user_id, original_text, cloze_text, cloze_index,
            cloze_note_id, display_index, created_at, updated_at, due,
            stability, difficulty, elapsed_days, scheduled_days,
            reps, lapses, state, last_review
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        text_id,
        user_id,
        selected_text,
        cloze_text,
        cloze_index,
        cloze_note_id,
        display_index,  // ← New field
        now,
        now,
        now,
        0.0, 0.0, 0, 0, 0, 0, 0,
        None::<chrono::DateTime<Utc>>
    )
    .execute(pool)
    .await?;
}
```

**Query for Display:**
```sql
SELECT
    id, text_id, user_id, original_text, cloze_text,
    cloze_index, display_index, cloze_note_id,
    created_at, updated_at, due, stability, difficulty,
    elapsed_days, scheduled_days, reps, lapses, state, last_review
FROM flashcards
WHERE text_id = ?
ORDER BY display_index ASC
```

**UI Update (FlashcardSidebar.tsx):**
```typescript
<div className="text-xs text-gray-500">
  Card #{flashcard.displayIndex}
  {/* Optionally show cloze info: */}
  <span className="ml-1 text-gray-400">(Cloze {flashcard.clozeIndex})</span>
</div>
```

**Pros:**
- ✅ Simple, straightforward implementation
- ✅ Efficient queries (no computation at query time)
- ✅ Stable numbering (assigned once at creation)
- ✅ Unique by design (UNIQUE constraint enforces it)
- ✅ Sequential numbering (1, 2, 3, 4...)
- ✅ Works across multiple creation sessions
- ✅ Can easily reorder if needed (update display_index values)

**Cons:**
- ⚠️ Requires migration for existing data
- ⚠️ Deletion leaves gaps (Card #1, #3, #4... when #2 is deleted)
- ⚠️ Slight complexity in insertion (needs MAX query)

**Handling Deletions:**
Two sub-options for gaps after deletion:

**1a. Leave Gaps (Simpler, Recommended)**
- When a card is deleted, its display_index is gone forever
- Cards #1, #2, #3, #4 → Delete #2 → Cards #1, #3, #4
- Pros: Simple, stable, no renumbering needed
- Cons: Users see gaps, highest number ≠ total count

**1b. Renumber on Deletion (More Complex)**
```sql
-- After deleting a card
UPDATE flashcards
SET display_index = display_index - 1
WHERE text_id = ? AND display_index > ?
```
- Pros: Always sequential, no gaps
- Cons: Changes stable numbers, more complex, potential conflicts

### Option 2: Calculate Display Index at Query Time

**Schema Changes:**
```sql
-- No changes needed
```

**Implementation:**
```sql
-- Use ROW_NUMBER() window function
SELECT
    f.*,
    ROW_NUMBER() OVER (PARTITION BY text_id ORDER BY created_at, id) as display_index
FROM flashcards f
WHERE text_id = ?
ORDER BY created_at, id
```

**Pros:**
- ✅ No schema changes
- ✅ No migration needed
- ✅ Automatically handles gaps (always 1, 2, 3, 4...)
- ✅ No special insertion logic

**Cons:**
- ❌ Display numbers can change when cards are deleted
- ❌ Slightly more complex queries
- ❌ Cannot reference display_index in WHERE clauses efficiently
- ❌ "Card #5" today might be "Card #4" tomorrow if Card #3 is deleted

### Option 3: Composite Display Index (Note + Position)

**Schema Changes:**
```sql
-- No changes, use existing cloze_note_id and cloze_index
```

**Display Format:**
```
"Card #2.1" (cloze_note #2, cloze #1)
"Card #2.2" (cloze_note #2, cloze #2)
```

**Implementation:**
```typescript
// In UI
const displayNumber = `${flashcard.clozeNoteId}.${flashcard.clozeIndex}`;
// Shows: "Card #1.1", "Card #1.2", "Card #2.1", etc.
```

**Pros:**
- ✅ No schema changes
- ✅ Shows relationship between cards from same note
- ✅ Unique by design
- ✅ Stable

**Cons:**
- ❌ Confusing display format ("Card #2.1"?)
- ❌ Not sequential across all cards
- ❌ Still can have confusing patterns (2.1, 3.1, 1.1 if ordered by time)

### Option 4: Use UUID or Hash for Display

**Not recommended** - Would show something like "Card #a3f91c2" which is not user-friendly.

## Recommended Solution

**Adopt Option 1a: Auto-Incrementing display_index with Gaps**

This is the optimal balance of:
- Simplicity of implementation
- Stability of numbering
- User comprehension
- Query performance
- Forward compatibility

### Implementation Plan

#### Phase 1: Database Migration

**File:** `src-tauri/migrations/20251013120000_add_display_index.sql`
```sql
-- Add display_index column to flashcards
ALTER TABLE flashcards ADD COLUMN display_index INTEGER;

-- Backfill existing cards with display_index based on creation order
WITH numbered_cards AS (
    SELECT
        id,
        ROW_NUMBER() OVER (PARTITION BY text_id ORDER BY created_at, id) as display_num
    FROM flashcards
)
UPDATE flashcards
SET display_index = (
    SELECT display_num
    FROM numbered_cards
    WHERE numbered_cards.id = flashcards.id
);

-- Create unique index to enforce constraint
CREATE UNIQUE INDEX idx_flashcards_text_display ON flashcards(text_id, display_index);

-- Create index for query performance
CREATE INDEX idx_flashcards_text_created ON flashcards(text_id, created_at);
```

#### Phase 2: Update Rust Models

**File:** `src-tauri/src/models/flashcard.rs`
```rust
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Flashcard {
    pub id: i64,
    pub text_id: i64,
    pub user_id: i64,
    pub original_text: String,
    pub cloze_text: String,
    pub cloze_index: i64,
    pub display_index: i64,  // ← Add this field
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub cloze_note_id: Option<i64>,
    // ... FSRS fields ...
}
```

#### Phase 3: Update Card Creation Command

**File:** `src-tauri/src/commands/flashcards.rs`
```rust
#[tauri::command]
pub async fn create_flashcard_from_cloze(
    text_id: i64,
    selected_text: String,
    cloze_text: String,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<Flashcard>, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let user_id = 1;
    let now = Utc::now();

    let parsed = ClozeParser::parse(&cloze_text)
        .map_err(|e| format!("Failed to parse cloze text: {}", e))?;

    let cloze_numbers = ClozeParser::extract_cloze_numbers(&cloze_text)
        .map_err(|e| format!("Failed to extract cloze numbers: {}", e))?;

    if cloze_numbers.is_empty() {
        return Err("No cloze deletions found in text".to_string());
    }

    let parsed_segments_json = serde_json::to_string(&parsed.segments)
        .map_err(|e| format!("Failed to serialize parsed segments: {}", e))?;

    let cloze_count = cloze_numbers.len() as i64;

    // Create the cloze note
    let cloze_note_result = sqlx::query!(
        r#"
        INSERT INTO cloze_notes (text_id, user_id, original_text, parsed_segments, cloze_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        "#,
        text_id,
        user_id,
        cloze_text,
        parsed_segments_json,
        cloze_count,
        now,
        now
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create cloze note: {}", e))?;

    let cloze_note_id = cloze_note_result.last_insert_rowid();

    let mut flashcards = Vec::new();

    // Create flashcards for each cloze number
    for cloze_number in cloze_numbers {
        // Get the next available display_index for this text_id
        let max_result = sqlx::query!(
            r#"
            SELECT COALESCE(MAX(display_index), 0) as "max_index: i64"
            FROM flashcards
            WHERE text_id = ?
            "#,
            text_id
        )
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Failed to get max display_index: {}", e))?;

        let display_index = max_result.max_index + 1;
        let cloze_index = cloze_number as i64;

        // Insert the flashcard
        let flashcard_result = sqlx::query!(
            r#"
            INSERT INTO flashcards (
                text_id, user_id, original_text, cloze_text, cloze_index,
                cloze_note_id, display_index, created_at, updated_at, due,
                stability, difficulty, elapsed_days, scheduled_days,
                reps, lapses, state, last_review
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            text_id,
            user_id,
            selected_text,
            cloze_text,
            cloze_index,
            cloze_note_id,
            display_index,
            now,
            now,
            now,
            0.0,
            0.0,
            0,
            0,
            0,
            0,
            0,
            None::<chrono::DateTime<Utc>>
        )
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to create flashcard for cloze {}: {}", cloze_number, e))?;

        let flashcard_id = flashcard_result.last_insert_rowid();

        // Fetch the created flashcard
        let flashcard = sqlx::query_as!(
            Flashcard,
            r#"
            SELECT
                id as "id!",
                text_id as "text_id!",
                user_id as "user_id!",
                original_text,
                cloze_text,
                cloze_index as "cloze_index!",
                display_index as "display_index!",
                created_at as "created_at: _",
                updated_at as "updated_at: _",
                cloze_note_id,
                due as "due: _",
                stability as "stability!",
                difficulty as "difficulty!",
                elapsed_days as "elapsed_days!",
                scheduled_days as "scheduled_days!",
                reps as "reps!",
                lapses as "lapses!",
                state as "state!",
                last_review as "last_review: _"
            FROM flashcards
            WHERE id = ?
            "#,
            flashcard_id
        )
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Failed to fetch created flashcard: {}", e))?;

        flashcards.push(flashcard);
    }

    Ok(flashcards)
}
```

**Update the query command:**
```rust
#[tauri::command]
pub async fn get_flashcards_by_text(
    text_id: i64,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<Flashcard>, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let flashcards = sqlx::query_as!(
        Flashcard,
        r#"
        SELECT
            id as "id!",
            text_id as "text_id!",
            user_id as "user_id!",
            original_text,
            cloze_text,
            cloze_index as "cloze_index!",
            display_index as "display_index!",
            created_at as "created_at: _",
            updated_at as "updated_at: _",
            cloze_note_id,
            due as "due: _",
            stability as "stability!",
            difficulty as "difficulty!",
            elapsed_days as "elapsed_days!",
            scheduled_days as "scheduled_days!",
            reps as "reps!",
            lapses as "lapses!",
            state as "state!",
            last_review as "last_review: _"
        FROM flashcards
        WHERE text_id = ?
        ORDER BY display_index ASC
        "#,
        text_id
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch flashcards: {}", e))?;

    Ok(flashcards)
}
```

#### Phase 4: Update TypeScript Types

**File:** `src/lib/types/index.ts` (or wherever Flashcard type is defined)
```typescript
export interface Flashcard {
  id: number;
  textId: number;
  userId: number;
  originalText: string;
  clozeText: string;
  clozeIndex: number;
  displayIndex: number;  // ← Add this field
  createdAt: string;
  updatedAt: string;
  clozeNoteId: number | null;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: string | null;
}
```

#### Phase 5: Update UI Components

**File:** `src/lib/components/flashcard/FlashcardSidebar.tsx`
```typescript
// Line 128-130: Update display
<div className="text-xs text-gray-500">
  Card #{flashcard.displayIndex}
</div>
```

**Optional Enhancement: Show Both Numbers**
```typescript
<div className="text-xs text-gray-500">
  Card #{flashcard.displayIndex}
  <span className="ml-1 text-gray-400 text-xs">
    (Cloze {flashcard.clozeIndex})
  </span>
</div>
```

**File:** `src/lib/components/flashcard/FlashcardList.tsx`
```typescript
// Line 72-73: Update display
<div className="text-xs text-muted-foreground">
  Card #{flashcard.displayIndex}
</div>
```

#### Phase 6: Testing Strategy

**Test Cases:**

1. **Basic Creation**
   - Create card with {{c1::text}} → Should be Card #1
   - Create another card with {{c1::text}} → Should be Card #2
   - Verify display_index values are 1 and 2

2. **Multiple Clozes in One Note**
   - Create "{{c1::A}} and {{c2::B}}" → Should create Card #1 and Card #2
   - Verify both have correct display_index

3. **Non-Sequential Cloze Numbers**
   - Create "{{c5::X}} and {{c2::Y}}" → Should create Card #1 and Card #2
   - Order should be based on creation order, not cloze number

4. **Multiple Sessions**
   - Create first note → Cards #1, #2
   - Create second note later → Cards #3, #4
   - Verify no duplicates

5. **Deletion Handling**
   - Create Cards #1, #2, #3
   - Delete Card #2
   - Verify: #1 and #3 remain (gap is acceptable)
   - Create new card → Should be Card #4 (not #2)

6. **Edge Cases**
   - First card ever for a text → Should be #1
   - After deleting all cards, create new one → Should be #1 again (or continue from last?)
   - Decision: After deleting all, next card should be #1 (MAX returns 0)

#### Phase 7: Documentation

**For Users (in-app help or docs):**
```markdown
## Flashcard Numbering

Each flashcard is assigned a unique Card Number (Card #1, #2, #3, etc.) when created.

- Numbers are assigned in the order cards are created
- Each card for a text has a unique number
- If you delete a card, its number is not reused (you may see gaps)
- Card numbers are different from cloze numbers (c1::, c2::, etc.)

Example:
- You create: "{{c1::Paris}} is the capital of {{c2::France}}"
  → Creates Card #1 (Paris) and Card #2 (France)
- Later, you create: "{{c1::Berlin}} is in {{c3::Germany}}"
  → Creates Card #3 (Berlin) and Card #4 (Germany)
  → Note: Card #3 and #4, not #1 and #3
```

**For Developers:**
- Add comments in code explaining the display_index calculation
- Document the decision to allow gaps vs renumber
- Add migration notes

## Edge Cases and Considerations

### 1. Concurrent Card Creation
**Problem:** Two users (or two tabs) create cards simultaneously for the same text_id.

**Current Risk:**
```
Tab A: SELECT MAX(display_index) → Returns 5
Tab B: SELECT MAX(display_index) → Returns 5
Tab A: INSERT with display_index=6
Tab B: INSERT with display_index=6 → UNIQUE CONSTRAINT VIOLATION
```

**Solutions:**

**A. Use Database Transaction with SELECT FOR UPDATE (Recommended)**
```rust
// Start transaction
let mut tx = pool.begin().await?;

// Lock the row to prevent concurrent reads
let max_result = sqlx::query!(
    r#"
    SELECT COALESCE(MAX(display_index), 0) as "max_index: i64"
    FROM flashcards
    WHERE text_id = ?
    "#,
    text_id
)
.fetch_one(&mut *tx)
.await?;

let display_index = max_result.max_index + 1;

// Insert with locked value
sqlx::query!(/* INSERT */).execute(&mut *tx).await?;

// Commit transaction
tx.commit().await?;
```

**B. Retry on Constraint Violation**
```rust
for attempt in 0..3 {
    match insert_flashcard(pool, text_id, display_index).await {
        Ok(result) => return Ok(result),
        Err(e) if is_unique_violation(&e) && attempt < 2 => {
            // Recalculate display_index and retry
            continue;
        }
        Err(e) => return Err(e),
    }
}
```

**C. Accept Single-User Application (Current State)**
- If Trivium is single-user desktop app, concurrent creation is unlikely
- Can add transaction safety later if needed

### 2. Bulk Operations
**Problem:** Creating many cards at once requires many MAX queries.

**Optimization:**
```rust
// Get max once before loop
let mut current_max = sqlx::query!(
    r#"SELECT COALESCE(MAX(display_index), 0) as "max_index: i64" FROM flashcards WHERE text_id = ?"#,
    text_id
).fetch_one(pool).await?.max_index;

// Use and increment for each card
for cloze_number in cloze_numbers {
    current_max += 1;
    let display_index = current_max;

    // Insert with display_index
    sqlx::query!(/* INSERT */).execute(pool).await?;
}
```

### 3. Migration of Existing Data
**Problem:** What if users already have flashcards?

**Solution:** The migration script (Phase 1) handles this:
```sql
WITH numbered_cards AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY text_id ORDER BY created_at, id) as display_num
    FROM flashcards
)
UPDATE flashcards
SET display_index = (SELECT display_num FROM numbered_cards WHERE numbered_cards.id = flashcards.id);
```

This assigns display_index based on creation order for all existing cards.

### 4. Deletion Gap Management

**Decision: Allow Gaps (1a)**

Pros:
- Stable numbering (Card #5 is always Card #5)
- Simple implementation
- No update cascades
- Predictable behavior

Cons:
- Visual gaps (Card #1, #3, #5)
- Highest number ≠ total count

**Alternative: Renumber (1b) - Not Recommended**

Would require:
```sql
-- After DELETE FROM flashcards WHERE id = ?
UPDATE flashcards
SET display_index = display_index - 1
WHERE text_id = ? AND display_index > ?;
```

Cons:
- Unstable numbers (Card #5 becomes Card #4)
- Performance impact on large sets
- Race conditions if cards are being reviewed
- Confusing if user has Card #5 open while it becomes Card #4

### 5. Display Index Overflow
**Problem:** What if display_index exceeds INTEGER max?

**Analysis:**
- SQLite INTEGER: -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807
- To overflow: Need > 9 quintillion cards per text
- Verdict: Not a practical concern

### 6. Cross-Text Display Index
**Question:** Should display_index be unique across all texts, or just within each text?

**Answer:** Within each text (current design)
- UNIQUE INDEX on (text_id, display_index)
- Text A can have Card #1, Text B can also have Card #1
- This is intuitive: each text has its own card sequence

## Alternative UI Presentations

Beyond "Card #5", consider these display options:

### Option A: Just the Number
```
Card #5
```
Simple, clean, recommended.

### Option B: Number with Cloze Reference
```
Card #5 (Cloze 2)
```
Helps power users understand the relationship. Good for debugging.

### Option C: Number with Note Context
```
Card #5
From note created Oct 13, 2025
```
Shows temporal context.

### Option D: Number with Creation Info
```
Card #5 of 12
```
Shows total count. Requires additional query or state management.

### Option E: Hierarchical Display
```
Note #3
├─ Card #7 (Cloze 1)
└─ Card #8 (Cloze 2)
```
Groups cards by their source note. More complex UI.

**Recommendation:** Start with Option A, optionally show cloze info on hover or in expanded view (Option B).

## Performance Considerations

### Query Performance

**Current Query (with display_index):**
```sql
SELECT * FROM flashcards WHERE text_id = ? ORDER BY display_index ASC
```
- Uses index: `idx_flashcards_text_display (text_id, display_index)`
- Performance: O(log n) lookup + O(k) scan where k = cards for this text
- Very efficient

**Insertion Performance:**
```sql
SELECT MAX(display_index) FROM flashcards WHERE text_id = ?
```
- Uses index: `idx_flashcards_text_display`
- Performance: O(log n) - index seek to find max
- Fast even with many cards

**Deletion Performance:**
```sql
DELETE FROM flashcards WHERE id = ?
```
- No cascading updates needed (with gap allowance)
- Performance: O(log n) - index deletion
- Very fast

### Scalability Analysis

**Assumptions:**
- Average text: 50 cards
- Power user: 100 texts
- Total cards: 5,000

**Queries per operation:**
- Create card: 1 SELECT MAX + 1 INSERT = 2 queries
- List cards: 1 SELECT = 1 query
- Delete card: 1 DELETE = 1 query

**Estimated latency (SQLite on SSD):**
- SELECT MAX: <1ms
- INSERT: <1ms
- SELECT list: <5ms (for 50 cards)
- DELETE: <1ms

**Verdict:** Excellent performance, no bottlenecks expected.

## Migration Impact Assessment

### Database Changes
- **Schema Change:** Add display_index column (non-breaking, has default NULL initially)
- **Data Migration:** Backfill display_index for existing cards
- **Index Addition:** Create UNIQUE index (fast on small datasets)

### Code Changes
- **Rust Models:** Add display_index field (1 line per struct)
- **Rust Commands:** Update INSERT and SELECT queries (10-20 lines)
- **TypeScript Types:** Add displayIndex field (1 line)
- **UI Components:** Change displayed value (2-3 components, 1 line each)

### Risk Assessment
- **Risk Level:** LOW
- **Breaking Changes:** None (backward compatible)
- **Data Loss Risk:** None (migration is additive)
- **Rollback Plan:** Can rollback migration if needed before production use

## Summary and Recommendations

### Final Recommendation

Implement **Option 1a: Auto-Incrementing display_index with Gaps**

### Key Benefits
1. **Unique Identification:** Each card has a unique number per text
2. **Stable Numbering:** Card #5 is always Card #5
3. **Sequential Display:** 1, 2, 3, 4... (intuitive)
4. **Session Independent:** Works across multiple card-creation sessions
5. **Simple Implementation:** Straightforward SQL and code
6. **Good Performance:** Efficient queries with proper indexes

### Implementation Priority
1. **Phase 1:** Database migration (add column, backfill, index)
2. **Phase 2:** Update Rust models and types
3. **Phase 3:** Update card creation command (with MAX query)
4. **Phase 4:** Update TypeScript types
5. **Phase 5:** Update UI components (display card number)
6. **Phase 6:** Testing (all test cases)
7. **Phase 7:** Documentation (user and developer docs)

### Success Criteria
- [x] Each flashcard displays a unique number per text
- [x] Numbers are stable (don't change unless card is deleted)
- [x] Numbers are sequential (1, 2, 3, 4...)
- [x] Multiple card creation sessions work correctly
- [x] No performance degradation
- [x] Existing data migrated successfully

### Future Enhancements (Optional)
- Renumbering UI (allow user to manually reorder cards)
- Bulk card operations (select multiple by display_index range)
- Display index across all texts (global card number)
- Export/import preserves display_index

## Conclusion

The recommended solution provides a robust, intuitive, and performant card enumeration system that solves the core problem while maintaining simplicity and stability. The implementation is straightforward and has minimal impact on existing code and data.

This design follows established database patterns, provides a clear user experience, and positions the system well for future enhancements.
