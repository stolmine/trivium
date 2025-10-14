-- Add performance index for query optimization
-- Note: display_index column and unique index were added in 20251013031609_add_card_numbering.sql
-- This migration adds the additional performance index specified in the design doc

CREATE INDEX IF NOT EXISTS idx_flashcards_text_created ON flashcards(text_id, created_at);
