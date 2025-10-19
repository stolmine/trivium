# Testing Reading Session Tracking

## Quick Test (5 minutes)

### 1. Start the Application
```bash
npm run dev
```

### 2. Create/Open a Text
- Go to Library
- Import a Wikipedia article OR open an existing text
- Navigate to the reading view

### 3. Verify Session Creation
Open a terminal and run:
```bash
sqlite3 /Users/why/repos/trivium/trivium_dev.db \
  "SELECT id, text_id, started_at, ended_at FROM reading_sessions ORDER BY started_at DESC LIMIT 1;"
```

**Expected Result:**
- You should see a new session with:
  - `id`: A UUID string
  - `text_id`: The ID of the text you're reading
  - `started_at`: Current timestamp
  - `ended_at`: NULL (since you're still reading)

### 4. Navigate Away
- Click "Library" or close the reading view
- The session should automatically end

### 5. Verify Session Ended
```bash
sqlite3 /Users/why/repos/trivium/trivium_dev.db \
  "SELECT id, started_at, ended_at, duration_seconds FROM reading_sessions ORDER BY started_at DESC LIMIT 1;"
```

**Expected Result:**
- `ended_at`: Now populated with a timestamp
- `duration_seconds`: Should match the time you spent reading (in seconds)

### 6. Check Statistics Display
- Navigate to Statistics → Reading tab
- Verify that reading time is displayed
- Check that session counts match the database

## Inactivity Timeout Test

1. Open a text in reading view
2. **Wait 5 minutes without any interaction** (no scrolling, clicking, or typing)
3. Check the database - the session should have auto-ended after 5 minutes

```bash
sqlite3 /Users/why/repos/trivium/trivium_dev.db \
  "SELECT id, started_at, ended_at, duration_seconds FROM reading_sessions WHERE ended_at IS NOT NULL ORDER BY started_at DESC LIMIT 1;"
```

**Expected Result:**
- Session ended after ~5 minutes (300 seconds)

## Activity Reset Test

1. Open a text in reading view
2. Wait 4 minutes
3. Scroll or click in the reading area
4. Wait another 4 minutes
5. Scroll again
6. Navigate away
7. Check duration - should be > 8 minutes since you reset the timer twice

## Database Queries for Verification

### View all sessions
```bash
sqlite3 /Users/why/repos/trivium/trivium_dev.db -header -column \
  "SELECT id, text_id, started_at, ended_at, duration_seconds FROM reading_sessions ORDER BY started_at DESC LIMIT 10;"
```

### Calculate total reading time
```bash
sqlite3 /Users/why/repos/trivium/trivium_dev.db \
  "SELECT SUM(duration_seconds) as total_seconds, SUM(duration_seconds)/60.0 as total_minutes FROM reading_sessions WHERE ended_at IS NOT NULL;"
```

### View statistics by text
```bash
sqlite3 /Users/why/repos/trivium/trivium_dev.db -header -column \
  "SELECT t.title, COUNT(rs.id) as sessions, SUM(rs.duration_seconds)/60.0 as total_minutes FROM reading_sessions rs JOIN texts t ON rs.text_id = t.id WHERE rs.ended_at IS NOT NULL GROUP BY t.id ORDER BY total_minutes DESC;"
```

### View statistics by date
```bash
sqlite3 /Users/why/repos/trivium/trivium_dev.db -header -column \
  "SELECT DATE(started_at) as date, COUNT(*) as sessions, SUM(duration_seconds)/60.0 as total_minutes FROM reading_sessions WHERE ended_at IS NOT NULL GROUP BY DATE(started_at) ORDER BY date DESC;"
```

## Test Data Already Created

The dev database already has test data:
- **Text ID 999**: "Test Article for Session Tracking"
- **3 Sessions**: Total 2400 seconds (40 minutes)

You can verify this data appears in the Statistics page.

## Browser Console Logs

The ReadPage component logs session events. Open the browser console (F12) to see:
- Session start logs
- Session end logs
- Inactivity timer logs

## Troubleshooting

### Sessions not being created?
1. Check browser console for errors
2. Verify the migration ran: `sqlite3 trivium_dev.db "PRAGMA table_info(reading_sessions);"` - `id` should be `TEXT`
3. Check that the dev server is running with latest code

### Statistics page shows 0?
1. Verify sessions exist: `SELECT COUNT(*) FROM reading_sessions WHERE ended_at IS NOT NULL;`
2. Check the date range in the statistics filter
3. Look at the Statistics component's date filtering logic

### Sessions have NULL ended_at?
- This is normal for active reading sessions
- Navigate away from the page to trigger the end
- Or wait 5 minutes for inactivity timeout

## Success Criteria

✅ Opening a text creates a session
✅ Closing/navigating away ends the session
✅ Duration is calculated correctly
✅ Inactivity timeout (5 min) works
✅ Activity resets the timeout
✅ Statistics page displays reading time
✅ Multiple sessions accumulate correctly

## Files to Monitor

During testing, watch these files for errors:
- Browser console (frontend errors)
- Terminal running `npm run dev` (build errors)
- Cargo terminal (backend errors)

## Next Steps After Testing

Once testing confirms everything works:
1. Commit the migration file
2. Update any documentation
3. Consider adding session analytics (avg time per text, reading patterns, etc.)
4. Consider adding UI indicators for active reading time
