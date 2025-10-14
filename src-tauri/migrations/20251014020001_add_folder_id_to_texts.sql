-- Add folder_id column to texts table for hierarchical organization
-- This allows texts to be organized into folders

ALTER TABLE texts ADD COLUMN folder_id TEXT;

-- Create index for efficient folder-based queries
CREATE INDEX idx_texts_folder_id ON texts(folder_id);

-- Add foreign key constraint (SQLite will enforce this on new data)
-- Note: SQLite doesn't enforce foreign keys on ALTER TABLE, but will on new inserts
-- FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
