# Reading Session Tracking Test Plan

## Test Steps

1. **Import or Create a Text**
   - Open the application
   - Import a Wikipedia article or create a new text
   - Navigate to the reading view

2. **Verify Session Starts**
   - Open the reading page for a text
   - Check browser console for session start logs
   - Verify database: `SELECT * FROM reading_sessions WHERE ended_at IS NULL;`

3. **Verify Session Ends**
   - Navigate away from the reading page OR wait 5 minutes
   - Check browser console for session end logs
   - Verify database: `SELECT * FROM reading_sessions WHERE ended_at IS NOT NULL;`

4. **Check Session Data**
   ```sql
   SELECT
     id,
     text_id,
     started_at,
     ended_at,
     duration_seconds,
     start_position,
     end_position
   FROM reading_sessions
   ORDER BY started_at DESC
   LIMIT 5;
   ```

5. **Verify Statistics Display**
   - Navigate to Statistics → Reading tab
   - Verify that reading time is displayed
   - Check that session counts are accurate

## Expected Results

- Each time you open a text, a new session is created
- Sessions have unique IDs (UUID)
- `started_at` is populated immediately
- `ended_at` is NULL while reading
- When you navigate away or after 5 minutes of inactivity:
  - `ended_at` is populated
  - `duration_seconds` is calculated correctly
  - `start_position` and `end_position` reflect scroll position

## Database Schema

```sql
CREATE TABLE reading_sessions (
  id INTEGER PRIMARY KEY,           -- UUID from frontend
  text_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL DEFAULT 1,
  started_at DATETIME NOT NULL,
  ended_at DATETIME,
  duration_seconds INTEGER,
  start_position INTEGER NOT NULL,
  end_position INTEGER,
  total_characters_read INTEGER DEFAULT 0,
  total_words_read INTEGER DEFAULT 0,
  marks_created INTEGER DEFAULT 0
);
```

## Manual Test with SQLite

You can manually insert a test session:

```sql
INSERT INTO reading_sessions (
  id, text_id, user_id, started_at, ended_at,
  duration_seconds, start_position, end_position
) VALUES (
  'test-session-1',
  1,  -- text_id (must exist)
  1,  -- user_id
  datetime('now', '-10 minutes'),
  datetime('now'),
  600,  -- 10 minutes
  0,
  1000
);
```

Then check if it appears in statistics.
