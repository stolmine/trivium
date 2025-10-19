-- Add session_id to review_history
ALTER TABLE review_history ADD COLUMN session_id TEXT;
CREATE INDEX idx_review_history_session_id ON review_history(session_id);

-- Enhance read_ranges with session context
ALTER TABLE read_ranges ADD COLUMN session_id TEXT;
ALTER TABLE read_ranges ADD COLUMN character_count INTEGER;
ALTER TABLE read_ranges ADD COLUMN word_count INTEGER;
CREATE INDEX idx_read_ranges_session ON read_ranges(session_id);

-- Create review_sessions table
CREATE TABLE review_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL DEFAULT 1,
    started_at DATETIME NOT NULL,
    ended_at DATETIME,
    total_cards INTEGER DEFAULT 0,
    again_count INTEGER DEFAULT 0,
    hard_count INTEGER DEFAULT 0,
    good_count INTEGER DEFAULT 0,
    easy_count INTEGER DEFAULT 0,
    filter_type TEXT,
    filter_id TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_review_sessions_user_started ON review_sessions(user_id, started_at);
CREATE INDEX idx_review_sessions_filter ON review_sessions(filter_type, filter_id);

-- Enhance reading_sessions table
ALTER TABLE reading_sessions ADD COLUMN total_characters_read INTEGER DEFAULT 0;
ALTER TABLE reading_sessions ADD COLUMN total_words_read INTEGER DEFAULT 0;
ALTER TABLE reading_sessions ADD COLUMN marks_created INTEGER DEFAULT 0;
