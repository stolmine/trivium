// Reading progress model
//
// Data structures for tracking incremental reading progress.
//
// Corresponds to the `reading_progress` table in the database:
// - id: Unique identifier
// - text_id: Foreign key to the text being read
// - user_id: User identifier (default: 1)
// - current_position: Character offset in the text
// - last_read_at: Timestamp of last reading session
// - total_time_seconds: Cumulative reading time
// - completion_percentage: Progress as percentage (0.0 to 100.0)
//
// This model enables users to resume reading exactly where they left off
// and tracks how much time they've spent reading each text.
