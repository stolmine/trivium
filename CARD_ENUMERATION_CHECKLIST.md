# Card Enumeration Implementation Checklist

Quick reference checklist for implementing the display_index feature.

## Phase 1: Database Migration

- [ ] Create migration file: `migrations/20251013120000_add_display_index.sql`
- [ ] Add `display_index INTEGER` column to flashcards table
- [ ] Backfill existing cards with display_index using ROW_NUMBER()
- [ ] Create UNIQUE index: `idx_flashcards_text_display` on `(text_id, display_index)`
- [ ] Create index: `idx_flashcards_text_created` on `(text_id, created_at)`
- [ ] Test migration on development database
- [ ] Verify all existing cards have display_index assigned

## Phase 2: Rust Backend

### Models
- [ ] Update `src/models/flashcard.rs`
  - [ ] Add `pub display_index: i64` field to Flashcard struct
  - [ ] Update serde rename_all camelCase (should auto-convert)

### Commands - Create
- [ ] Update `src/commands/flashcards.rs::create_flashcard_from_cloze`
  - [ ] Add query to get MAX(display_index) for text_id before loop
  - [ ] Increment display_index for each card created
  - [ ] Update INSERT query to include display_index column
  - [ ] Update SELECT query to include display_index in result

### Commands - Query
- [ ] Update `src/commands/flashcards.rs::get_flashcards_by_text`
  - [ ] Add `display_index` to SELECT query
  - [ ] Change ORDER BY to `display_index ASC`

### Commands - Delete
- [ ] Review `src/commands/flashcards.rs::delete_flashcard`
  - [ ] Verify it doesn't need changes (should be just DELETE)
  - [ ] Confirm gaps are acceptable (no renumbering)

### SQLX Compile-Time Verification
- [ ] Update `.sqlx` cached query files by running:
  ```bash
  cargo sqlx prepare --database-url sqlite:trivium_dev.db
  ```
- [ ] Verify all queries compile without errors

## Phase 3: TypeScript Frontend

### Types
- [ ] Update `src/lib/types/index.ts` (or wherever Flashcard is defined)
  - [ ] Add `displayIndex: number` to Flashcard interface
  - [ ] Verify camelCase matches Rust serde output

### Components
- [ ] Update `src/lib/components/flashcard/FlashcardSidebar.tsx`
  - [ ] Line ~129: Change from `Card #{flashcard.clozeIndex}` to `Card #{flashcard.displayIndex}`
  - [ ] Optional: Add cloze info like `(Cloze {flashcard.clozeIndex})`

- [ ] Update `src/lib/components/flashcard/FlashcardList.tsx`
  - [ ] Line ~72: Change from `Cloze {flashcard.clozeIndex}` to `Card #{flashcard.displayIndex}`

- [ ] Review `src/lib/components/flashcard/FlashcardDisplay.tsx`
  - [ ] Update if this component displays card numbers

- [ ] Review `src/lib/components/flashcard/FlashcardPreview.tsx`
  - [ ] Update if this component shows card numbers

### Store
- [ ] Review `src/lib/stores/flashcard.ts` (if exists)
  - [ ] Ensure TypeScript types match updated Flashcard interface
  - [ ] No logic changes needed (display_index is just data)

## Phase 4: Testing

### Unit Tests (if applicable)
- [ ] Test ClozeParser (should not need changes)
- [ ] Test ClozeRenderer (should not need changes)

### Integration Tests
- [ ] Test card creation:
  - [ ] Create first card → display_index = 1
  - [ ] Create second card → display_index = 2
  - [ ] Create card with {{c1::}} and {{c2::}} → display_index = 1 and 2

- [ ] Test multiple sessions:
  - [ ] Create note 1 → Cards #1, #2
  - [ ] Create note 2 → Cards #3, #4
  - [ ] Verify no duplicate numbers

- [ ] Test non-sequential cloze numbers:
  - [ ] Create "{{c5::A}} {{c2::B}}" → Should create Cards #1, #2 (not #2, #5)

- [ ] Test deletion:
  - [ ] Create Cards #1, #2, #3
  - [ ] Delete Card #2
  - [ ] Verify #1 and #3 remain
  - [ ] Create new card → Should be Card #4

- [ ] Test edge cases:
  - [ ] Delete all cards, create new one → Should be Card #1
  - [ ] Multiple texts → Each has independent Card #1, #2, etc.

### Manual Testing
- [ ] Open application
- [ ] Navigate to a text
- [ ] Create first flashcard → Should show "Card #1"
- [ ] Create second flashcard → Should show "Card #2"
- [ ] Close app, reopen
- [ ] Create third flashcard → Should show "Card #3"
- [ ] Delete Card #2
- [ ] Verify Cards #1 and #3 still display correctly
- [ ] Create fourth card → Should show "Card #4"

### UI/UX Testing
- [ ] Verify card numbers are visible in sidebar
- [ ] Verify card numbers are readable (not too small/faint)
- [ ] Check dark mode (if applicable)
- [ ] Test with many cards (50+) to ensure no display issues
- [ ] Verify sorting by display_index works correctly

## Phase 5: Documentation

### Code Comments
- [ ] Add comment in migration explaining display_index purpose
- [ ] Add comment in Flashcard model explaining display_index vs cloze_index
- [ ] Add comment in create_flashcard_from_cloze explaining MAX query logic

### User Documentation
- [ ] Add explanation of card numbering in user guide (if exists)
- [ ] Update any screenshots showing card numbers
- [ ] Add FAQ entry: "Why do card numbers have gaps?"

### Developer Documentation
- [ ] Update API documentation (if exists)
- [ ] Document the decision to allow gaps vs renumber
- [ ] Add this design doc to project documentation

## Phase 6: Pre-Release Checks

### Database
- [ ] Verify migration runs cleanly on fresh database
- [ ] Verify migration runs cleanly on database with existing data
- [ ] Check unique constraint prevents duplicate (text_id, display_index)
- [ ] Verify indexes are created and used by query planner

### Performance
- [ ] Run EXPLAIN QUERY PLAN on get_flashcards_by_text
- [ ] Verify it uses idx_flashcards_text_display
- [ ] Test with 100+ cards per text
- [ ] Measure card creation latency (should be <10ms)

### Code Quality
- [ ] Run cargo fmt
- [ ] Run cargo clippy
- [ ] Fix any warnings
- [ ] Run prettier on TypeScript files
- [ ] Fix any TypeScript errors

### Build
- [ ] cargo build --release (verify no errors)
- [ ] npm run build (verify no errors)
- [ ] Test built application (not just dev mode)

## Phase 7: Deployment

### Pre-Deployment
- [ ] Create backup of production database (if applicable)
- [ ] Document rollback procedure
- [ ] Prepare migration script
- [ ] Test migration on database copy

### Deployment
- [ ] Apply database migration
- [ ] Deploy new application version
- [ ] Verify application starts successfully
- [ ] Test card creation in production

### Post-Deployment
- [ ] Monitor for errors in logs
- [ ] Test card creation in live environment
- [ ] Verify existing cards display correctly
- [ ] Check performance metrics

## Rollback Plan (if needed)

If issues arise:
- [ ] Stop application
- [ ] Rollback to previous application version
- [ ] Optionally: Rollback database migration
  ```sql
  DROP INDEX IF EXISTS idx_flashcards_text_display;
  DROP INDEX IF EXISTS idx_flashcards_text_created;
  ALTER TABLE flashcards DROP COLUMN display_index;
  ```
- [ ] Restart application
- [ ] Investigate root cause

## Success Criteria

All of the following must be true:
- [ ] Each flashcard for a text has a unique display_index
- [ ] Display indices are sequential (1, 2, 3, ...)
- [ ] Multiple card creation sessions work correctly
- [ ] UI displays "Card #{displayIndex}" not "Card #{clozeIndex}"
- [ ] No duplicate card numbers within a text
- [ ] Deletion creates gaps (acceptable behavior)
- [ ] No performance degradation
- [ ] All tests pass
- [ ] No compiler warnings
- [ ] Application builds and runs successfully

## Estimated Time

- Phase 1 (Database): 30 minutes
- Phase 2 (Rust): 1 hour
- Phase 3 (TypeScript): 30 minutes
- Phase 4 (Testing): 1 hour
- Phase 5 (Documentation): 30 minutes
- Phase 6 (Pre-Release): 30 minutes
- Phase 7 (Deployment): 30 minutes

**Total: ~4.5 hours**

## Notes

- Start with Phase 1 database migration on dev environment
- Test migration thoroughly before proceeding
- Update backend (Phase 2) before frontend (Phase 3)
- Frontend will break if backend doesn't send displayIndex
- Can run cargo sqlx prepare after backend changes to update query cache
- Consider feature flag if deployment needs to be gradual
