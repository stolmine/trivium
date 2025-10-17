-- Add workflow tracking columns to cloze_notes for Flashcard Creation Hub
-- Enables mark status tracking, session management, and workflow optimization

-- Add status column: 'pending', 'converted', 'skipped', 'buried'
-- Default 'pending' for new marks awaiting card creation
ALTER TABLE cloze_notes ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';

-- Add last_seen_at timestamp: tracks when mark was last viewed in hub
-- NULL until mark is first viewed
ALTER TABLE cloze_notes ADD COLUMN last_seen_at DATETIME;

-- Add session_count: tracks number of times mark appeared in creation sessions
-- Starts at 0, increments each time mark is shown
ALTER TABLE cloze_notes ADD COLUMN session_count INTEGER NOT NULL DEFAULT 0;

-- Add notes: optional user notes about the mark
-- NULL by default, can be used for mark annotations
ALTER TABLE cloze_notes ADD COLUMN notes TEXT;

-- Create indexes for efficient hub queries

-- Index for status-based filtering (get all pending/converted/buried marks)
CREATE INDEX idx_cloze_notes_status ON cloze_notes(status);

-- Index for last_seen_at ordering (find least recently seen marks)
CREATE INDEX idx_cloze_notes_last_seen ON cloze_notes(last_seen_at);

-- Index for session_count (prioritize never-seen or rarely-seen marks)
CREATE INDEX idx_cloze_notes_session_count ON cloze_notes(session_count);

-- Composite index for status + text_id (efficient scope filtering)
CREATE INDEX idx_cloze_notes_status_text ON cloze_notes(status, text_id);

-- Composite index for status + last_seen_at (hub pagination queries)
CREATE INDEX idx_cloze_notes_status_seen ON cloze_notes(status, last_seen_at);
