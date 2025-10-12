// Flashcard model
//
// Data structures for cloze deletion flashcards with FSRS state.
//
// Corresponds to the `flashcards` table in the database:
// - id: Unique identifier
// - text_id: Foreign key to source text
// - user_id: User identifier (default: 1)
// - original_text: Full context with cloze syntax
// - cloze_text: Text with {{c1::deletion}} markers
// - cloze_index: Index of this cloze (c1, c2, etc.)
// - created_at, updated_at: Timestamps
//
// FSRS algorithm state:
// - due: Next review date
// - stability: FSRS stability parameter
// - difficulty: FSRS difficulty parameter
// - elapsed_days: Days since last review
// - scheduled_days: Scheduled interval
// - reps: Total review count
// - lapses: Number of failed reviews
// - state: Card state (New=0, Learning=1, Review=2, Relearning=3)
// - last_review: Last review timestamp
