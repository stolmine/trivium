-- Fix reading_sessions.id to be TEXT (UUID) instead of INTEGER
-- This aligns with the implementation in reading.rs which uses UUID strings

-- First, drop the views that depend on reading_sessions
DROP VIEW IF EXISTS reading_stats_daily;
DROP VIEW IF EXISTS reading_stats_by_folder;

-- Create new table with correct schema
CREATE TABLE reading_sessions_new (
    id TEXT PRIMARY KEY,                     -- Changed from INTEGER to TEXT for UUID
    text_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL DEFAULT 1,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    duration_seconds INTEGER,
    start_position INTEGER NOT NULL,
    end_position INTEGER,
    total_characters_read INTEGER DEFAULT 0,
    total_words_read INTEGER DEFAULT 0,
    marks_created INTEGER DEFAULT 0,
    FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE
);

-- Copy any existing data (there shouldn't be any, but just in case)
INSERT INTO reading_sessions_new (
    id, text_id, user_id, started_at, ended_at,
    duration_seconds, start_position, end_position,
    total_characters_read, total_words_read, marks_created
)
SELECT
    CAST(id AS TEXT),  -- Convert INTEGER id to TEXT
    text_id,
    user_id,
    started_at,
    ended_at,
    duration_seconds,
    start_position,
    end_position,
    total_characters_read,
    total_words_read,
    marks_created
FROM reading_sessions;

-- Drop old table
DROP TABLE reading_sessions;

-- Rename new table
ALTER TABLE reading_sessions_new RENAME TO reading_sessions;

-- Recreate indexes
CREATE INDEX idx_reading_sessions_ended_at ON reading_sessions(ended_at);
CREATE INDEX idx_reading_sessions_user_text ON reading_sessions(user_id, text_id);

-- Recreate the views
CREATE VIEW reading_stats_daily AS
SELECT
    user_id,
    text_id,
    DATE(started_at) as date,
    COUNT(*) as session_count,
    SUM(duration_seconds) as total_seconds,
    SUM(end_position - start_position) as characters_read
FROM reading_sessions
WHERE ended_at IS NOT NULL
GROUP BY user_id, text_id, DATE(started_at);

CREATE VIEW reading_stats_by_folder AS
SELECT
    rs.user_id,
    t.folder_id,
    DATE(rs.started_at) as date,
    COUNT(*) as session_count,
    SUM(rs.duration_seconds) as total_seconds,
    SUM(rs.end_position - rs.start_position) as characters_read
FROM reading_sessions rs
INNER JOIN texts t ON rs.text_id = t.id
WHERE rs.ended_at IS NOT NULL AND t.folder_id IS NOT NULL
GROUP BY rs.user_id, t.folder_id, DATE(rs.started_at);
