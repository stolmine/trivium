-- Activate reading sessions tracking
-- First ensure the reading_sessions table exists
CREATE TABLE IF NOT EXISTS reading_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text_id INTEGER NOT NULL,
    user_id INTEGER DEFAULT 1,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    duration_seconds INTEGER,
    start_position INTEGER NOT NULL,
    end_position INTEGER,
    FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_ended_at
ON reading_sessions(ended_at);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_text
ON reading_sessions(user_id, text_id);

-- Add views for reading stats aggregation
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
