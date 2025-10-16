# Backend Architecture - Trivium

> **⚠️ Note**: This document contains outdated schema information. The actual implementation differs:
> - Folders use TEXT (UUID) primary keys, not INTEGER AUTOINCREMENT
> - Texts have a direct `folder_id TEXT` column (foreign key to folders.id)
> - No separate `text_folders` junction table (replaced by folder_id column)
> - See migration files in `src-tauri/migrations/` for current schema
> - Last schema change: 2025-10-16 (folder_id INTEGER → TEXT via migration 20251015000002)

## Technology Stack

### Core Technologies
- **Language**: Rust (Tauri native)
- **Database**: SQLite with SQLx
- **SRS Algorithm**: FSRS (Free Spaced Repetition Scheduler)
- **HTTP Client**: reqwest (for Wikipedia API)
- **Async Runtime**: Tokio (managed by Tauri)

## Architecture Overview

```
┌─────────────────────────────────────┐
│   Frontend (Web Technologies)       │
└───────────────┬─────────────────────┘
                │ Tauri IPC
┌───────────────▼─────────────────────┐
│   Tauri Commands Layer              │
│   - #[tauri::command] functions     │
└───────────────┬─────────────────────┘
                │
┌───────────────▼─────────────────────┐
│   Business Logic Layer (Rust)       │
│   - Text Processing                 │
│   - SRS Algorithm                   │
│   - Wikipedia Parsing               │
└───────────────┬─────────────────────┘
                │
┌───────────────▼─────────────────────┐
│   Data Layer (SQLite + SQLx)        │
│   - Embedded Database               │
│   - Migration Management            │
└─────────────────────────────────────┘
```

## Database Schema

### Texts Table
Stores ingested articles and content with MLA bibliography metadata.

```sql
CREATE TABLE texts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    source TEXT NOT NULL,        -- 'wikipedia', 'paste', 'file'
    source_url TEXT,
    content TEXT NOT NULL,
    content_length INTEGER NOT NULL,
    ingested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,

    -- MLA Bibliography Fields
    author TEXT,
    publication_date TEXT,
    publisher TEXT,
    access_date TEXT,
    doi TEXT,
    isbn TEXT
);
```

### Folders Table
Hierarchical folder structure for organizing texts.

```sql
CREATE TABLE folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);
```

### Text Folders Table
Many-to-many relationship between texts and folders.

```sql
CREATE TABLE text_folders (
    text_id INTEGER NOT NULL,
    folder_id INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (text_id, folder_id),
    FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
);
```

### Reading Progress Table
Tracks incremental reading session metadata.

```sql
CREATE TABLE reading_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text_id INTEGER NOT NULL,
    user_id INTEGER DEFAULT 1,
    current_position INTEGER NOT NULL DEFAULT 0,  -- Character offset (deprecated, use read_ranges)
    last_read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_time_seconds INTEGER NOT NULL DEFAULT 0,
    completion_percentage REAL NOT NULL DEFAULT 0.0,
    FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE,
    UNIQUE(text_id, user_id)
);
```

### Read Ranges Table
Tracks multiple read/unread sections per text for nonlinear reading.

```sql
CREATE TABLE read_ranges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text_id INTEGER NOT NULL,
    user_id INTEGER DEFAULT 1,
    start_position INTEGER NOT NULL,
    end_position INTEGER NOT NULL,
    marked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE
);
```

### Paragraphs Table
Detected paragraph boundaries for navigation and progress tracking.

```sql
CREATE TABLE paragraphs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text_id INTEGER NOT NULL,
    paragraph_index INTEGER NOT NULL,
    start_position INTEGER NOT NULL,
    end_position INTEGER NOT NULL,
    character_count INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE,
    UNIQUE(text_id, paragraph_index)
);
```

### Flashcards Table
Stores cloze deletion flashcards with FSRS state.

```sql
CREATE TABLE flashcards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text_id INTEGER NOT NULL,
    user_id INTEGER DEFAULT 1,

    -- Content
    original_text TEXT NOT NULL,
    cloze_text TEXT NOT NULL,      -- Text with {{c1::deletion}}
    cloze_index INTEGER NOT NULL,

    -- Metadata
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- FSRS Algorithm State
    due DATETIME NOT NULL,
    stability REAL NOT NULL DEFAULT 0.0,
    difficulty REAL NOT NULL DEFAULT 0.0,
    elapsed_days INTEGER NOT NULL DEFAULT 0,
    scheduled_days INTEGER NOT NULL DEFAULT 0,
    reps INTEGER NOT NULL DEFAULT 0,
    lapses INTEGER NOT NULL DEFAULT 0,
    state INTEGER NOT NULL DEFAULT 0,  -- 0=New, 1=Learning, 2=Review, 3=Relearning
    last_review DATETIME,

    FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE
);
```

### Review History Table
Tracks all card reviews for analytics.

```sql
CREATE TABLE review_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flashcard_id INTEGER NOT NULL,
    user_id INTEGER DEFAULT 1,
    reviewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rating INTEGER NOT NULL,           -- 1=Again, 2=Hard, 3=Good, 4=Easy
    review_duration_ms INTEGER,
    state_before INTEGER NOT NULL,
    state_after INTEGER NOT NULL,
    FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE
);
```

### Study Limits Table
Daily limits for new cards and reviews per user.

```sql
CREATE TABLE study_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER DEFAULT 1,
    daily_new_cards INTEGER NOT NULL DEFAULT 20,
    daily_reviews INTEGER NOT NULL DEFAULT 200,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);
```

## Key Dependencies

```toml
[dependencies]
# Tauri
tauri = { version = "2.0", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Database
sqlx = { version = "0.8", features = ["runtime-tokio", "sqlite", "chrono", "migrate", "macros"] }

# Async Runtime
tokio = { version = "1", features = ["full"] }

# HTTP Client
reqwest = { version = "0.12", features = ["json"] }

# SRS Algorithm
fsrs = "0.5"

# Date/Time
chrono = { version = "0.4", features = ["serde"] }

# Text Processing
regex = "1.10"
urlencoding = "2.1"

# Error Handling
thiserror = "1.0"
anyhow = "1.0"
```

## SRS Implementation (FSRS)

FSRS is the modern successor to SM-2, offering 20-30% fewer reviews for the same retention rate.

### Core Concepts
- **Retrievability (R)**: Probability of successful recall
- **Stability (S)**: Time for R to decrease from 100% to 90%
- **Difficulty (D)**: Inherent complexity of information

### Implementation Example

```rust
use fsrs::{FSRS, Card, Rating, SchedulingCards};

let fsrs = FSRS::new(None);  // Use default parameters
let card = Card::default();  // New card
let now = chrono::Utc::now();

let scheduling_cards = fsrs.repeat(&card, now);

// Get intervals for different ratings
let again_state = &scheduling_cards.again;
let hard_state = &scheduling_cards.hard;
let good_state = &scheduling_cards.good;
let easy_state = &scheduling_cards.easy;
```

## Wikipedia API Integration

### Fetching and Parsing Article Content

Wikipedia integration uses the Parse API with HTML parsing for superior content extraction:

```rust
use reqwest::Client;
use scraper::{Html, Selector};

#[tauri::command]
async fn fetch_wikipedia_article(url: String) -> Result<WikipediaArticle, String> {
    // Extract page title from URL
    let title = extract_title_from_url(&url)?;

    // Fetch HTML from Wikipedia Parse API
    let client = Client::new();
    let api_url = format!(
        "https://en.wikipedia.org/w/api.php?action=parse&page={}&prop=text&format=json",
        urlencoding::encode(&title)
    );

    let response = client.get(&api_url).send().await.map_err(|e| e.to_string())?;
    let parse_response: ParseResponse = response.json().await.map_err(|e| e.to_string())?;

    // Parse HTML and extract clean text
    let html = Html::parse_document(&parse_response.parse.text);
    let content = extract_clean_text(&html)?;

    Ok(WikipediaArticle {
        title,
        content,
        source_url: url,
        publisher: "Wikipedia".to_string(),
        publication_date: chrono::Utc::now().format("%Y-%m-%d").to_string(),
    })
}
```

**Key Features (Phase 6.5 - Complete)**:
- HTML-to-text parsing with `scraper` crate
- CSS selector-based content filtering
- Removes infoboxes, navigation, references, and tables
- Preserves section headings and instrumentation lists
- Link text extraction (not removed)
- Clean whitespace normalization
- Automatic metadata population

## Project Structure

```
src-tauri/src/
├── main.rs
├── commands/
│   ├── mod.rs
│   ├── texts.rs          # Text ingestion commands
│   ├── reading.rs        # Reading progress, ranges, paragraphs
│   ├── flashcards.rs     # Flashcard commands
│   ├── review.rs         # Review/SRS commands with filtering
│   ├── folders.rs        # Folder management
│   ├── wikipedia.rs      # Wikipedia fetching command (Phase 6.5)
│   └── stats.rs          # Statistics aggregation
├── models/
│   ├── mod.rs
│   ├── text.rs
│   ├── flashcard.rs
│   ├── progress.rs
│   ├── folder.rs         # Folder and FolderNode (NEW)
│   ├── read_range.rs     # ReadRange model (NEW)
│   ├── paragraph.rs      # Paragraph model (NEW)
│   └── stats.rs          # Stats models (NEW)
├── services/
│   ├── mod.rs
│   ├── srs.rs            # FSRS-5 algorithm implementation
│   ├── wikipedia.rs      # Wikipedia HTML parsing (Phase 6.5)
│   ├── parser.rs         # Text parsing, paragraph detection, MLA parsing
│   └── range_calculator.rs  # Read range merging and calculation
└── db/
    ├── mod.rs
    └── migrations/
```

## Command Modules

### commands/folders.rs
Manages hierarchical folder organization.

```rust
#[tauri::command]
async fn create_folder(name: String, parent_id: Option<i64>, db: State<Database>) -> Result<Folder, String>

#[tauri::command]
async fn get_folder_tree(db: State<Database>) -> Result<Vec<FolderNode>, String>

#[tauri::command]
async fn move_folder(folder_id: i64, new_parent_id: Option<i64>, db: State<Database>) -> Result<(), String>

#[tauri::command]
async fn delete_folder(folder_id: i64, db: State<Database>) -> Result<(), String>

#[tauri::command]
async fn add_text_to_folder(text_id: i64, folder_id: i64, db: State<Database>) -> Result<(), String>

#[tauri::command]
async fn remove_text_from_folder(text_id: i64, folder_id: i64, db: State<Database>) -> Result<(), String>

#[tauri::command]
async fn get_texts_in_folder(folder_id: i64, db: State<Database>) -> Result<Vec<Text>, String>
```

### commands/reading.rs
Enhanced reading progress with read ranges and paragraph navigation.

```rust
#[tauri::command]
async fn mark_range_as_read(text_id: i64, start_pos: i64, end_pos: i64, db: State<Database>) -> Result<(), String>

#[tauri::command]
async fn get_read_ranges(text_id: i64, db: State<Database>) -> Result<Vec<ReadRange>, String>

#[tauri::command]
async fn get_most_recently_read_text(text_id: i64, db: State<Database>) -> Result<Option<String>, String>

#[tauri::command]
async fn calculate_text_progress(text_id: i64, db: State<Database>) -> Result<f64, String>

#[tauri::command]
async fn get_paragraphs(text_id: i64, db: State<Database>) -> Result<Vec<Paragraph>, String>

#[tauri::command]
async fn get_next_unread_paragraph(text_id: i64, current_pos: i64, db: State<Database>) -> Result<Option<Paragraph>, String>

#[tauri::command]
async fn get_previous_paragraph(text_id: i64, current_pos: i64, db: State<Database>) -> Result<Option<Paragraph>, String>
```

### commands/review.rs
SRS review with advanced filtering and daily limits.

```rust
#[tauri::command]
async fn get_due_cards_by_folder(folder_id: i64, db: State<Database>) -> Result<Vec<Flashcard>, String>

#[tauri::command]
async fn get_due_cards_by_tag(tag_id: i64, db: State<Database>) -> Result<Vec<Flashcard>, String>

#[tauri::command]
async fn get_due_cards_by_text(text_id: i64, db: State<Database>) -> Result<Vec<Flashcard>, String>

#[tauri::command]
async fn get_study_session(filter: StudyFilter, include_new: bool, include_due: bool, db: State<Database>) -> Result<Vec<Flashcard>, String>

#[tauri::command]
async fn set_daily_limits(new_cards: i64, reviews: i64, db: State<Database>) -> Result<(), String>

#[tauri::command]
async fn get_todays_progress(db: State<Database>) -> Result<DailyProgress, String>
```

### commands/stats.rs
Multi-dimensional statistics aggregation.

```rust
#[tauri::command]
async fn get_reading_stats_by_folder(folder_id: i64, db: State<Database>) -> Result<ReadingStats, String>

#[tauri::command]
async fn get_reading_stats_by_tag(tag_id: i64, db: State<Database>) -> Result<ReadingStats, String>

#[tauri::command]
async fn get_reading_stats_by_text(text_id: i64, db: State<Database>) -> Result<ReadingStats, String>

#[tauri::command]
async fn get_flashcard_stats_by_folder(folder_id: i64, db: State<Database>) -> Result<FlashcardStats, String>

#[tauri::command]
async fn get_flashcard_stats_by_tag(tag_id: i64, db: State<Database>) -> Result<FlashcardStats, String>

#[tauri::command]
async fn get_flashcard_stats_by_text(text_id: i64, db: State<Database>) -> Result<FlashcardStats, String>

#[tauri::command]
async fn get_overall_stats(db: State<Database>) -> Result<OverallStats, String>
```

## Models

### models/folder.rs
Hierarchical folder structure with tree representation.

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Folder {
    pub id: i64,
    pub name: String,
    pub parent_id: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderNode {
    pub folder: Folder,
    pub children: Vec<FolderNode>,
    pub text_count: i64,
}
```

### models/read_range.rs
Read/unread tracking with position ranges.

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ReadRange {
    pub id: i64,
    pub text_id: i64,
    pub user_id: i64,
    pub start_position: i64,
    pub end_position: i64,
    pub marked_at: DateTime<Utc>,
}
```

### models/paragraph.rs
Paragraph boundaries and read state.

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Paragraph {
    pub id: i64,
    pub text_id: i64,
    pub paragraph_index: i64,
    pub start_position: i64,
    pub end_position: i64,
    pub character_count: i64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParagraphWithReadState {
    pub paragraph: Paragraph,
    pub is_read: bool,
}
```

### models/stats.rs
Statistics models for aggregation.

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadingStats {
    pub total_texts: i64,
    pub total_characters: i64,
    pub characters_read: i64,
    pub completion_percentage: f64,
    pub texts_completed: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlashcardStats {
    pub total_cards: i64,
    pub mature_cards: i64,
    pub young_cards: i64,
    pub new_cards: i64,
    pub average_retention: f64,
    pub total_reviews: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OverallStats {
    pub reading: ReadingStats,
    pub flashcards: FlashcardStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyProgress {
    pub new_cards_studied: i64,
    pub reviews_completed: i64,
    pub daily_new_limit: i64,
    pub daily_review_limit: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StudyFilter {
    All,
    Folder { folder_id: i64 },
    Tag { tag_id: i64 },
    Text { text_id: i64 },
}
```

## Services

### services/range_calculator.rs
Calculates read progress from overlapping ranges.

```rust
use crate::models::read_range::ReadRange;

pub struct RangeCalculator;

impl RangeCalculator {
    pub fn calculate_read_characters(ranges: Vec<ReadRange>) -> i64 {
        if ranges.is_empty() {
            return 0;
        }

        let mut sorted_ranges = ranges;
        sorted_ranges.sort_by_key(|r| r.start_position);

        let mut merged_ranges = Vec::new();
        let mut current_start = sorted_ranges[0].start_position;
        let mut current_end = sorted_ranges[0].end_position;

        for range in sorted_ranges.iter().skip(1) {
            if range.start_position <= current_end {
                current_end = current_end.max(range.end_position);
            } else {
                merged_ranges.push((current_start, current_end));
                current_start = range.start_position;
                current_end = range.end_position;
            }
        }
        merged_ranges.push((current_start, current_end));

        merged_ranges.iter().map(|(start, end)| end - start).sum()
    }

    pub fn is_position_read(position: i64, ranges: &[ReadRange]) -> bool {
        ranges.iter().any(|r| position >= r.start_position && position < r.end_position)
    }

    pub fn get_unread_ranges(total_length: i64, read_ranges: Vec<ReadRange>) -> Vec<(i64, i64)> {
        if read_ranges.is_empty() {
            return vec![(0, total_length)];
        }

        let mut sorted_ranges = read_ranges;
        sorted_ranges.sort_by_key(|r| r.start_position);

        let mut unread = Vec::new();
        let mut current_pos = 0;

        for range in sorted_ranges {
            if range.start_position > current_pos {
                unread.push((current_pos, range.start_position));
            }
            current_pos = current_pos.max(range.end_position);
        }

        if current_pos < total_length {
            unread.push((current_pos, total_length));
        }

        unread
    }
}
```

### services/parser.rs
Enhanced with paragraph detection and MLA parsing.

```rust
use regex::Regex;

pub struct Parser;

impl Parser {
    pub fn detect_paragraphs(content: &str) -> Vec<(usize, usize)> {
        let mut paragraphs = Vec::new();
        let lines: Vec<&str> = content.lines().collect();
        let mut current_start = 0;
        let mut current_pos = 0;
        let mut in_paragraph = false;

        for line in lines {
            let line_len = line.len() + 1;

            if line.trim().is_empty() {
                if in_paragraph {
                    paragraphs.push((current_start, current_pos));
                    in_paragraph = false;
                }
            } else {
                if !in_paragraph {
                    current_start = current_pos;
                    in_paragraph = true;
                }
            }

            current_pos += line_len;
        }

        if in_paragraph {
            paragraphs.push((current_start, current_pos));
        }

        paragraphs
    }

    pub fn parse_mla_metadata(mla_string: &str) -> MLAMetadata {
        let author_re = Regex::new(r"^(.+?)\.").unwrap();
        let date_re = Regex::new(r"\b(\d{4})\b").unwrap();
        let publisher_re = Regex::new(r"(?:publisher|press):\s*(.+?)[,.]").unwrap();
        let doi_re = Regex::new(r"doi:\s*([^\s,]+)").unwrap();
        let isbn_re = Regex::new(r"isbn:\s*([^\s,]+)").unwrap();

        MLAMetadata {
            author: author_re.captures(mla_string).and_then(|c| c.get(1)).map(|m| m.as_str().to_string()),
            publication_date: date_re.captures(mla_string).and_then(|c| c.get(1)).map(|m| m.as_str().to_string()),
            publisher: publisher_re.captures(mla_string).and_then(|c| c.get(1)).map(|m| m.as_str().to_string()),
            doi: doi_re.captures(mla_string).and_then(|c| c.get(1)).map(|m| m.as_str().to_string()),
            isbn: isbn_re.captures(mla_string).and_then(|c| c.get(1)).map(|m| m.as_str().to_string()),
        }
    }
}

#[derive(Debug, Clone)]
pub struct MLAMetadata {
    pub author: Option<String>,
    pub publication_date: Option<String>,
    pub publisher: Option<String>,
    pub doi: Option<String>,
    pub isbn: Option<String>,
}
```

## Implementation Roadmap

### Phase 1: Core Reading (Weeks 1-2)
1. Database migration: folders, read_ranges, paragraphs, study_limits
2. Add MLA fields to texts table
3. Backend: Folder management commands
4. Backend: Read range tracking and calculation
5. Backend: Paragraph detection service
6. Models: folder, read_range, paragraph

### Phase 2: Enhanced Navigation (Week 3)
1. Backend: Paragraph navigation commands
2. Backend: Progress calculation with read ranges
3. Service: range_calculator implementation
4. Command updates: reading.rs enhancements

### Phase 3: Flashcard Integration (Week 4)
1. Backend: "Most recently read" tracking
2. Command updates: review.rs filtering
3. Backend: Study session filtering logic

### Phase 4: Study Filtering (Week 5)
1. Backend: Study session filtering by folder/tag/text
2. Backend: Daily limits system implementation
3. Commands: set_daily_limits, get_todays_progress
4. Models: StudyFilter, DailyProgress

### Phase 5: Statistics (Week 6)
1. Backend: Statistics calculation queries
2. Commands: stats.rs implementation
3. Models: ReadingStats, FlashcardStats, OverallStats
4. Aggregation by folder/tag/text

### Phase 6: Polish (Week 7)
1. MLA metadata parsing
2. PDF/EPUB import
3. Performance optimization
4. Comprehensive error handling
