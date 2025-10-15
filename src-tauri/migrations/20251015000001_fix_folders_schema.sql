-- Fix folders table to use TEXT (UUID) for ids and proper timestamp handling
-- This migration corrects the schema to match the Rust code which uses UUIDs

DROP TABLE IF EXISTS folders;

CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    parent_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);

CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_folders_name ON folders(name);
