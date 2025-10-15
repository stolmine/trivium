# SQLx Migration Best Practices Guide

**Created**: 2025-10-15
**Purpose**: Prevent compilation errors and migration panics in SQLx-based Rust projects

---

## Executive Summary

This guide documents lessons learned from resolving a critical migration checksum panic in Trivium. It provides a clear workflow to prevent the common anti-pattern: "fixing SQLx/Rust compilation errors leads to migration panics."

### The Golden Rule

**Never modify migration files after they've been applied to any database.**

Once a migration has been:
- Committed to version control
- Run on ANY database (dev, production, team member's machine)
- Shared with others

**It is immutable.** Always create a new migration for schema changes.

---

## Understanding SQLx's Three-Part System

SQLx combines three interconnected systems that must stay synchronized:

1. **Migration Files** (`.sql` files in `migrations/`)
2. **Rust Struct Definitions** (in `src/models/`)
3. **SQLx Compile-Time Verification Cache** (`.sqlx/` directory)
4. **Database Schema** (actual database state)
5. **Migration Tracking Table** (`_sqlx_migrations`)

### How Migration Checksums Work

SQLx generates a **SHA-384 checksum** (48 bytes / 96 hex characters) of each migration file and stores it in the `_sqlx_migrations` table. On every app startup:

```rust
sqlx::migrate!("./migrations")
    .run(&pool)
    .await
    .context("Failed to run migrations")?;
```

SQLx compares the checksum of files in `migrations/` against stored checksums in `_sqlx_migrations`. If they don't match → **PANIC**.

This is intentional! It prevents subtle bugs from accidentally modified migrations.

---

## The Anti-Pattern: What Goes Wrong

❌ **Typical Broken Workflow:**

1. Create migration → Run it → Database updated
2. Write Rust code with `query!()` macro
3. **Compilation error**: "column doesn't exist" or "type mismatch"
4. **"Fix"**: Edit the migration file to add missing column
5. Recompile → New compilation error or **PANIC**
6. Database has old schema, migration file has new schema, checksums don't match
7. Thread panic: `"migration X was previously applied but has been modified"`

### Why This Fails

- **Migration already applied**: Database has old version
- **File modified**: Checksum changed
- **Cache stale**: `.sqlx/` cache points to non-existent schema
- **Inconsistent state**: Different databases in different states

---

## The Correct Workflow

### Step-by-Step Schema Change Process

✅ **1. Plan Your Change**
- Determine what schema changes you need
- Check if any migrations have already been applied

✅ **2. Create a NEW Migration**
```bash
cd src-tauri
sqlx migrate add descriptive_name_of_change
```

This creates: `migrations/<timestamp>_descriptive_name_of_change.sql`

✅ **3. Write the Migration SQL**
```sql
-- migrations/20251015000003_add_user_preferences.sql
ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'light';
CREATE INDEX idx_users_theme ON users(theme);
```

✅ **4. Update Your Rust Structs FIRST**
```rust
// src/models/user.rs
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: i64,
    pub name: String,
    pub theme: Option<String>, // NEW FIELD
}
```

✅ **5. Run the Migration**
```bash
sqlx migrate run
```

✅ **6. Regenerate SQLx Cache**
```bash
cargo sqlx prepare --workspace
```

This updates all `.sqlx/query-*.json` files with the new schema.

✅ **7. Write Your Query Code**
```rust
let user = sqlx::query_as!(
    User,
    "SELECT id, name, theme FROM users WHERE id = ?",
    user_id
)
.fetch_one(pool)
.await?;
```

✅ **8. Compile and Test**
```bash
cargo build
```

✅ **9. Commit Everything Together**
```bash
git add migrations/ src/models/ .sqlx/
git commit -m "Add user theme preference"
```

---

## Common Pitfalls and Solutions

### Pitfall 1: Forgetting to Run `cargo sqlx prepare`

**Symptom:** Compilation works locally but fails in CI or for other developers

**Solution:** Always run after schema changes:
```bash
cargo sqlx prepare --workspace
git add .sqlx/
```

### Pitfall 2: Type Mismatches (Nullable vs Non-Nullable)

**Symptom:** Compilation error about trait bounds like `String: From<Option<String>>`

**Root Cause:** Database schema allows NULL but Rust struct field is non-nullable

**Example from Trivium:**
```sql
-- Database schema
CREATE TABLE texts (
    id TEXT PRIMARY KEY,
    source TEXT  -- Can be NULL
);
```

```rust
// WRONG - Will cause compilation error
pub struct Text {
    pub source: String,  // Non-nullable
}

// CORRECT - Matches database schema
pub struct Text {
    pub source: Option<String>,  // Nullable
}
```

**Solution:** Match Rust types to database schema:
- SQL `TEXT` (nullable) → Rust `Option<String>`
- SQL `TEXT NOT NULL` → Rust `String`
- SQL `INTEGER` (nullable) → Rust `Option<i64>`
- SQL `INTEGER NOT NULL` → Rust `i64`

### Pitfall 3: Datetime Comparisons in SQLite

**Symptom:** Queries with datetime comparisons return incorrect results

**Root Cause:** SQLite performs string comparison instead of datetime comparison

**Example from Trivium:**
```rust
// WRONG - String comparison
sqlx::query!("SELECT * FROM flashcards WHERE due <= ?", now)

// CORRECT - Datetime comparison
sqlx::query!("SELECT * FROM flashcards WHERE datetime(due) <= datetime(?)", now)
```

**Solution:** Always wrap datetime fields and values with `datetime()` function in SQLite queries.

### Pitfall 4: Modified Migrations

**Symptom:** Thread panic: "migration X was previously applied but has been modified"

**Root Cause:** Migration file modified after being applied

**Prevention:** Never modify applied migrations. See "Recovery from Modified Migration" section below.

---

## Recovery Procedures

### When You've Modified a Migration

If you've already modified a migration file and have checksum errors:

#### Option 1: Nuclear Option (Development Only)
```bash
# Delete the database and start fresh
rm trivium_dev.db

# Rerun all migrations from scratch
cargo sqlx database create
cargo sqlx migrate run
cargo sqlx prepare
```

**Pros:** Clean state, guaranteed consistency
**Cons:** Complete data loss

#### Option 2: Manual Checksum Fix (Advanced)

When data must be preserved (production databases):

**Step 1:** Compute current migration checksums
```bash
shasum -a 384 src-tauri/migrations/<migration_file>.sql
```

**Step 2:** Backup the database
```bash
cp database.db database.db.backup
```

**Step 3:** Update checksum in database
```bash
sqlite3 database.db
```

```sql
-- Update the checksum
UPDATE _sqlx_migrations
SET checksum = X'<new_checksum_hex>'
WHERE version = <migration_version>;

-- Verify
SELECT version, hex(checksum) FROM _sqlx_migrations WHERE version = <migration_version>;
```

**Step 4:** Test application startup

**Pros:** Zero data loss
**Cons:** Bypasses SQLx integrity checking

#### Option 3: Rollback and New Migration (Recommended)
```bash
# If you haven't shared changes:
git reset --hard HEAD~1  # Remove the problematic commit

# Create a proper new migration instead
sqlx migrate add correct_schema_change
```

**Pros:** Clean git history, proper migration trail
**Cons:** Only works if changes not yet shared

---

## Development vs Production Databases

### Recommended Setup

**Development Database:**
```bash
# src-tauri/.env.development
DATABASE_URL=sqlite:./trivium_dev.db
```

**Production Database:**
```bash
# src-tauri/.env (gitignored)
DATABASE_URL=sqlite:/Users/username/Library/Application Support/app/database.db
```

### Workflow for Dev vs Prod

**During Development:**
1. Use dev database (`trivium_dev.db`)
2. If migration needs changes: delete dev DB, modify migration, re-run
3. Once working: commit migration, **never modify again**

**For Production:**
1. Migrations already committed and immutable
2. Only run `sqlx migrate run`
3. Never modify migrations manually

---

## Offline Mode for CI/CD

For continuous integration without a database:

```bash
# Local: Generate query metadata
cargo sqlx prepare --workspace

# CI: Use offline mode
export SQLX_OFFLINE=true
cargo build --release
```

This uses the cached `.sqlx/` files instead of connecting to a database.

### .gitignore Settings

```gitignore
# Development database (never commit)
trivium_dev.db
trivium_dev.db-shm
trivium_dev.db-wal

# DO commit .sqlx/ directory for offline builds
# (but regenerate it frequently)
```

---

## Checklist for Schema Changes

Use this checklist every time you need to change the database schema:

```
[ ] 1. Create new migration file (never modify existing)
[ ] 2. Write clear, idempotent SQL (use IF NOT EXISTS)
[ ] 3. Update Rust struct definitions to match
[ ] 4. Run migration: `sqlx migrate run`
[ ] 5. Regenerate cache: `cargo sqlx prepare --workspace`
[ ] 6. Test compilation: `cargo build`
[ ] 7. Test runtime: Actually run the app
[ ] 8. Commit migration + structs + .sqlx cache together
[ ] 9. Verify: Check _sqlx_migrations table in database
[ ] 10. Document: Add comment explaining the change
```

---

## Quick Reference Commands

```bash
# Create new migration
sqlx migrate add migration_name

# Run migrations
sqlx migrate run

# Regenerate cache
cargo sqlx prepare --workspace

# Check migration status
sqlx migrate info

# Reset development database (DESTRUCTIVE)
rm trivium_dev.db && cargo sqlx database create && cargo sqlx migrate run

# Verify offline mode works
SQLX_OFFLINE=true cargo build

# Compute migration checksum (SHA-384)
shasum -a 384 migrations/<file>.sql
```

---

## Real-World Example: Trivium Migration Fix

### The Problem

After Phase 6 implementation, the application crashed on startup:

```
thread 'main' panicked at src/lib.rs:35:22:
Failed to initialize database: Failed to run migrations

Caused by:
    migration 20251015000001 was previously applied but has been modified
```

### Root Causes

1. Migration files modified after being applied
2. Checksums in `_sqlx_migrations` table didn't match current files
3. Both production and dev databases affected

### The Solution

1. **Computed current checksums** using `shasum -a 384`
2. **Backed up both databases** before changes
3. **Updated checksums** in `_sqlx_migrations` table:
   ```sql
   UPDATE _sqlx_migrations
   SET checksum = X'<new_checksum_hex>'
   WHERE version = 20251015000001;
   ```
4. **Tested application startup** - success!
5. **Committed migration files** to Git

### Key Learnings

- SQLx uses **SHA-384** (not SHA-256) for checksums
- Migration integrity is critical for production databases
- Always backup before manual database modifications
- Document the recovery process for future reference

---

## Prevention Strategy

### 1. Test Before Committing
```bash
# Create test database
cp trivium_dev.db trivium_test.db

# Test migration
export DATABASE_URL=sqlite:./trivium_test.db
sqlx migrate run

# Verify schema
sqlite3 trivium_test.db ".schema table_name"

# If good, regenerate and commit
cargo sqlx prepare --workspace
git add migrations/ .sqlx/ src/models/
git commit -m "Add feature with schema changes"
```

### 2. Code Review Checklist
- Migration file timestamp is new (not modified)
- Struct definitions match SQL schema
- `.sqlx/` files updated
- No `DROP TABLE` in migrations (unless truly needed)
- Nullable fields match between SQL and Rust

### 3. Database Versioning
Track your database schema version:
```rust
// Check migration status
let version = sqlx::query!("SELECT version FROM _sqlx_migrations ORDER BY version DESC LIMIT 1")
    .fetch_one(pool)
    .await?;

println!("Database version: {}", version.version);
```

---

## Conclusion

The key principle: **Migrations are append-only**. Never modify them after they've been applied.

Your workflow should be:
1. **New migration** for every schema change
2. **Update structs** to match
3. **Regenerate cache** with `cargo sqlx prepare`
4. **Commit together** as atomic change
5. **Never look back** at old migrations

This prevents the "fix compilation error → migration panic" cycle entirely.

---

## Additional Resources

- [SQLx Documentation](https://docs.rs/sqlx/)
- [SQLx GitHub Repository](https://github.com/launchbadge/sqlx)
- [SQLite Datetime Functions](https://www.sqlite.org/lang_datefunc.html)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-15
**Maintained By**: AI Agents and Contributors
