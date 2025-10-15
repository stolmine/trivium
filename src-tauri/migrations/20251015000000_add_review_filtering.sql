-- Extend study_limits table with scope-specific limits
ALTER TABLE study_limits ADD COLUMN per_text_new_limit INTEGER;
ALTER TABLE study_limits ADD COLUMN per_text_review_limit INTEGER;
ALTER TABLE study_limits ADD COLUMN per_folder_new_limit INTEGER;
ALTER TABLE study_limits ADD COLUMN per_folder_review_limit INTEGER;

-- Create daily_progress table for tracking daily usage
CREATE TABLE IF NOT EXISTS daily_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    scope_type TEXT NOT NULL,
    scope_id TEXT,
    date TEXT NOT NULL,
    new_cards_seen INTEGER NOT NULL DEFAULT 0,
    review_cards_seen INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, scope_type, scope_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date ON daily_progress(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_progress_scope ON daily_progress(scope_type, scope_id, date);

-- Set defaults for existing study_limits
UPDATE study_limits SET
    per_text_new_limit = NULL,
    per_text_review_limit = NULL,
    per_folder_new_limit = NULL,
    per_folder_review_limit = NULL
WHERE per_text_new_limit IS NULL;
