-- Initial database schema for Trivium
-- Implements the schema defined in architecture-backend.md

-- Texts table: stores ingested articles and content
CREATE TABLE texts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    source_url TEXT,
    content TEXT NOT NULL,
    content_length INTEGER NOT NULL,
    ingested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT
);

-- Reading progress table: tracks incremental reading progress
CREATE TABLE reading_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text_id INTEGER NOT NULL,
    user_id INTEGER DEFAULT 1,
    current_position INTEGER NOT NULL DEFAULT 0,
    last_read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_time_seconds INTEGER NOT NULL DEFAULT 0,
    completion_percentage REAL NOT NULL DEFAULT 0.0,
    FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE,
    UNIQUE(text_id, user_id)
);

-- Flashcards table: stores cloze deletion flashcards with FSRS state
CREATE TABLE flashcards (
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
    FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE
);

-- Review history table: tracks all card reviews for analytics
CREATE TABLE review_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flashcard_id INTEGER NOT NULL,
    user_id INTEGER DEFAULT 1,
    reviewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rating INTEGER NOT NULL,
    review_duration_ms INTEGER,
    state_before INTEGER NOT NULL,
    state_after INTEGER NOT NULL,
    FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE
);

-- Tags table: manages tags for organizing content
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Text tags table: many-to-many relationship between texts and tags
CREATE TABLE text_tags (
    text_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (text_id, tag_id),
    FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Reading sessions table: detailed tracking of reading sessions
CREATE TABLE reading_sessions (
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

-- Indexes for performance optimization

-- Texts indexes
CREATE INDEX idx_texts_source ON texts(source);
CREATE INDEX idx_texts_ingested_at ON texts(ingested_at);

-- Reading progress indexes
CREATE INDEX idx_reading_progress_text_id ON reading_progress(text_id);
CREATE INDEX idx_reading_progress_user_id ON reading_progress(user_id);
CREATE INDEX idx_reading_progress_last_read ON reading_progress(last_read_at);

-- Flashcards indexes
CREATE INDEX idx_flashcards_text_id ON flashcards(text_id);
CREATE INDEX idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX idx_flashcards_due ON flashcards(due);
CREATE INDEX idx_flashcards_state ON flashcards(state);

-- Review history indexes
CREATE INDEX idx_review_history_flashcard_id ON review_history(flashcard_id);
CREATE INDEX idx_review_history_user_id ON review_history(user_id);
CREATE INDEX idx_review_history_reviewed_at ON review_history(reviewed_at);

-- Tags indexes
CREATE INDEX idx_tags_name ON tags(name);

-- Text tags indexes
CREATE INDEX idx_text_tags_text_id ON text_tags(text_id);
CREATE INDEX idx_text_tags_tag_id ON text_tags(tag_id);

-- Reading sessions indexes
CREATE INDEX idx_reading_sessions_text_id ON reading_sessions(text_id);
CREATE INDEX idx_reading_sessions_user_id ON reading_sessions(user_id);
CREATE INDEX idx_reading_sessions_started_at ON reading_sessions(started_at);
