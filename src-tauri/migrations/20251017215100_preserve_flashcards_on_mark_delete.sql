-- Migration: Change flashcards.cloze_note_id foreign key from ON DELETE CASCADE to ON DELETE SET NULL
--
-- Reason: Flashcards store complete copies of all content and don't depend on cloze_notes to function.
-- When a mark is deleted, we want to preserve the flashcards rather than cascade delete them.
--
-- Changed constraint:
--   BEFORE: cloze_note_id INTEGER REFERENCES cloze_notes(id) ON DELETE CASCADE
--   AFTER:  cloze_note_id INTEGER REFERENCES cloze_notes(id) ON DELETE SET NULL

PRAGMA foreign_keys=off;

-- Create new flashcards table with corrected foreign key constraint
CREATE TABLE flashcards_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text_id INTEGER NOT NULL,
    user_id INTEGER DEFAULT 1,
    original_text TEXT NOT NULL,
    cloze_text TEXT NOT NULL,
    cloze_index INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due DATETIME NOT NULL,
    stability REAL NOT NULL DEFAULT 0.0,
    difficulty REAL NOT NULL DEFAULT 0.0,
    elapsed_days INTEGER NOT NULL DEFAULT 0,
    scheduled_days INTEGER NOT NULL DEFAULT 0,
    reps INTEGER NOT NULL DEFAULT 0,
    lapses INTEGER NOT NULL DEFAULT 0,
    state INTEGER NOT NULL DEFAULT 0,
    last_review DATETIME,
    cloze_note_id INTEGER,
    display_index INTEGER,
    cloze_number INTEGER,
    FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE,
    FOREIGN KEY (cloze_note_id) REFERENCES cloze_notes(id) ON DELETE SET NULL
);

-- Copy all data from existing table
INSERT INTO flashcards_new SELECT * FROM flashcards;

-- Drop old table
DROP TABLE flashcards;

-- Rename new table to original name
ALTER TABLE flashcards_new RENAME TO flashcards;

-- Recreate all indexes
CREATE INDEX idx_flashcards_text_id ON flashcards(text_id);
CREATE INDEX idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX idx_flashcards_due ON flashcards(due);
CREATE INDEX idx_flashcards_state ON flashcards(state);
CREATE INDEX idx_flashcards_cloze_note ON flashcards(cloze_note_id);
CREATE UNIQUE INDEX idx_flashcards_text_display ON flashcards(text_id, display_index);
CREATE INDEX idx_flashcards_text_created ON flashcards(text_id, created_at);

PRAGMA foreign_keys=on;
