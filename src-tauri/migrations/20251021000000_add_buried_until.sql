-- Add buried_until field to flashcards table for bury card feature
ALTER TABLE flashcards ADD COLUMN buried_until DATETIME;

-- Add index for efficient filtering of buried cards
CREATE INDEX idx_flashcards_buried ON flashcards(buried_until);
