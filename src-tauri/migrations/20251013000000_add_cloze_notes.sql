-- Add cloze_notes table and update flashcards schema
-- Enables support for multi-cloze notes where one note generates multiple flashcards

-- Create cloze_notes table: stores parsed cloze deletion notes
CREATE TABLE cloze_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text_id INTEGER NOT NULL,
    user_id INTEGER DEFAULT 1,
    original_text TEXT NOT NULL,
    parsed_segments TEXT NOT NULL,
    cloze_count INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE
);

-- Add cloze_note_id column to flashcards table
ALTER TABLE flashcards ADD COLUMN cloze_note_id INTEGER REFERENCES cloze_notes(id) ON DELETE CASCADE;

-- Create indexes for performance optimization

-- Flashcards cloze note relationship index
CREATE INDEX idx_flashcards_cloze_note ON flashcards(cloze_note_id);

-- Cloze notes text relationship index
CREATE INDEX idx_cloze_notes_text_id ON cloze_notes(text_id);

-- Cloze notes user index
CREATE INDEX idx_cloze_notes_user_id ON cloze_notes(user_id);
