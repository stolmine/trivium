-- Add display_index and cloze_number columns to flashcards table
-- Separates display numbering (Card #1, #2, #3) from rendering logic (which {{cN::text}} to hide)

-- Add new columns
ALTER TABLE flashcards ADD COLUMN display_index INTEGER;
ALTER TABLE flashcards ADD COLUMN cloze_number INTEGER;

-- Backfill existing data
-- For existing cards, set cloze_number = cloze_index (preserve rendering behavior)
UPDATE flashcards SET cloze_number = cloze_index WHERE cloze_number IS NULL;

-- For existing cards, assign sequential display_index per text
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
)
WHERE display_index IS NULL;

-- Make columns NOT NULL after backfill
-- Note: SQLite doesn't support ALTER COLUMN, so we document this requirement
-- New cards must always provide these values

-- Add unique constraint for display_index per text
CREATE UNIQUE INDEX idx_flashcards_text_display ON flashcards(text_id, display_index);
