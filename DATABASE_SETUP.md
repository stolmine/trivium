# Database Setup - Trivium

## Overview

SQLx is configured for the Trivium application with SQLite as the database backend. This document outlines the setup and provides information for working with the database.

## Files Created/Modified

### 1. Migration File
**Location**: `/Users/why/repos/trivium/src-tauri/migrations/20241012000000_initial_schema.sql`

Contains the complete database schema with 7 tables:
- `texts` - Stores ingested articles and content
- `reading_progress` - Tracks incremental reading progress per user
- `reading_sessions` - Detailed session tracking
- `flashcards` - Cloze deletion flashcards with FSRS algorithm state
- `review_history` - Review tracking for analytics
- `tags` - Tag management
- `text_tags` - Many-to-many relationship between texts and tags

All tables include appropriate indexes for query performance optimization.

### 2. Database Module
**Location**: `/Users/why/repos/trivium/src-tauri/src/db/mod.rs`

Provides:
- `Database` struct wrapping the SQLx connection pool
- `Database::new(db_path)` - Async initialization function that:
  - Creates database file if it doesn't exist
  - Establishes connection pool with max 5 connections
  - Runs all pending migrations automatically
- `Database::pool()` - Returns reference to connection pool for queries

### 3. Application Initialization
**Location**: `/Users/why/repos/trivium/src-tauri/src/lib.rs`

The database is initialized on app startup via Tauri's `.setup()` hook:
- Database file is stored in the app data directory (platform-specific)
- Initialization happens asynchronously in a separate task
- Database instance is managed via Tauri's state management (`Arc<Mutex<Database>>`)
- Accessible from Tauri commands via state injection

### 4. Environment Configuration
**Location**: `/Users/why/repos/trivium/src-tauri/.env`

Contains `DATABASE_URL=sqlite:trivium.db` for SQLx compile-time checking.
This file is now in .gitignore and should not be committed.

### 5. Updated .gitignore
**Location**: `/Users/why/repos/trivium/src-tauri/.gitignore`

Added entries for:
- Database files (trivium.db, trivium.db-shm, trivium.db-wal)
- Environment file (.env)

## SQLx Compile-Time Verification

SQLx performs compile-time verification of SQL queries when using the `query!` and `query_as!` macros. For this to work:

1. The `DATABASE_URL` must be set in `.env` or environment
2. The database must exist and have the schema applied
3. Run migrations before using compile-time checked queries:

```bash
cd src-tauri
cargo sqlx database create
cargo sqlx migrate run
```

Alternatively, for offline mode (recommended for CI/CD):

```bash
cd src-tauri
cargo sqlx prepare
```

This creates `.sqlx/` directory with cached query metadata.

## Using the Database in Commands

Example Tauri command accessing the database:

```rust
use tauri::State;
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::db::Database;

#[tauri::command]
async fn get_texts(
    db: State<'_, Arc<Mutex<Database>>>
) -> Result<Vec<Text>, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let texts = sqlx::query_as!(
        Text,
        r#"SELECT * FROM texts ORDER BY ingested_at DESC"#
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(texts)
}
```

## Schema Notes

### FSRS State Fields
The `flashcards` table includes all FSRS algorithm state fields:
- `due` - Next review date
- `stability` - S parameter from FSRS
- `difficulty` - D parameter from FSRS
- `elapsed_days` - Days since last review
- `scheduled_days` - Scheduled interval
- `reps` - Total number of reviews
- `lapses` - Number of failed reviews
- `state` - Card state (0=New, 1=Learning, 2=Review, 3=Relearning)
- `last_review` - Timestamp of last review

Note: The `fsrs` crate dependency conflict with SQLx mentioned in Cargo.toml has been acknowledged. The FSRS algorithm can be implemented manually using these state fields or resolved later by:
1. Using a version of fsrs that doesn't link sqlite3
2. Using rusqlite instead of sqlx
3. Implementing the FSRS algorithm manually

### Metadata Field
The `texts.metadata` field is stored as TEXT (SQLite doesn't have native JSON type). When querying, you'll need to deserialize this field manually:

```rust
use serde_json::Value;

let metadata: Option<Value> = row.metadata
    .as_ref()
    .and_then(|s| serde_json::from_str(s).ok());
```

## Next Steps

To use the database in your application:

1. Create model structs in `src-tauri/src/models/` that match the table schemas
2. Add `#[derive(sqlx::FromRow)]` to enable `query_as!` macro
3. Implement command functions in `src-tauri/src/commands/`
4. Register commands in the `invoke_handler` in `lib.rs`
5. Access database state in commands via `State<'_, Arc<Mutex<Database>>>`

## Database Location

The SQLite database file is stored at:
- **macOS**: `~/Library/Application Support/com.trivium.app/trivium.db`
- **Linux**: `~/.local/share/trivium/trivium.db`
- **Windows**: `%APPDATA%\com.trivium.app\trivium.db`

## Warnings

The current build shows 2 warnings about unused code:
- `Database.pool` field is never read (expected - will be used when implementing commands)
- `Database::pool()` method is never used (expected - will be used when implementing commands)

These warnings are expected and will disappear once you start implementing database operations.
