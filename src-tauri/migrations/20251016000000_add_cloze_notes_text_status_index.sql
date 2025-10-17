-- Add index for efficient text filtering by marks
-- Supports the get_texts_with_available_marks query
-- This index speeds up queries that filter cloze_notes by text_id and status
CREATE INDEX IF NOT EXISTS idx_cloze_notes_text_status ON cloze_notes(text_id, status);
