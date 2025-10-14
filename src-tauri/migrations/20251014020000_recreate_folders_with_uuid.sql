-- Recreate folders table with UUID primary keys instead of INTEGER
-- This migration handles the transition from the existing INTEGER-based folders table

-- Drop the existing text_folders junction table first (if exists)
DROP TABLE IF EXISTS text_folders;

-- Drop the existing folders table
DROP TABLE IF EXISTS folders;

-- Recreate folders table with TEXT (UUID) primary keys
CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    parent_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);

-- Recreate indexes
CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_folders_name ON folders(name);
