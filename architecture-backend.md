# Backend Architecture - Trivium

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
Stores ingested articles and content.

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
    metadata JSON
);
```

### Reading Progress Table
Tracks incremental reading progress.

```sql
CREATE TABLE reading_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text_id INTEGER NOT NULL,
    user_id INTEGER DEFAULT 1,
    current_position INTEGER NOT NULL DEFAULT 0,  -- Character offset
    last_read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_time_seconds INTEGER NOT NULL DEFAULT 0,
    completion_percentage REAL NOT NULL DEFAULT 0.0,
    FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE,
    UNIQUE(text_id, user_id)
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

### Fetching Article Content

```rust
use reqwest::Client;

#[tauri::command]
async fn fetch_wikipedia_article(title: String) -> Result<String, String> {
    let client = Client::new();
    let url = format!(
        "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&titles={}&explaintext=1&format=json",
        urlencoding::encode(&title)
    );

    let response = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let wiki_response: WikiResponse = response.json().await.map_err(|e| e.to_string())?;

    Ok(wiki_response.extract())
}
```

## Project Structure

```
src-tauri/src/
├── main.rs
├── commands/
│   ├── mod.rs
│   ├── texts.rs          # Text ingestion commands
│   ├── reading.rs        # Reading progress commands
│   ├── flashcards.rs     # Flashcard commands
│   └── review.rs         # Review/SRS commands
├── models/
│   ├── mod.rs
│   ├── text.rs
│   ├── flashcard.rs
│   └── progress.rs
├── services/
│   ├── mod.rs
│   ├── srs.rs            # FSRS logic
│   ├── wikipedia.rs      # Wikipedia API
│   └── parser.rs         # Text parsing
└── db/
    ├── mod.rs
    └── migrations/
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. Set up Tauri project structure
2. Initialize SQLite database with SQLx
3. Implement basic CRUD commands for texts
4. Create migration system

### Phase 2: Text Ingestion (Week 2-3)
1. Implement paste functionality
2. Integrate Wikipedia API
3. Add text storage and retrieval

### Phase 3: Reading Progress (Week 3-4)
1. Implement position tracking
2. Add session logging
3. Build resume functionality

### Phase 4: Flashcards (Week 4-5)
1. Implement cloze deletion parser
2. Create flashcard CRUD operations
3. Add context preservation

### Phase 5: SRS Implementation (Week 5-6)
1. Integrate FSRS library
2. Implement review scheduling
3. Add review history tracking

### Phase 6: Polish (Week 6-7)
1. Add tags system
2. Implement search functionality
3. Add statistics and analytics
4. Optimize performance
