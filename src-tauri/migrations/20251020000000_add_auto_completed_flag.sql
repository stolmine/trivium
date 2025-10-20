-- Add is_auto_completed flag to read_ranges table
ALTER TABLE read_ranges ADD COLUMN is_auto_completed BOOLEAN NOT NULL DEFAULT 0;

-- Add index for querying by auto-completed status
CREATE INDEX idx_read_ranges_auto_completed ON read_ranges(text_id, is_auto_completed);
