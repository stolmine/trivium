# Phase 3 Implementation Plan: Review System with FSRS

**Status**: Ready to Execute
**Estimated Duration**: 7-9 days
**Critical Blocker**: FSRS dependency conflict (resolved in this plan)
**Last Updated**: 2025-10-13

---

## Executive Summary

Phase 3 implements the spaced repetition review system using the FSRS-5 algorithm. This completes the core learning loop: reading → flashcard creation → spaced repetition review.

**Key Deliverables**:
- FSRS algorithm implementation (manual, no external dependency)
- Backend commands: `get_due_cards`, `grade_card`, `get_review_stats`
- Frontend: Full-screen review session with keyboard-driven workflow
- Review history tracking for analytics
- Session progress and completion screens

**Success Criteria**:
- Users can review due flashcards with spaced repetition scheduling
- FSRS algorithm calculates accurate intervals
- Keyboard-only workflow (Space, 1-4 keys)
- Review history persists to database
- No performance regressions

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Detailed Task Breakdown](#detailed-task-breakdown)
4. [Phase 3.1: FSRS Algorithm Implementation](#phase-31-fsrs-algorithm-implementation)
5. [Phase 3.2: Backend Commands](#phase-32-backend-commands)
6. [Phase 3.3: Review Session UI](#phase-33-review-session-ui)
7. [Phase 3.4: Keyboard Shortcuts & Polish](#phase-34-keyboard-shortcuts--polish)
8. [Phase 3.5: Testing & Bug Fixes](#phase-35-testing--bug-fixes)
9. [Testing Strategy](#testing-strategy)
10. [Risk Assessment & Mitigation](#risk-assessment--mitigation)
11. [Rollout Strategy](#rollout-strategy)
12. [Documentation Requirements](#documentation-requirements)
13. [Deployment Checklist](#deployment-checklist)

---

## Prerequisites

### Must Be Working from Phase 2:
- ✅ Flashcards stored in database with FSRS fields initialized
- ✅ `create_flashcard_from_cloze` creates cards with `due=NOW`, `state=0`
- ✅ Database schema includes all FSRS fields: `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `reps`, `lapses`, `state`, `last_review`
- ✅ Frontend has flashcard types defined: `Flashcard`, `ReviewQuality`, `ReviewResult`
- ✅ Review store skeleton exists (`src/lib/stores/review.ts`)
- ✅ Review page route exists (`/review`)

### Current State Verification:
```bash
# Verify database has flashcards table
sqlite3 ~/Library/Application\ Support/com.why.trivium/trivium.db ".schema flashcards"

# Check for FSRS fields
sqlite3 ~/Library/Application\ Support/com.why.trivium/trivium.db "PRAGMA table_info(flashcards);"

# Count existing cards
sqlite3 ~/Library/Application\ Support/com.why.trivium/trivium.db "SELECT COUNT(*) FROM flashcards;"
```

### Known Blockers Resolved:
- ✅ FSRS crate dependency conflict → **Manual implementation (see Phase 3.1)**
- ✅ Review page exists but not implemented → **Will implement in Phase 3.3**

---

## Architecture Overview

### Data Flow

```
User opens /review
    ↓
Frontend: Load due cards (get_due_cards)
    ↓
Backend: Query WHERE due <= NOW, ORDER BY due ASC
    ↓
Frontend: Display first card with cloze hidden
    ↓
User: Press Space to reveal answer
    ↓
Frontend: Show answer + 4 grade buttons (Again/Hard/Good/Easy)
    ↓
User: Press 1-4 to grade card
    ↓
Frontend: Call grade_card(flashcard_id, rating)
    ↓
Backend: FSRS calculates new state (stability, difficulty, due)
    ↓
Backend: Update flashcard + insert review_history row
    ↓
Frontend: Show next card or session complete screen
```

### FSRS State Machine

```
New Card (state=0)
    ↓ [Grade: Again]
    Learning (state=1, short interval ~1m)
    ↓ [Grade: Good]
    Review (state=2, FSRS-calculated interval)
    ↓ [Grade: Again]
    Relearning (state=3, back to learning)
    ↓ [Grade: Good]
    Review (state=2)
```

### Rating System (FSRS-5)

We'll use a **4-button system** (simpler than 6-button SM-2):

| Button | Rating | Meaning | Typical Next Interval |
|--------|--------|---------|----------------------|
| 1 | Again | Complete failure | 1 minute → 10 minutes |
| 2 | Hard | Difficult recall | ~1.2x stability |
| 3 | Good | Correct recall | ~2.5x stability |
| 4 | Easy | Trivial recall | ~4.0x stability |

---

## Detailed Task Breakdown

### Phase 3.1: FSRS Algorithm Implementation (Days 1-3)
**Estimated Time**: 2.5-3 days
**Complexity**: High
**Dependencies**: None
**Blocker Resolution**: Manual implementation avoids fsrs crate dependency

**Tasks**:
1. Create `src-tauri/src/services/fsrs.rs` module
2. Implement core FSRS types: `FSRSCard`, `FSRSParameters`, `SchedulingInfo`
3. Implement FSRS-5 formulas:
   - Stability calculation
   - Difficulty calculation
   - Retrievability calculation
   - Interval calculation
4. Write unit tests for algorithm edge cases
5. Validate against reference implementation

**Deliverables**:
- `/Users/why/repos/trivium/src-tauri/src/services/fsrs.rs` (150-200 LOC)
- Unit tests (50-75 LOC)
- Documentation comments explaining formulas

---

### Phase 3.2: Backend Commands (Days 3-5)
**Estimated Time**: 2 days
**Complexity**: Medium
**Dependencies**: Phase 3.1 complete

**Tasks**:
1. Implement `get_due_cards` command
   - Query cards WHERE `due <= NOW`
   - Order by `due ASC` (oldest first)
   - Optional: Add limit parameter (default 20)
2. Implement `grade_card` command
   - Accept `flashcard_id` and `rating` (1-4)
   - Load card from database
   - Call FSRS algorithm to calculate new state
   - Update flashcard record
   - Insert review_history record
   - Return updated card + next interval
3. Implement `get_review_stats` command
   - Count due cards
   - Count new cards (state=0)
   - Count learning cards (state=1,3)
   - Count review cards (state=2)
4. Wire commands to Tauri invoke_handler
5. Test with manual SQL queries

**Deliverables**:
- `/Users/why/repos/trivium/src-tauri/src/commands/review.rs` (~200-250 LOC)
- Update `/Users/why/repos/trivium/src-tauri/src/lib.rs` to register commands
- SQL migration if review_history table needs adjustments

---

### Phase 3.3: Review Session UI (Days 5-7)
**Estimated Time**: 2-2.5 days
**Complexity**: Medium-High
**Dependencies**: Phase 3.2 complete

**Tasks**:
1. Implement Zustand review store
   - `loadDueCards()` action
   - `gradeCard(rating)` action
   - `currentCard` state
   - `showAnswer` state
   - `sessionStats` state
2. Implement `ReviewSession` component
   - Full-screen layout (no sidebar)
   - Display card with cloze rendered (hidden by default)
   - "Show Answer" button (Space key)
   - 4-button grading interface
   - Progress indicator (X/Y cards)
3. Implement `ReviewCard` component
   - Parse and render cloze HTML from backend
   - Apply `.cloze-hidden` and `.cloze-visible` CSS classes
   - Smooth reveal animation
4. Implement `ReviewGrading` component
   - 4 buttons: Again, Hard, Good, Easy
   - Show predicted next intervals for each choice
   - Keyboard shortcuts (1-4)
   - Visual feedback on selection
5. Implement `SessionComplete` screen
   - Summary statistics
   - "Continue" and "Exit" buttons
   - Option to review more cards

**Deliverables**:
- `/Users/why/repos/trivium/src/lib/stores/review.ts` (~150-200 LOC)
- `/Users/why/repos/trivium/src/routes/review/index.tsx` (~200-250 LOC)
- `/Users/why/repos/trivium/src/lib/components/review/ReviewCard.tsx`
- `/Users/why/repos/trivium/src/lib/components/review/ReviewGrading.tsx`
- `/Users/why/repos/trivium/src/lib/components/review/SessionComplete.tsx`
- CSS for cloze styling (`.cloze-hidden`, `.cloze-visible`)

---

### Phase 3.4: Keyboard Shortcuts & Polish (Day 7-8)
**Estimated Time**: 1 day
**Complexity**: Low-Medium
**Dependencies**: Phase 3.3 complete

**Tasks**:
1. Implement keyboard event handlers
   - Space: Toggle answer visibility
   - 1-4: Grade card (when answer shown)
   - Esc: Exit review session (with confirmation)
   - ?: Show keyboard shortcut overlay (optional)
2. Add visual polish
   - Smooth card transitions
   - Loading states for commands
   - Error handling (no cards due, API errors)
   - Progress bar animation
3. Add "Start Review" button to Library page
   - Show count of due cards
   - Disable if no cards due
   - Navigate to `/review` on click
4. Improve accessibility
   - ARIA labels for buttons
   - Focus management
   - Screen reader support

**Deliverables**:
- Keyboard shortcuts documented in code
- Updated Library page with review button
- Error boundary for review session
- Accessibility audit passing

---

### Phase 3.5: Testing & Bug Fixes (Day 8-9)
**Estimated Time**: 1-1.5 days
**Complexity**: Medium
**Dependencies**: All previous phases complete

**Tasks**:
1. Write backend unit tests
   - Test FSRS algorithm with known inputs/outputs
   - Test `get_due_cards` with various dates
   - Test `grade_card` updates database correctly
   - Test edge cases (no cards, invalid rating, etc.)
2. Manual end-to-end testing
   - Create 10+ flashcards with different due dates
   - Complete full review session
   - Verify intervals calculated correctly
   - Test keyboard shortcuts
   - Test session interruption/resume
3. Performance testing
   - Load 100+ cards and measure query time
   - Ensure card transitions < 100ms
   - Check memory usage during long sessions
4. Bug fixes and edge case handling
   - Handle cards with corrupted FSRS state
   - Handle network errors gracefully
   - Handle empty queue mid-session
   - Add retry logic for failed API calls

**Deliverables**:
- Unit test suite passing (backend)
- Manual test checklist completed
- Performance benchmarks documented
- Known issues list (if any)

---

## Phase 3.1: FSRS Algorithm Implementation

### Overview

We're implementing FSRS-5 manually to avoid the dependency conflict with sqlx. The algorithm is well-documented and consists of mathematical formulas for calculating stability and difficulty.

### Core Concepts

1. **Stability (S)**: Time (in days) for retrievability to decrease from 100% to 90%
2. **Difficulty (D)**: Inherent complexity of the item (0.0 to 10.0)
3. **Retrievability (R)**: Probability of successful recall (0.0 to 1.0)
4. **State**: Card lifecycle (0=New, 1=Learning, 2=Review, 3=Relearning)

### FSRS-5 Formulas

#### Initial Stability (S₀)
For new cards (first review):
```
S₀ = w[rating - 1]

where w = [0.4, 0.6, 2.4, 5.8] for ratings [1, 2, 3, 4]
```

#### Retrievability (R)
```
R = (1 + t / (9 * S))^(-1)

where:
  t = elapsed time since last review (days)
  S = current stability
```

#### Next Stability (S')
After review:
```
S' = S * (1 + exp(w[8]) * (11 - D) * S^(-w[9]) * (exp(w[10] * (1 - R)) - 1))

Simplified for implementation:
- If rating = Again (1): S' = w[11] * S^w[12] * exp(w[13] * (D - w[14]))
- If rating = Hard (2): S' = S * (1.2)
- If rating = Good (3): S' = S * (2.5)
- If rating = Easy (4): S' = S * (4.0)
```

#### Next Difficulty (D')
```
D' = D + w[6] * (rating - 3)

Clamped to [1, 10]
```

### Implementation Structure

```rust
// src-tauri/src/services/fsrs.rs

use chrono::{DateTime, Utc};

/// FSRS algorithm parameters (optimized defaults from FSRS-5)
pub struct FSRSParameters {
    /// Initial stabilities for ratings 1-4
    pub initial_stability: [f64; 4],
    /// Difficulty modifiers
    pub difficulty_weight: f64,
    /// Other weights for stability calculation
    pub weights: Vec<f64>,
}

impl Default for FSRSParameters {
    fn default() -> Self {
        Self {
            initial_stability: [0.4, 0.6, 2.4, 5.8],
            difficulty_weight: 0.5,
            weights: vec![/* optimized weights */],
        }
    }
}

/// FSRS scheduling information returned after grading
pub struct SchedulingInfo {
    pub new_stability: f64,
    pub new_difficulty: f64,
    pub interval: i64, // days
    pub next_due: DateTime<Utc>,
    pub new_state: i64,
}

pub struct FSRSScheduler {
    params: FSRSParameters,
}

impl FSRSScheduler {
    pub fn new() -> Self {
        Self {
            params: FSRSParameters::default(),
        }
    }

    /// Schedule a card based on rating (1-4)
    pub fn schedule(
        &self,
        current_stability: f64,
        current_difficulty: f64,
        current_state: i64,
        elapsed_days: i64,
        rating: i64, // 1=Again, 2=Hard, 3=Good, 4=Easy
    ) -> SchedulingInfo {
        // Implementation here
    }

    /// Calculate retrievability
    fn retrievability(&self, elapsed_days: i64, stability: f64) -> f64 {
        let t = elapsed_days as f64;
        (1.0 + t / (9.0 * stability)).powf(-1.0)
    }

    /// Calculate next stability based on rating
    fn next_stability(&self, current_stability: f64, rating: i64, difficulty: f64, retrievability: f64) -> f64 {
        match rating {
            1 => current_stability * 0.5, // Again: reduce stability
            2 => current_stability * 1.2, // Hard
            3 => current_stability * 2.5, // Good
            4 => current_stability * 4.0, // Easy
            _ => current_stability,
        }
    }

    /// Calculate next difficulty
    fn next_difficulty(&self, current_difficulty: f64, rating: i64) -> f64 {
        let delta = self.params.difficulty_weight * (rating - 3) as f64;
        (current_difficulty + delta).clamp(1.0, 10.0)
    }

    /// Calculate interval from stability
    fn stability_to_interval(&self, stability: f64) -> i64 {
        stability.round().max(1.0) as i64
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_stability() {
        let scheduler = FSRSScheduler::new();
        // Test that new cards get correct initial stability
    }

    #[test]
    fn test_retrievability_decreases_over_time() {
        // Test R decreases as elapsed_days increases
    }

    #[test]
    fn test_good_rating_increases_stability() {
        // Test that rating=3 increases stability
    }

    #[test]
    fn test_again_rating_decreases_stability() {
        // Test that rating=1 decreases stability
    }

    #[test]
    fn test_difficulty_clamping() {
        // Test that difficulty stays in [1, 10]
    }
}
```

### Validation Strategy

1. **Reference Implementation**: Compare results against `fsrs-rs` crate (run separately, not in main project)
2. **Known Test Cases**: Use examples from FSRS documentation
3. **Sanity Checks**:
   - New cards should have low initial intervals (< 1 week)
   - "Good" ratings should ~double intervals
   - "Again" ratings should reset to short intervals
   - Stability should never be negative or zero

### Time Estimate Breakdown

| Task | Time |
|------|------|
| Read FSRS-5 spec and reference code | 2 hours |
| Implement core types and parameters | 2 hours |
| Implement scheduling logic | 4 hours |
| Write unit tests | 3 hours |
| Validate against reference | 2 hours |
| Debug and refine | 3 hours |
| **Total** | **16 hours (~2 days)** |

---

## Phase 3.2: Backend Commands

### Command 1: `get_due_cards`

**Signature**:
```rust
#[tauri::command]
pub async fn get_due_cards(
    limit: Option<i64>,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<Flashcard>, String>
```

**Logic**:
1. Get current timestamp
2. Query flashcards WHERE `due <= NOW`
3. Order by `due ASC` (oldest first priority)
4. Apply limit (default 20, max 100)
5. Return flashcards

**SQL**:
```sql
SELECT * FROM flashcards
WHERE due <= ?
ORDER BY due ASC
LIMIT ?
```

**Edge Cases**:
- No cards due → Return empty array (not error)
- Invalid limit → Clamp to [1, 100]
- Multiple users → Filter by user_id (future)

**Testing**:
```rust
#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn test_get_due_cards_returns_only_due() {
        // Create 3 cards: 1 past due, 1 due now, 1 future
        // Assert only 2 returned
    }

    #[tokio::test]
    async fn test_get_due_cards_respects_limit() {
        // Create 50 due cards
        // Call with limit=10
        // Assert 10 returned
    }
}
```

---

### Command 2: `grade_card`

**Signature**:
```rust
#[tauri::command]
pub async fn grade_card(
    flashcard_id: i64,
    rating: i64, // 1-4
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<GradeResult, String>

pub struct GradeResult {
    pub flashcard: Flashcard,
    pub interval_days: i64,
    pub next_due: DateTime<Utc>,
}
```

**Logic**:
1. Validate rating in [1, 4]
2. Load flashcard from database
3. Calculate elapsed_days since last_review (or 0 if never reviewed)
4. Call FSRS scheduler to get new state
5. Update flashcard record:
   - `stability` = new_stability
   - `difficulty` = new_difficulty
   - `due` = next_due
   - `scheduled_days` = interval_days
   - `elapsed_days` = elapsed_days
   - `reps` += 1
   - `lapses` += 1 if rating=1
   - `state` = new_state
   - `last_review` = NOW
   - `updated_at` = NOW
6. Insert review_history record
7. Return updated flashcard + scheduling info

**SQL**:
```sql
-- Update flashcard
UPDATE flashcards
SET stability = ?,
    difficulty = ?,
    due = ?,
    scheduled_days = ?,
    elapsed_days = ?,
    reps = reps + 1,
    lapses = lapses + ?,
    state = ?,
    last_review = ?,
    updated_at = ?
WHERE id = ?

-- Insert review history
INSERT INTO review_history (
    flashcard_id, user_id, reviewed_at, rating,
    state_before, state_after
) VALUES (?, ?, ?, ?, ?, ?)
```

**Edge Cases**:
- Invalid flashcard_id → Return error "Card not found"
- Invalid rating → Return error "Rating must be 1-4"
- Database write fails → Rollback transaction
- Negative elapsed_days → Set to 0

**Testing**:
```rust
#[tokio::test]
async fn test_grade_card_updates_stability() {
    // Create new card (state=0, stability=0)
    // Grade with rating=3 (Good)
    // Assert stability > 0
    // Assert due > NOW
}

#[tokio::test]
async fn test_grade_card_records_history() {
    // Grade a card
    // Query review_history
    // Assert record exists with correct rating
}

#[tokio::test]
async fn test_grade_card_increments_lapses() {
    // Grade card with rating=1 (Again)
    // Assert lapses += 1
}
```

---

### Command 3: `get_review_stats`

**Signature**:
```rust
#[tauri::command]
pub async fn get_review_stats(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<ReviewStats, String>

#[derive(Serialize)]
pub struct ReviewStats {
    pub due_count: i64,
    pub new_count: i64,
    pub learning_count: i64,
    pub review_count: i64,
}
```

**Logic**:
```sql
SELECT
    COUNT(CASE WHEN due <= CURRENT_TIMESTAMP THEN 1 END) as due_count,
    COUNT(CASE WHEN state = 0 THEN 1 END) as new_count,
    COUNT(CASE WHEN state IN (1, 3) THEN 1 END) as learning_count,
    COUNT(CASE WHEN state = 2 THEN 1 END) as review_count
FROM flashcards
WHERE user_id = ?
```

**Testing**:
```rust
#[tokio::test]
async fn test_review_stats_counts_correctly() {
    // Create 2 new, 3 learning, 5 review cards
    // Assert stats match
}
```

---

### Time Estimate Breakdown

| Task | Time |
|------|------|
| Implement get_due_cards | 2 hours |
| Implement grade_card | 4 hours |
| Implement get_review_stats | 1 hour |
| Wire to Tauri | 1 hour |
| Write tests | 3 hours |
| Manual testing with SQL | 2 hours |
| Debug and refine | 3 hours |
| **Total** | **16 hours (~2 days)** |

---

## Phase 3.3: Review Session UI

### Component Architecture

```
/review
  ↓
ReviewSession (container)
  ↓
  ├─ ReviewHeader (progress, stats)
  ├─ ReviewCard (display cloze)
  ├─ ReviewGrading (4 buttons + intervals)
  └─ SessionComplete (summary)
```

### State Management (Zustand)

```typescript
// src/lib/stores/review.ts

interface ReviewState {
  // Queue
  queue: Flashcard[];
  currentIndex: number;
  currentCard: Flashcard | null;

  // UI State
  showAnswer: boolean;
  isLoading: boolean;
  error: string | null;

  // Session
  sessionStats: {
    totalReviewed: number;
    againCount: number;
    hardCount: number;
    goodCount: number;
    easyCount: number;
    startTime: Date;
  };

  // Actions
  loadDueCards: () => Promise<void>;
  gradeCard: (rating: ReviewQuality) => Promise<void>;
  toggleAnswer: () => void;
  nextCard: () => void;
  resetSession: () => void;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  // Initial state
  queue: [],
  currentIndex: 0,
  currentCard: null,
  showAnswer: false,
  isLoading: false,
  error: null,
  sessionStats: {
    totalReviewed: 0,
    againCount: 0,
    hardCount: 0,
    goodCount: 0,
    easyCount: 0,
    startTime: new Date(),
  },

  // Load due cards from backend
  loadDueCards: async () => {
    set({ isLoading: true, error: null });
    try {
      const cards = await invoke<Flashcard[]>('get_due_cards', { limit: 20 });
      set({
        queue: cards,
        currentIndex: 0,
        currentCard: cards[0] || null,
        isLoading: false,
        sessionStats: { ...get().sessionStats, startTime: new Date() }
      });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  // Grade current card
  gradeCard: async (rating: ReviewQuality) => {
    const { currentCard, currentIndex, queue, sessionStats } = get();
    if (!currentCard) return;

    set({ isLoading: true });
    try {
      await invoke('grade_card', {
        flashcardId: currentCard.id,
        rating: rating + 1, // Convert 0-3 to 1-4
      });

      // Update stats
      const statKey = ['againCount', 'hardCount', 'goodCount', 'easyCount'][rating];
      set({
        sessionStats: {
          ...sessionStats,
          totalReviewed: sessionStats.totalReviewed + 1,
          [statKey]: sessionStats[statKey] + 1,
        },
      });

      // Move to next card
      get().nextCard();
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  // Toggle answer visibility
  toggleAnswer: () => {
    set({ showAnswer: !get().showAnswer });
  },

  // Move to next card
  nextCard: () => {
    const { queue, currentIndex } = get();
    const nextIndex = currentIndex + 1;

    if (nextIndex < queue.length) {
      set({
        currentIndex: nextIndex,
        currentCard: queue[nextIndex],
        showAnswer: false,
        isLoading: false,
      });
    } else {
      // Session complete
      set({
        currentCard: null,
        showAnswer: false,
        isLoading: false,
      });
    }
  },

  // Reset session
  resetSession: () => {
    set({
      queue: [],
      currentIndex: 0,
      currentCard: null,
      showAnswer: false,
      sessionStats: {
        totalReviewed: 0,
        againCount: 0,
        hardCount: 0,
        goodCount: 0,
        easyCount: 0,
        startTime: new Date(),
      },
    });
  },
}));
```

---

### Component 1: ReviewSession

```typescript
// src/routes/review/index.tsx

export function ReviewPage() {
  const {
    currentCard,
    showAnswer,
    isLoading,
    error,
    queue,
    currentIndex,
    loadDueCards,
    gradeCard,
    toggleAnswer,
  } = useReviewStore();

  // Load cards on mount
  useEffect(() => {
    loadDueCards();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        toggleAnswer();
      }

      if (showAnswer) {
        if (e.key === '1') gradeCard(0); // Again
        if (e.key === '2') gradeCard(1); // Hard
        if (e.key === '3') gradeCard(2); // Good
        if (e.key === '4') gradeCard(3); // Easy
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer]);

  if (isLoading && !currentCard) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-500">{error}</div>;
  }

  if (!currentCard) {
    return <SessionComplete />;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <ReviewHeader progress={currentIndex + 1} total={queue.length} />

      <div className="flex-1 flex items-center justify-center p-8">
        <ReviewCard card={currentCard} showAnswer={showAnswer} onToggleAnswer={toggleAnswer} />
      </div>

      {showAnswer && (
        <div className="p-8 border-t">
          <ReviewGrading onGrade={gradeCard} disabled={isLoading} />
        </div>
      )}
    </div>
  );
}
```

---

### Component 2: ReviewCard

```typescript
// src/lib/components/review/ReviewCard.tsx

interface ReviewCardProps {
  card: Flashcard;
  showAnswer: boolean;
  onToggleAnswer: () => void;
}

export function ReviewCard({ card, showAnswer, onToggleAnswer }: ReviewCardProps) {
  return (
    <div className="max-w-2xl w-full">
      {/* Render cloze HTML */}
      <div
        className="text-xl mb-8"
        dangerouslySetInnerHTML={{ __html: renderCloze(card.clozeText, card.clozeNumber, showAnswer) }}
      />

      {!showAnswer && (
        <button
          onClick={onToggleAnswer}
          className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          Show Answer <span className="text-muted-foreground ml-2">(Space)</span>
        </button>
      )}
    </div>
  );
}

// Helper to render cloze deletion
function renderCloze(clozeText: string, clozeNumber: number, revealed: boolean): string {
  // Parse cloze syntax and render HTML
  // Use same logic as FlashcardPreview
  // Apply .cloze-hidden or .cloze-visible classes
}
```

---

### Component 3: ReviewGrading

```typescript
// src/lib/components/review/ReviewGrading.tsx

interface ReviewGradingProps {
  onGrade: (rating: ReviewQuality) => void;
  disabled?: boolean;
}

export function ReviewGrading({ onGrade, disabled }: ReviewGradingProps) {
  const grades = [
    { rating: 0, label: 'Again', color: 'bg-red-500', key: '1', interval: '<10m' },
    { rating: 1, label: 'Hard', color: 'bg-orange-500', key: '2', interval: '4d' },
    { rating: 2, label: 'Good', color: 'bg-green-500', key: '3', interval: '10d' },
    { rating: 3, label: 'Easy', color: 'bg-blue-500', key: '4', interval: '1mo' },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {grades.map((grade) => (
        <button
          key={grade.rating}
          onClick={() => onGrade(grade.rating as ReviewQuality)}
          disabled={disabled}
          className={`${grade.color} text-white p-4 rounded-lg hover:opacity-90 disabled:opacity-50`}
        >
          <div className="text-lg font-semibold">{grade.label}</div>
          <div className="text-sm opacity-80">{grade.key}</div>
          <div className="text-xs mt-1">{grade.interval}</div>
        </button>
      ))}
    </div>
  );
}
```

---

### Component 4: SessionComplete

```typescript
// src/lib/components/review/SessionComplete.tsx

export function SessionComplete() {
  const { sessionStats, resetSession } = useReviewStore();
  const navigate = useNavigate();

  const { totalReviewed, againCount, hardCount, goodCount, easyCount, startTime } = sessionStats;
  const duration = Math.floor((Date.now() - startTime.getTime()) / 1000 / 60); // minutes

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="max-w-md w-full p-8 bg-card rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center">Session Complete!</h1>

        <div className="space-y-4 mb-8">
          <StatRow label="Cards reviewed" value={totalReviewed} />
          <StatRow label="Again" value={againCount} color="text-red-500" />
          <StatRow label="Hard" value={hardCount} color="text-orange-500" />
          <StatRow label="Good" value={goodCount} color="text-green-500" />
          <StatRow label="Easy" value={easyCount} color="text-blue-500" />
          <StatRow label="Duration" value={`${duration} min`} />
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              resetSession();
              window.location.reload(); // Reload to fetch new due cards
            }}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Review More Cards
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full py-3 border rounded-lg hover:bg-muted"
          >
            Back to Library
          </button>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, color = 'text-foreground' }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}
```

---

### CSS for Cloze Styling

```css
/* Add to global styles */

.cloze-hidden {
  background-color: hsl(var(--primary));
  color: transparent;
  user-select: none;
  border-radius: 4px;
  padding: 0 4px;
}

.cloze-visible {
  background-color: hsl(var(--primary) / 0.2);
  color: hsl(var(--primary-foreground));
  border-radius: 4px;
  padding: 0 4px;
  font-weight: 600;
}
```

---

### Time Estimate Breakdown

| Task | Time |
|------|------|
| Implement review store | 3 hours |
| Implement ReviewSession | 3 hours |
| Implement ReviewCard | 2 hours |
| Implement ReviewGrading | 2 hours |
| Implement SessionComplete | 1 hour |
| Keyboard shortcuts | 2 hours |
| CSS styling | 1 hour |
| Integration testing | 3 hours |
| **Total** | **17 hours (~2 days)** |

---

## Phase 3.4: Keyboard Shortcuts & Polish

### Keyboard Shortcuts

| Key | Action | Condition |
|-----|--------|-----------|
| Space | Toggle answer visibility | Always |
| 1 | Grade "Again" | Answer visible |
| 2 | Grade "Hard" | Answer visible |
| 3 | Grade "Good" | Answer visible |
| 4 | Grade "Easy" | Answer visible |
| Esc | Exit session (with confirmation) | Always |
| ? | Show keyboard help overlay | Always (optional) |

### Visual Polish Checklist

- [ ] Smooth card transition animations (fade in/out)
- [ ] Loading spinner during API calls
- [ ] Error toast notifications
- [ ] Progress bar with gradient
- [ ] Button hover states
- [ ] Focus indicators for accessibility
- [ ] Card flip animation on reveal (optional)

### Library Page Integration

Add a "Start Review" button that:
1. Shows count of due cards (fetch from `get_review_stats`)
2. Disables if no cards due
3. Navigates to `/review` on click

```typescript
// Update LibraryPage

export function LibraryPage() {
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);

  useEffect(() => {
    invoke<ReviewStats>('get_review_stats').then(setReviewStats);
  }, []);

  return (
    <div>
      {/* Header with review button */}
      <div className="flex items-center justify-between mb-6">
        <h1>Library</h1>

        {reviewStats && (
          <button
            onClick={() => navigate('/review')}
            disabled={reviewStats.due_count === 0}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
          >
            Review Cards ({reviewStats.due_count})
          </button>
        )}
      </div>

      {/* Rest of library UI */}
    </div>
  );
}
```

---

## Phase 3.5: Testing & Bug Fixes

### Backend Unit Tests

```rust
// src-tauri/src/services/fsrs.rs

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_stability_for_new_card() {
        let scheduler = FSRSScheduler::new();
        let result = scheduler.schedule(0.0, 5.0, 0, 0, 3);
        assert!(result.new_stability > 0.0);
        assert_eq!(result.interval, 2); // Good rating on new card
    }

    #[test]
    fn test_good_rating_doubles_interval() {
        let scheduler = FSRSScheduler::new();
        let result = scheduler.schedule(2.0, 5.0, 2, 2, 3);
        assert!(result.new_stability > 4.0); // ~2.5x
    }

    #[test]
    fn test_again_rating_resets_to_short_interval() {
        let scheduler = FSRSScheduler::new();
        let result = scheduler.schedule(10.0, 5.0, 2, 10, 1);
        assert!(result.interval < 1); // Should be < 1 day
    }

    #[test]
    fn test_difficulty_increases_with_hard() {
        let scheduler = FSRSScheduler::new();
        let result = scheduler.schedule(2.0, 5.0, 2, 2, 2);
        assert!(result.new_difficulty > 5.0);
    }

    #[test]
    fn test_difficulty_decreases_with_easy() {
        let scheduler = FSRSScheduler::new();
        let result = scheduler.schedule(2.0, 5.0, 2, 2, 4);
        assert!(result.new_difficulty < 5.0);
    }
}

// src-tauri/src/commands/review.rs

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_get_due_cards_empty() {
        // Test with no due cards
    }

    #[tokio::test]
    async fn test_grade_card_updates_database() {
        // Test that grading persists to database
    }

    #[tokio::test]
    async fn test_grade_card_invalid_rating() {
        // Test error handling for invalid rating
    }
}
```

### Manual Testing Checklist

#### Setup
- [ ] Create 10 flashcards with `due=NOW`
- [ ] Create 5 flashcards with `due=NOW + 1 day` (future)
- [ ] Create 3 flashcards with `due=NOW - 1 day` (overdue)

#### Review Session
- [ ] Navigate to `/review`
- [ ] Verify 13 cards loaded (10 current + 3 overdue)
- [ ] Verify progress shows "1 / 13"
- [ ] Press Space → Answer reveals
- [ ] Press 3 (Good) → Next card appears
- [ ] Verify progress shows "2 / 13"
- [ ] Press 1 (Again) on a card → Next card appears
- [ ] Complete all 13 cards → Session complete screen appears
- [ ] Verify stats match actions taken

#### Keyboard Shortcuts
- [ ] Space toggles answer visibility
- [ ] 1-4 keys grade card (only when answer visible)
- [ ] Esc exits session (with confirmation)
- [ ] Keys don't trigger when answer hidden

#### Edge Cases
- [ ] Start review with 0 due cards → Show "No cards due" message
- [ ] Interrupt session (refresh page) → Session resets
- [ ] API error during grade_card → Error toast appears
- [ ] Very long cloze text → Card layout doesn't break

#### Database Verification
```sql
-- After grading 5 cards, verify review_history has 5 rows
SELECT COUNT(*) FROM review_history;

-- Verify flashcards updated
SELECT id, reps, lapses, due, stability FROM flashcards WHERE reps > 0;

-- Verify intervals are reasonable
SELECT id, scheduled_days FROM flashcards WHERE scheduled_days > 0;
```

### Performance Testing

#### Metrics to Track
- Query time for `get_due_cards` with 1000+ cards: < 100ms
- Card transition latency: < 100ms
- Memory usage during 50-card session: < 100MB increase

#### Load Testing
```bash
# Create 1000 flashcards with SQL
sqlite3 ~/Library/Application\ Support/com.why.trivium/trivium.db <<EOF
INSERT INTO flashcards (text_id, user_id, original_text, cloze_text, cloze_index, due, created_at, updated_at)
SELECT 1, 1, 'Test card ' || num, 'Test {{c1::card}} ' || num, num, datetime('now'), datetime('now'), datetime('now')
FROM (SELECT level AS num FROM (WITH RECURSIVE cnt(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM cnt LIMIT 1000) SELECT x FROM cnt));
EOF

# Measure query time
time cargo run --release -- # (then trigger get_due_cards)
```

### Known Issues Template

If bugs are discovered, document them:

```markdown
## Known Issues

### High Priority
- [ ] Issue #1: Description
  - Impact: ...
  - Workaround: ...
  - Fix ETA: ...

### Medium Priority
- [ ] Issue #2: ...

### Low Priority / Future Enhancements
- [ ] Enhancement: Add undo last grade
- [ ] Enhancement: Show predicted intervals before revealing answer
```

---

## Testing Strategy

### Unit Tests (Backend)

**Target**: 80% code coverage for FSRS algorithm

**Test Categories**:
1. **FSRS Algorithm**:
   - Initial stability calculation
   - Retrievability formula
   - Stability progression (Again/Hard/Good/Easy)
   - Difficulty clamping
   - Edge cases (zero stability, negative elapsed days)

2. **Commands**:
   - `get_due_cards`: empty result, limit enforcement, ordering
   - `grade_card`: database updates, review history insertion, error handling
   - `get_review_stats`: accurate counts

**Test Execution**:
```bash
cd src-tauri
cargo test
cargo test -- --nocapture  # With output
cargo test fsrs::tests  # Specific module
```

---

### Integration Tests (Manual)

**End-to-End Flow**:
1. Create flashcards in Phase 2 UI
2. Set `due=NOW` in database (manual SQL)
3. Start review session
4. Complete 10 cards with different ratings
5. Verify:
   - Cards updated in database
   - Review history recorded
   - Intervals look reasonable
   - Next review session doesn't show same cards

**Test Matrix**:

| Scenario | Setup | Action | Expected Result |
|----------|-------|--------|-----------------|
| New card, Good rating | state=0, stability=0 | Grade with 3 | stability≈2.4, interval≈2d, state=2 |
| New card, Again rating | state=0, stability=0 | Grade with 1 | stability≈0.4, interval<1d, state=1 |
| Review card, Good rating | state=2, stability=5 | Grade with 3 | stability≈12.5, interval≈13d |
| Review card, Again rating | state=2, stability=5 | Grade with 1 | stability≈2.5, interval≈3d, state=3 |
| No cards due | All cards due in future | Open /review | Show "No cards due" message |
| 100 cards due | Create 100 due cards | Open /review | Load 20 cards (default limit) |

---

### Acceptance Criteria

Phase 3 is complete when:

- [ ] Backend tests pass (cargo test)
- [ ] Manual test checklist 100% complete
- [ ] No console errors during review session
- [ ] FSRS intervals match expected ranges (±20%)
- [ ] Review history persists correctly
- [ ] Performance: card transitions < 100ms
- [ ] Performance: get_due_cards < 100ms for 1000 cards
- [ ] Keyboard shortcuts work in all scenarios
- [ ] Session complete screen shows accurate stats
- [ ] Can complete 50-card session without crashes

---

## Risk Assessment & Mitigation

### Critical Risks

#### 1. FSRS Algorithm Incorrect
**Probability**: Medium
**Impact**: High
**Mitigation**:
- Validate against reference implementation (fsrs-rs crate run separately)
- Use well-documented formulas from FSRS-5 paper
- Test with known inputs/outputs from Anki FSRS plugin
- Sanity checks in unit tests (stability always positive, intervals reasonable)

**Rollback**: If algorithm is fundamentally broken, fall back to simple SM-2 (easier to implement).

---

#### 2. Database Transaction Failures
**Probability**: Low
**Impact**: High (data corruption)
**Mitigation**:
- Wrap `grade_card` in SQLx transaction
- Test rollback scenarios
- Add database integrity constraints
- Log all failed updates for debugging

**Rollback**: Restore database from backup (user keeps daily backup).

---

#### 3. Performance Degradation with Large Queues
**Probability**: Medium
**Impact**: Medium
**Mitigation**:
- Index on `due` column (already exists in schema)
- Limit query to 100 cards max
- Paginate if needed in future
- Profile queries with EXPLAIN QUERY PLAN

**Rollback**: Reduce default limit from 20 to 10.

---

### Medium Risks

#### 4. Keyboard Shortcuts Conflict with Browser
**Probability**: Medium
**Impact**: Low
**Mitigation**:
- Use common SRS shortcuts (1-4, Space)
- preventDefault() on all handled keys
- Test in multiple browsers
- Document shortcuts for users

**Rollback**: Disable keyboard shortcuts, buttons only.

---

#### 5. Cloze HTML Rendering Issues
**Probability**: Low
**Impact**: Medium
**Mitigation**:
- Reuse existing ClozeRenderer from Phase 2
- Test with complex cloze text (nested, special chars)
- Sanitize HTML to prevent XSS

**Rollback**: Display plain text with brackets instead of HTML.

---

### Low Risks

#### 6. Session State Lost on Refresh
**Probability**: High (expected)
**Impact**: Low
**Mitigation**:
- Accept this behavior for MVP
- Future: Persist session state to localStorage
- Show warning before refresh (optional)

**Rollback**: N/A (accept as-is).

---

## Rollout Strategy

### Deployment Phases

#### Phase 1: Development Testing (Days 1-7)
- Deploy to dev environment only
- Agent testing with synthetic data
- Fix critical bugs

#### Phase 2: Internal Testing (Days 8-9)
- Deploy to local machine
- Test with real flashcards
- Collect feedback
- Fix non-critical bugs

#### Phase 3: Production Release (Day 10)
- Merge to main branch
- Tag release `v0.3.0`
- Deploy to production
- Monitor for issues

### Incremental Rollout

We CAN deploy incrementally:

1. **Day 3**: Deploy FSRS algorithm + unit tests (no UI)
   - Test algorithm in isolation
   - Verify calculations correct

2. **Day 5**: Deploy backend commands
   - Test with curl/Postman
   - Verify database updates

3. **Day 7**: Deploy full review UI
   - End-to-end testing
   - User acceptance testing

### Rollback Plan

If critical issues arise:

1. **Immediate**: Revert to previous git commit
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Database**: No schema changes in Phase 3, so no migration rollback needed

3. **User Data**: Review history preserved even if we rollback code

4. **Communication**: Notify users of temporary downtime (if applicable)

---

## Documentation Requirements

### Code Documentation

#### Backend (Rust)
- [ ] Document FSRS formulas with links to source paper
- [ ] Add examples to public functions
- [ ] Explain state transitions (0→1→2→3)
- [ ] Document rating scale (1-4)

Example:
```rust
/// Schedule a flashcard based on user rating using FSRS-5 algorithm.
///
/// # Arguments
/// * `current_stability` - S parameter (time to 90% retrievability)
/// * `current_difficulty` - D parameter (0-10 scale)
/// * `current_state` - Card state (0=New, 1=Learning, 2=Review, 3=Relearning)
/// * `elapsed_days` - Days since last review
/// * `rating` - User rating (1=Again, 2=Hard, 3=Good, 4=Easy)
///
/// # Returns
/// `SchedulingInfo` with new stability, difficulty, interval, and due date.
///
/// # Example
/// ```
/// let scheduler = FSRSScheduler::new();
/// let info = scheduler.schedule(2.0, 5.0, 2, 2, 3); // Good rating
/// assert!(info.interval > 5); // Should increase interval
/// ```
pub fn schedule(...) -> SchedulingInfo { ... }
```

#### Frontend (TypeScript)
- [ ] Document component props
- [ ] Explain store actions
- [ ] Document keyboard shortcuts in code

---

### User Documentation

Create `/Users/why/repos/trivium/docs/REVIEW_SYSTEM.md`:

```markdown
# Review System Guide

## Overview
The review system uses spaced repetition to help you remember flashcards long-term.

## Starting a Review Session
1. Click "Review Cards" button on Library page
2. System loads cards due for review
3. Complete session or exit anytime

## During Review
1. Read the card with the blank [...]
2. Press **Space** to reveal the answer
3. Grade your recall:
   - **1 (Again)**: Didn't remember → Review again soon
   - **2 (Hard)**: Struggled to remember → Shorter interval
   - **3 (Good)**: Remembered correctly → Normal interval
   - **4 (Easy)**: Trivial to remember → Longer interval

## Keyboard Shortcuts
- **Space**: Show answer
- **1-4**: Grade card (when answer visible)
- **Esc**: Exit session

## Algorithm (FSRS-5)
Trivium uses the FSRS algorithm, which is 20-30% more efficient than traditional methods.
Cards you remember well appear less frequently.
Cards you struggle with appear more often.

## Tips
- Review daily for best retention
- Be honest with your ratings
- Use "Again" if you genuinely didn't remember
- Use "Easy" only if it was truly trivial
```

---

### API Documentation

Update `/Users/why/repos/trivium/architecture-backend.md`:

```markdown
## Review Commands

### get_due_cards
Returns flashcards due for review (due <= NOW).

**Parameters**:
- `limit` (optional): Max cards to return (default 20, max 100)

**Returns**: `Vec<Flashcard>`

**Example**:
```rust
let cards = invoke<Vec<Flashcard>>("get_due_cards", { limit: 50 }).await?;
```

### grade_card
Grades a flashcard and updates FSRS state.

**Parameters**:
- `flashcard_id`: i64
- `rating`: i64 (1=Again, 2=Hard, 3=Good, 4=Easy)

**Returns**: `GradeResult` with updated card + interval

**Example**:
```rust
let result = invoke<GradeResult>("grade_card", {
    flashcardId: 123,
    rating: 3
}).await?;
```

### get_review_stats
Returns counts of cards in different states.

**Parameters**: None

**Returns**: `ReviewStats`

**Example**:
```rust
let stats = invoke<ReviewStats>("get_review_stats").await?;
// stats.due_count, stats.new_count, etc.
```
```

---

## Deployment Checklist

### Pre-Deployment (Day 0)

- [ ] All code reviewed and approved
- [ ] Unit tests passing (cargo test)
- [ ] Manual test checklist complete
- [ ] Performance benchmarks acceptable
- [ ] No known critical bugs
- [ ] Documentation complete
- [ ] Backup database before deployment

### Deployment (Day 10)

#### 1. Code Merge
```bash
git checkout main
git pull origin main
git merge feature/phase-3-review-system
git push origin main
```

#### 2. Build & Test
```bash
cd src-tauri
cargo build --release
cargo test --release

cd ..
npm run build
```

#### 3. Database Check
```bash
# Verify schema
sqlite3 ~/Library/Application\ Support/com.why.trivium/trivium.db ".schema review_history"

# Verify indexes
sqlite3 ~/Library/Application\ Support/com.why.trivium/trivium.db "SELECT * FROM sqlite_master WHERE type='index' AND tbl_name='flashcards';"
```

#### 4. Smoke Test
- [ ] Launch app in production mode
- [ ] Create 3 flashcards
- [ ] Set due=NOW in database
- [ ] Complete review session
- [ ] Verify database updated
- [ ] Check for console errors

#### 5. Tag Release
```bash
git tag -a v0.3.0 -m "Phase 3: Review System with FSRS"
git push origin v0.3.0
```

### Post-Deployment (Day 10)

- [ ] Monitor logs for errors
- [ ] Test on production data
- [ ] Verify review sessions work with real cards
- [ ] Check performance with 100+ cards
- [ ] Update PROGRESS.md with completion status
- [ ] Create GitHub release notes

### Rollback Procedure (If Needed)

```bash
# Revert code
git revert v0.3.0
git push origin main

# Rebuild
npm run tauri build

# Restore database (if schema changed)
cp ~/Library/Application\ Support/com.why.trivium/trivium.db.backup \
   ~/Library/Application\ Support/com.why.trivium/trivium.db
```

---

## Success Metrics

### Completion Criteria

Phase 3 is considered **successfully complete** when:

1. **Functional**:
   - [ ] Users can start a review session from Library page
   - [ ] Cards appear in order of due date
   - [ ] Answer reveal works (Space key)
   - [ ] All 4 grading buttons work (1-4 keys)
   - [ ] Cards update in database after grading
   - [ ] Review history records persist
   - [ ] Session complete screen shows accurate stats

2. **Quality**:
   - [ ] No console errors during normal use
   - [ ] No crashes during 50-card session
   - [ ] FSRS intervals within expected range (±20%)
   - [ ] Backend unit tests pass (80%+ coverage)
   - [ ] Manual test checklist 100% complete

3. **Performance**:
   - [ ] `get_due_cards` query < 100ms for 1000 cards
   - [ ] Card transition latency < 100ms
   - [ ] Memory usage increase < 100MB during session

4. **Documentation**:
   - [ ] All public functions documented
   - [ ] User guide complete
   - [ ] API documentation updated
   - [ ] PROGRESS.md updated

5. **Testing**:
   - [ ] All test scenarios pass
   - [ ] No known critical bugs
   - [ ] Rollback plan tested

### Phase 3 Exit Criteria

Before moving to Phase 4:

- [ ] All completion criteria met
- [ ] Code merged to main branch
- [ ] Release tagged (v0.3.0)
- [ ] Documentation updated
- [ ] No critical bugs reported in first 48 hours
- [ ] Review system used successfully for 100+ reviews

---

## Appendix A: FSRS-5 Reference

### Key Papers
- [FSRS Algorithm Specification](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm)
- [Three-component model of memory (Bjork & Bjork)](https://bjorklab.psych.ucla.edu/research/)

### Reference Implementation
- [fsrs-rs (Rust)](https://github.com/open-spaced-repetition/fsrs-rs)
- [fsrs4anki (Python)](https://github.com/open-spaced-repetition/fsrs4anki)

### Default Parameters (FSRS-5)
```
Initial Stability:
  w[0] = 0.4  (Again)
  w[1] = 0.6  (Hard)
  w[2] = 2.4  (Good)
  w[3] = 5.8  (Easy)

Difficulty Weight:
  w[6] = 0.5

Stability Multipliers:
  Again: 0.5x
  Hard: 1.2x
  Good: 2.5x
  Easy: 4.0x
```

---

## Appendix B: Database Schema Verification

### Current Schema (From Phase 2)

```sql
-- Flashcards table (already exists)
CREATE TABLE flashcards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text_id INTEGER NOT NULL,
    user_id INTEGER DEFAULT 1,
    original_text TEXT NOT NULL,
    cloze_text TEXT NOT NULL,
    cloze_index INTEGER NOT NULL,
    display_index INTEGER NOT NULL,
    cloze_number INTEGER NOT NULL,
    cloze_note_id INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- FSRS State Fields (already present)
    due DATETIME NOT NULL,
    stability REAL NOT NULL DEFAULT 0.0,
    difficulty REAL NOT NULL DEFAULT 0.0,
    elapsed_days INTEGER NOT NULL DEFAULT 0,
    scheduled_days INTEGER NOT NULL DEFAULT 0,
    reps INTEGER NOT NULL DEFAULT 0,
    lapses INTEGER NOT NULL DEFAULT 0,
    state INTEGER NOT NULL DEFAULT 0,
    last_review DATETIME,

    FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE
);

-- Review history table (already exists)
CREATE TABLE review_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flashcard_id INTEGER NOT NULL,
    user_id INTEGER DEFAULT 1,
    reviewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rating INTEGER NOT NULL,
    review_duration_ms INTEGER,
    state_before INTEGER NOT NULL,
    state_after INTEGER NOT NULL,
    FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE
);

-- Indexes (already exist)
CREATE INDEX idx_flashcards_due ON flashcards(due);
CREATE INDEX idx_flashcards_state ON flashcards(state);
CREATE INDEX idx_review_history_flashcard_id ON review_history(flashcard_id);
```

**Verification**: No schema changes needed for Phase 3!

---

## Appendix C: Time Estimates Summary

| Phase | Tasks | Estimated Time | Complexity |
|-------|-------|----------------|------------|
| 3.1 | FSRS Algorithm Implementation | 2-3 days | High |
| 3.2 | Backend Commands | 2 days | Medium |
| 3.3 | Review Session UI | 2-2.5 days | Medium-High |
| 3.4 | Keyboard Shortcuts & Polish | 1 day | Low-Medium |
| 3.5 | Testing & Bug Fixes | 1-1.5 days | Medium |
| **Total** | **All Phases** | **8-10 days** | **Mixed** |

**Recommended Schedule**: 9 days with 1 day buffer

---

## Appendix D: Agent Execution Instructions

### For Backend Agent (Days 1-5)

1. **Day 1-3**: Implement FSRS algorithm
   - Read this plan's Phase 3.1 section
   - Create `src-tauri/src/services/fsrs.rs`
   - Implement `FSRSScheduler` struct
   - Write unit tests
   - Run `cargo test` until passing

2. **Day 3-5**: Implement commands
   - Read this plan's Phase 3.2 section
   - Create `src-tauri/src/commands/review.rs`
   - Implement `get_due_cards`, `grade_card`, `get_review_stats`
   - Wire to `lib.rs`
   - Test with manual SQL queries

**Success Criteria**:
- `cargo test` passes
- `cargo check` passes
- Can call commands via Tauri DevTools

---

### For Frontend Agent (Days 5-8)

1. **Day 5-7**: Implement review UI
   - Read this plan's Phase 3.3 section
   - Implement Zustand store (`src/lib/stores/review.ts`)
   - Implement components in order:
     1. ReviewSession (container)
     2. ReviewCard (display)
     3. ReviewGrading (buttons)
     4. SessionComplete (summary)
   - Add CSS for cloze styling

2. **Day 7-8**: Add shortcuts and polish
   - Read this plan's Phase 3.4 section
   - Implement keyboard event handlers
   - Add "Start Review" button to Library page
   - Test all shortcuts

**Success Criteria**:
- `npx tsc --noEmit` passes
- Can complete review session end-to-end
- All keyboard shortcuts work

---

### For Testing Agent (Days 8-9)

1. **Manual Testing**:
   - Read this plan's Phase 3.5 section
   - Follow manual test checklist
   - Document any bugs found

2. **Performance Testing**:
   - Create 1000 test flashcards
   - Measure query times
   - Verify card transitions smooth

3. **Bug Fixes**:
   - Report critical bugs to backend/frontend agents
   - Verify fixes
   - Re-test after fixes

**Success Criteria**:
- All tests pass
- No critical bugs
- Performance meets targets

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-10-13 | 1.0 | Initial plan created |

---

**Plan Status**: Ready for Execution
**Next Action**: Begin Phase 3.1 (FSRS Algorithm Implementation)
**Estimated Completion**: 2025-10-22 (9 days from now)
