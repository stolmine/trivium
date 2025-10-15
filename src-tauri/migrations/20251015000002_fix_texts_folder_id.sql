-- Fix texts.folder_id to ensure it uses TEXT for UUID consistency
-- This ensures consistency with the folders table which uses TEXT (UUID) for ids

-- SQLite doesn't support ALTER COLUMN TYPE directly, so we need to recreate the column
-- First, drop the index
DROP INDEX IF EXISTS idx_texts_folder_id;

-- Create a new texts table with the correct schema
CREATE TABLE texts_new (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    source TEXT,
    source_url TEXT,
    content TEXT NOT NULL,
    content_length INTEGER NOT NULL,
    ingested_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    metadata TEXT,
    author TEXT,
    publication_date TEXT,
    publisher TEXT,
    access_date TEXT,
    doi TEXT,
    isbn TEXT,
    folder_id TEXT,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
);

-- Copy data from old table, preserving folder_id if it exists
INSERT INTO texts_new
SELECT
    id, title, source, source_url, content, content_length,
    ingested_at, updated_at, metadata, author, publication_date,
    publisher, access_date, doi, isbn,
    folder_id
FROM texts;

-- Drop old table
DROP TABLE texts;

-- Rename new table
ALTER TABLE texts_new RENAME TO texts;

-- Recreate indexes
CREATE INDEX idx_texts_folder_id ON texts(folder_id);
CREATE INDEX idx_texts_ingested_at ON texts(ingested_at);
