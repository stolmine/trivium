# Phase 20: Statistics & Analytics System

**Status**: Planning Complete, Ready for Implementation
**Branch**: `18_stats`
**Created**: 2025-10-19

---

## Executive Summary

Phase 20 introduces a comprehensive statistics and analytics system modeled after Anki's proven approach, providing users with detailed insights into their review performance, reading progress, study patterns, and future workload projections.

### Key Features

1. **Review Analytics**
   - Daily/weekly/monthly review counts with card type breakdown
   - Answer button distribution (Again/Hard/Good/Easy)
   - Retention rate trends over time
   - Review forecast (7-30 day projection)
   - Performance by time of day (hourly heatmap)

2. **Reading Analytics**
   - Reading progress by folder/topic
   - Characters/words read over time
   - Reading session duration tracking
   - Topic distribution analysis

3. **Study Time Tracking**
   - Total time spent reviewing cards
   - Average time per card
   - Time spent reading
   - Daily/weekly study time trends

4. **Motivational Features**
   - Current study streak
   - Calendar heatmap (GitHub-style)
   - Progress indicators
   - Achievement milestones

---

## Architecture Overview

### Data Foundation

**Existing Tables (Already Available):**
- `review_history` - Every card review with timestamp, rating, state transitions
- `flashcards` - Current card state, FSRS metadata (stability, difficulty)
- `read_ranges` - Reading progress with character positions and timestamps
- `reading_sessions` - Exists in schema but currently unused (will be activated)
- `daily_progress` - Daily new/review card counts per scope

**New Schema Additions:**
- `review_sessions` table - Aggregate review session metadata
- Enhanced `reading_sessions` - Character/word counts, session metrics
- Views for efficient aggregation (daily stats, hourly distribution, forecasts)
- Additional indexes for performance

### Technology Stack

**Backend:**
- Rust/Tauri commands for statistics queries
- SQLite views for pre-aggregated data
- FSRS algorithm data for projections

**Frontend:**
- Recharts for data visualization
- New statistics Zustand store
- Responsive chart components
- Dark mode support

---

## Implementation Plan

### Phase 1: Backend Foundation (Week 1)

#### Database Migrations

**Migration 1**: `20251019120000_activate_reading_sessions.sql`
```sql
-- Activate reading sessions tracking
CREATE INDEX IF NOT EXISTS idx_reading_sessions_ended_at
ON reading_sessions(ended_at);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_text
ON reading_sessions(user_id, text_id);

-- Add views for reading stats aggregation
CREATE VIEW reading_stats_daily AS
SELECT
    user_id,
    text_id,
    DATE(started_at) as date,
    COUNT(*) as session_count,
    SUM(duration_seconds) as total_seconds,
    SUM(end_position - start_position) as characters_read
FROM reading_sessions
WHERE ended_at IS NOT NULL
GROUP BY user_id, text_id, DATE(started_at);

CREATE VIEW reading_stats_by_folder AS
SELECT
    rs.user_id,
    t.folder_id,
    DATE(rs.started_at) as date,
    COUNT(*) as session_count,
    SUM(rs.duration_seconds) as total_seconds,
    SUM(rs.end_position - rs.start_position) as characters_read
FROM reading_sessions rs
INNER JOIN texts t ON rs.text_id = t.id
WHERE rs.ended_at IS NOT NULL AND t.folder_id IS NOT NULL
GROUP BY rs.user_id, t.folder_id, DATE(rs.started_at);
```

**Migration 2**: `20251019120001_review_stats_indexes.sql`
```sql
-- Composite indexes for statistics queries
CREATE INDEX IF NOT EXISTS idx_review_history_user_rating_date
ON review_history(user_id, rating, reviewed_at);

CREATE INDEX IF NOT EXISTS idx_review_history_reviewed_at_hour
ON review_history(strftime('%H', reviewed_at));

-- Views for review statistics
CREATE VIEW review_distribution_hourly AS
SELECT
    user_id,
    CAST(strftime('%H', reviewed_at) AS INTEGER) as hour_of_day,
    COUNT(*) as review_count,
    AVG(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as again_rate,
    AVG(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as hard_rate,
    AVG(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as good_rate,
    AVG(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as easy_rate
FROM review_history
GROUP BY user_id, hour_of_day;

CREATE VIEW review_stats_daily AS
SELECT
    user_id,
    DATE(reviewed_at) as date,
    COUNT(*) as total_reviews,
    COUNT(DISTINCT flashcard_id) as unique_cards,
    AVG(rating) as avg_rating,
    SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as again_count,
    SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as hard_count,
    SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as good_count,
    SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as easy_count,
    AVG(review_duration_ms) as avg_duration_ms
FROM review_history
GROUP BY user_id, DATE(reviewed_at);

CREATE VIEW review_forecast AS
SELECT
    user_id,
    DATE(due) as date,
    COUNT(*) as cards_due,
    SUM(CASE WHEN state = 0 THEN 1 ELSE 0 END) as new_cards,
    SUM(CASE WHEN state = 2 THEN 1 ELSE 0 END) as review_cards,
    SUM(CASE WHEN state IN (1, 3) THEN 1 ELSE 0 END) as learning_cards
FROM flashcards
GROUP BY user_id, DATE(due)
ORDER BY DATE(due);
```

**Migration 3**: `20251019120002_add_session_tracking.sql`
```sql
-- Add session_id to review_history
ALTER TABLE review_history ADD COLUMN session_id TEXT;
CREATE INDEX idx_review_history_session_id ON review_history(session_id);

-- Enhance read_ranges with session context
ALTER TABLE read_ranges ADD COLUMN session_id TEXT;
ALTER TABLE read_ranges ADD COLUMN character_count INTEGER;
ALTER TABLE read_ranges ADD COLUMN word_count INTEGER;
CREATE INDEX idx_read_ranges_session ON read_ranges(session_id);

-- Create review_sessions table
CREATE TABLE review_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL DEFAULT 1,
    started_at DATETIME NOT NULL,
    ended_at DATETIME,
    total_cards INTEGER DEFAULT 0,
    again_count INTEGER DEFAULT 0,
    hard_count INTEGER DEFAULT 0,
    good_count INTEGER DEFAULT 0,
    easy_count INTEGER DEFAULT 0,
    filter_type TEXT,
    filter_id TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_review_sessions_user_started ON review_sessions(user_id, started_at);
CREATE INDEX idx_review_sessions_filter ON review_sessions(filter_type, filter_id);

-- Enhance reading_sessions table
ALTER TABLE reading_sessions ADD COLUMN total_characters_read INTEGER DEFAULT 0;
ALTER TABLE reading_sessions ADD COLUMN total_words_read INTEGER DEFAULT 0;
ALTER TABLE reading_sessions ADD COLUMN marks_created INTEGER DEFAULT 0;
```

#### Backend Commands

**File**: `/Users/why/repos/trivium/src-tauri/src/commands/statistics.rs`

Key commands to implement:
1. `get_review_statistics(start_date, end_date, filter)` - Comprehensive review stats
2. `get_difficulty_by_hour(start_date, end_date)` - Hourly performance distribution
3. `get_daily_review_stats(start_date, end_date)` - Daily review breakdown for charts
4. `get_reading_stats(start_date, end_date)` - Reading progress analytics
5. `get_study_time_stats(start_date, end_date)` - Time investment tracking

**Location**: Create new file at `/Users/why/repos/trivium/src-tauri/src/commands/statistics.rs`

### Phase 2: Data Collection (Week 2)

#### Review Timing Instrumentation

**Frontend Changes** (`src/lib/stores/review.ts`):
- Add `cardStartTime` and `sessionId` to state
- Track time from answer reveal to grade
- Pass `review_duration_ms` to `grade_card` command

**Backend Changes** (`src-tauri/src/commands/review.rs`):
- Update `grade_card` signature to accept `review_duration_ms` and `session_id`
- Populate `review_duration_ms` in review_history insert

**Key Files**:
- `/Users/why/repos/trivium/src/lib/stores/review.ts` (lines 8-28, 79-116)
- `/Users/why/repos/trivium/src-tauri/src/commands/review.rs` (lines 93-303)

#### Reading Session Instrumentation

**Frontend Changes** (`src/routes/read/[id].tsx`):
- Add session lifecycle management on mount/unmount
- Implement activity detection (scroll, mouse, keyboard)
- Auto-end session after 5 minutes of inactivity
- Track character/word counts in mark-as-read events

**Backend Changes** (`src-tauri/src/commands/reading.rs`):
- Add `start_reading_session` command
- Add `end_reading_session` command
- Update `mark_range_as_read` to include session context

**Key Files**:
- `/Users/why/repos/trivium/src/routes/read/[id].tsx` (lines 179-206, 535-576)
- `/Users/why/repos/trivium/src-tauri/src/commands/reading.rs` (after line 340)

### Phase 3: Frontend Statistics Page (Week 3)

#### Page Structure

**Route**: `/stats` with keyboard shortcut `Ctrl/Cmd+7`

**Tab Organization**:
1. **Overview** - Summary cards, study time, accuracy, projection
2. **Review Performance** - Detailed review analytics, hourly distribution
3. **Reading Progress** - Folder analysis, reading velocity

**File**: `/Users/why/repos/trivium/src/routes/stats/index.tsx`

#### Component Architecture

```
src/components/stats/
├── OverviewTab.tsx           # Overview tab content
├── ReviewTab.tsx             # Review performance tab
├── ReadingTab.tsx            # Reading progress tab
├── StatsSummaryCard.tsx      # Reusable stat card
├── DateRangeSelector.tsx     # Week/Month/Quarter/Year/All
├── FolderFilter.tsx          # Filter by folder
├── charts/
│   ├── ReviewProjectionChart.tsx    # 7-30 day forecast
│   ├── DifficultyHeatmap.tsx        # Performance by hour
│   ├── ReadingProgressChart.tsx     # Progress by folder
│   ├── StudyTimeChart.tsx           # Time trends
│   ├── AccuracyTrendChart.tsx       # Retention over time
│   ├── CustomTooltip.tsx            # Themed tooltips
│   └── SkeletonChart.tsx            # Loading states
└── EmptyStatsState.tsx       # No data placeholder
```

#### State Management

**File**: `/Users/why/repos/trivium/src/lib/stores/stats.ts`

```typescript
interface StatsState {
  reviewHistory: ReviewHistoryEntry[];
  aggregatedStats: AggregatedStats | null;
  isLoading: boolean;
  error: string | null;
  dateRange: DateRange;
  selectedFolders: string[];

  // Actions
  loadStats: (range: DateRange) => Promise<void>;
  setDateRange: (range: DateRange) => void;
  setSelectedFolders: (folders: string[]) => void;

  // Computed getters
  getProjectionData: () => ReviewProjectionData[];
  getStudyTimeData: () => StudyTimeData[];
  getAccuracyData: () => AccuracyData[];
  getDifficultyHeatmap: () => HeatmapData[];
}
```

#### Chart Library

**Selected**: Recharts
- React-first declarative API
- Excellent dark mode support via CSS variables
- TypeScript first-class support
- Lightweight with good tree-shaking

**Installation**:
```bash
npm install recharts
```

### Phase 4: Visualizations (Week 4)

#### Chart Components

**1. ReviewProjectionChart** - Area chart showing forecasted reviews
- Stacked areas for New/Learning/Review cards
- 7-30 day projection based on current intervals
- Color-coded by card type

**2. DifficultyHeatmap** - Calendar heatmap of performance
- GitHub-style contribution grid
- Color intensity = performance quality
- Hover shows exact metrics

**3. ReadingProgressChart** - Stacked bar chart
- Characters/words read per day/week
- Broken down by folder
- Dynamic folder colors

**4. StudyTimeChart** - Line chart with area fill
- Review time + reading time
- Daily/weekly/monthly views
- Trend lines

**5. AccuracyTrendChart** - Line chart with confidence band
- Success rate over time
- Reference line at 80% target
- Smoothed trend

#### Design System Integration

**Colors** (using existing CSS variables):
- `--chart-1` through `--chart-5` for data series
- Automatic dark mode support
- WCAG AA contrast compliance

**Typography**:
- Chart titles: text-lg font-semibold
- Axis labels: text-sm text-muted-foreground
- Card padding: p-8

**Accessibility**:
- ARIA labels on all charts
- Screen reader data table alternatives
- Keyboard navigation support

---

## Data Model Details

### Review Statistics Data Structure

```typescript
interface ReviewStatistics {
  totalReviews: number;
  uniqueCardsReviewed: number;
  avgRating: number;
  retentionRate: number;  // % rated 3 or 4
  dailyStreak: number;
  forecastNext7Days: ForecastDay[];
}

interface ForecastDay {
  date: string;
  cardsDue: number;
  newCards: number;
  reviewCards: number;
  learningCards: number;
}

interface HourlyReviewDistribution {
  hour: number;  // 0-23
  reviewCount: number;
  againRate: number;
  hardRate: number;
  goodRate: number;
  easyRate: number;
  avgDurationMs: number | null;
}

interface DailyReviewStats {
  date: string;
  totalReviews: number;
  uniqueCards: number;
  avgRating: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
  avgDurationMs: number | null;
}
```

### Reading Statistics Data Structure

```typescript
interface ReadingStatistics {
  totalTimeSeconds: number;
  totalCharactersRead: number;
  sessionCount: number;
  avgSessionDuration: number;
  textsRead: number;
  byFolder: FolderReadingStats[];
}

interface FolderReadingStats {
  folderId: string;
  folderName: string;
  totalTimeSeconds: number;
  charactersRead: number;
  sessionCount: number;
}
```

### Study Time Data Structure

```typescript
interface StudyTimeStats {
  totalStudyTimeMs: number;
  avgTimePerCardMs: number;
  totalCardsReviewed: number;
  byDate: DailyStudyTime[];
}

interface DailyStudyTime {
  date: string;
  totalTimeMs: number;
  cardCount: number;
  avgTimePerCardMs: number;
}
```

---

## Session Detection Algorithms

### Review Sessions

**Session Boundary**: 30 minutes of inactivity

**Lifecycle**:
1. **Start**: When `loadDueCards()` called in review store
2. **Activity**: Any `gradeCard()` call resets inactivity timer
3. **End**: When `currentCard` becomes null OR user navigates away OR 30min timeout

**Implementation**:
- Generate session UUID on start
- Store in review store state
- Pass with each card grade
- Auto-end on component unmount

### Reading Sessions

**Session Boundary**: 5 minutes of inactivity

**Lifecycle**:
1. **Start**: When ReadPage component mounts
2. **Activity**: Scroll, mousedown, keydown, markRangeAsRead events
3. **End**: Component unmount OR 5min inactivity timeout

**Heartbeat**: Update current position every 30 seconds if active

**Implementation**:
- Generate session UUID on mount
- Activity debouncing (150ms)
- Periodic position updates
- Track character/word counts per mark

---

## Performance Considerations

### Database Performance

**Estimated Storage Growth**:
- Review sessions: ~100 bytes + (50 bytes × cards) per session
- Reading sessions: ~150 bytes + (80 bytes × marks) per session
- **1 year daily use**: ~365 KB total (negligible)

**Query Optimization**:
- All date-range queries use indexed columns
- Views pre-aggregate common queries
- Composite indexes for multi-column filters
- Expected query time: <50ms for most aggregations

### Frontend Performance

**Caching Strategy**:
- Cache review history for 5 minutes in Zustand store
- Recompute aggregations on date range change
- Invalidate on new review/reading activity

**Lazy Loading**:
- Charts load progressively as user scrolls
- Skeleton screens during data fetch
- Debounced filter changes (300ms)

**Rendering Optimization**:
- React.memo on chart components
- Memoized data transformations
- Virtualized lists for large datasets

---

## Privacy & Security

### Data Collection Principles

**Collected**:
- ✅ Session timestamps (start/end)
- ✅ Card difficulty ratings
- ✅ Character/word counts (aggregated)
- ✅ Duration metrics

**NOT Collected**:
- ❌ Actual text content
- ❌ Keystroke data
- ❌ Screen captures
- ❌ Browsing history

### Data Retention

- Sessions: Indefinite (small footprint, valuable for trends)
- Review history: Indefinite (required for FSRS algorithm)
- Read ranges: Indefinite (progress tracking)
- No automatic deletion (user controls via Settings → Reset)

---

## Success Criteria

### Functional Requirements

- [ ] Statistics page accessible via Ctrl+7
- [ ] All charts render correctly in light and dark mode
- [ ] Date range filters work (week/month/quarter/year/all)
- [ ] Folder filters apply to reading statistics
- [ ] Review projection accurately forecasts next 7 days
- [ ] Study streak calculates correctly
- [ ] Historical data displays accurately

### Performance Requirements

- [ ] Statistics page loads in <1 second
- [ ] Chart rendering <100ms
- [ ] Database queries <50ms
- [ ] No lag during review/reading workflows
- [ ] Smooth scrolling on stats page

### UX Requirements

- [ ] Responsive design works on mobile/tablet/desktop
- [ ] Empty states show helpful guidance
- [ ] Error states allow retry
- [ ] Loading skeletons prevent layout shift
- [ ] Tooltips provide context
- [ ] Keyboard navigation works

### Accessibility Requirements

- [ ] All charts have ARIA labels
- [ ] Screen reader alternatives for visualizations
- [ ] Keyboard-only navigation supported
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible

---

## Migration Path

### Backfilling Historical Data

**Review Sessions** - Infer from gaps in review_history:
```sql
-- Group reviews within 30 minutes into sessions
WITH session_groups AS (
  SELECT
    flashcard_id,
    reviewed_at,
    rating,
    SUM(CASE
      WHEN julianday(reviewed_at) - julianday(LAG(reviewed_at) OVER (ORDER BY reviewed_at)) > 30.0/1440
      THEN 1
      ELSE 0
    END) OVER (ORDER BY reviewed_at) as session_num
  FROM review_history
)
INSERT INTO review_sessions (id, user_id, started_at, ended_at, total_cards, ...)
SELECT
  lower(hex(randomblob(16))),
  1,
  MIN(reviewed_at),
  MAX(reviewed_at),
  COUNT(*),
  ...
FROM session_groups
GROUP BY session_num;
```

**Reading Sessions** - Infer from gaps in read_ranges:
```sql
-- Group marks within 5 minutes into sessions
WITH session_groups AS (
  SELECT
    text_id,
    marked_at,
    start_position,
    end_position,
    SUM(CASE
      WHEN julianday(marked_at) - julianday(LAG(marked_at) OVER (PARTITION BY text_id ORDER BY marked_at)) > 5.0/1440
      THEN 1
      ELSE 0
    END) OVER (PARTITION BY text_id ORDER BY marked_at) as session_num
  FROM read_ranges
)
INSERT INTO reading_sessions (id, text_id, user_id, started_at, ended_at, ...)
SELECT
  lower(hex(randomblob(16))),
  text_id,
  1,
  MIN(marked_at),
  MAX(marked_at),
  ...
FROM session_groups
GROUP BY text_id, session_num;
```

---

## Testing Strategy

### Unit Tests

- [ ] Session detection algorithms
- [ ] Data aggregation functions
- [ ] Projection calculations
- [ ] Date range utilities

### Integration Tests

- [ ] Backend statistics commands
- [ ] Database views return correct data
- [ ] Session tracking lifecycle
- [ ] Backfill scripts

### Manual Testing

- [ ] Review workflow with timing
- [ ] Reading workflow with sessions
- [ ] Statistics page navigation
- [ ] Chart interactions
- [ ] Filter combinations
- [ ] Responsive breakpoints
- [ ] Dark mode appearance

---

## Documentation Updates

### Files to Update

1. **PROGRESS.md** - Add Phase 20 completion details
2. **DOCUMENTATION_INDEX.md** - Add Phase 20 doc
3. **KEYBOARD_SHORTCUTS.md** - Add Ctrl+7 for Statistics
4. **architecture-backend.md** - Document statistics commands
5. **architecture-frontend.md** - Document statistics components

### New Documentation Files

1. **PHASE_20_STATISTICS.md** - This file (comprehensive guide)
2. **STATISTICS_QUICK_REFERENCE.md** - Developer quick reference
3. **STATISTICS_USER_GUIDE.md** - End-user documentation

---

## Implementation Timeline

### Week 1: Backend Foundation
- Database migrations (2 days)
- Statistics commands (3 days)

### Week 2: Data Collection
- Review timing instrumentation (2 days)
- Reading session tracking (3 days)

### Week 3: Frontend Structure
- Statistics page setup (2 days)
- State management (1 day)
- Chart library integration (2 days)

### Week 4: Visualizations
- Chart components (3 days)
- Polish and testing (2 days)

**Total**: 4 weeks (~20 working days)

---

## Future Enhancements (Post-Phase 20)

### Advanced Analytics
- Study pattern recommendations ("You perform best at 10am")
- Retention predictions with ML
- Difficulty trend analysis
- Optimal study time calculator

### Comparative Analytics
- Compare against personal averages
- Goal setting and tracking
- Progress milestones

### Export & Sharing
- Export statistics as PDF
- CSV data export
- Shareable progress reports

### Integration
- Calendar integration (Google Calendar, etc.)
- Study reminders based on forecast
- Achievement system

---

## References

### Anki Statistics Resources
- [Anki Stats Documentation](https://docs.ankiweb.net/stats.html)
- [FSRS Algorithm](https://github.com/open-spaced-repetition/fsrs4anki)
- Anki Review Heatmap Add-on

### Technical Resources
- [Recharts Documentation](https://recharts.org/)
- [WCAG 2.1 Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [GitHub Calendar Heatmap Pattern](https://github.com/)

### Trivium Codebase References
- `/Users/why/repos/trivium/src/routes/review/session.tsx` - Review workflow
- `/Users/why/repos/trivium/src/routes/read/[id].tsx` - Reading workflow
- `/Users/why/repos/trivium/src-tauri/src/commands/review.rs` - Review backend
- `/Users/why/repos/trivium/src-tauri/src/commands/reading.rs` - Reading backend

---

**Document Version**: 1.0
**Last Updated**: 2025-10-19
**Status**: Planning Complete, Ready for Implementation
