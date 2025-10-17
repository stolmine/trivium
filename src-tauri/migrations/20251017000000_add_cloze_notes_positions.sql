-- Add position tracking to cloze_notes for mark preservation during text edits
-- This migration adds start_position and end_position columns to store UTF-16 code unit offsets

-- Add position columns (nullable initially to allow migration of existing data)
ALTER TABLE cloze_notes ADD COLUMN start_position INTEGER;
ALTER TABLE cloze_notes ADD COLUMN end_position INTEGER;

-- Create index for efficient position-based queries
CREATE INDEX idx_cloze_notes_positions ON cloze_notes(text_id, start_position, end_position);

-- Attempt to reconstruct positions for existing marks using string search
-- This is a one-time migration - future marks will store positions on creation
-- Note: This uses SQLite's INSTR which returns 1-based position (we convert to 0-based)
UPDATE cloze_notes
SET
  start_position = (
    SELECT CASE
      WHEN INSTR(texts.content, cloze_notes.original_text) > 0
      THEN INSTR(texts.content, cloze_notes.original_text) - 1  -- Convert to 0-based UTF-16 offset
      ELSE 0  -- If not found, set to 0 (invalid but won't crash)
    END
    FROM texts
    WHERE texts.id = cloze_notes.text_id
  ),
  end_position = (
    SELECT CASE
      WHEN INSTR(texts.content, cloze_notes.original_text) > 0
      THEN INSTR(texts.content, cloze_notes.original_text) - 1 + LENGTH(cloze_notes.original_text)
      ELSE LENGTH(cloze_notes.original_text)  -- If not found, use text length
    END
    FROM texts
    WHERE texts.id = cloze_notes.text_id
  )
WHERE start_position IS NULL;

-- Note: SQLite's LENGTH() counts bytes, not UTF-16 code units
-- This migration provides approximate positions - exact positions will be set
-- when marks are next viewed/edited by the user
