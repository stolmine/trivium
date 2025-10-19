use crate::db::Database;
use crate::models::flashcard::Flashcard;
use crate::models::study_filter::StudyFilter;
use crate::models::study_limits::{DailyProgress, LimitStatus, StudyLimits};
use crate::services::fsrs::{FSRSScheduler, SchedulingInfo};
use chrono::{DateTime, Utc};
use serde::Serialize;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GradeResult {
    pub flashcard: Flashcard,
    pub interval_days: i64,
    pub next_due: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewStats {
    pub due_count: i64,
    pub new_count: i64,
    pub learning_count: i64,
    pub review_count: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewHistoryEntry {
    pub id: i64,
    pub flashcard_id: i64,
    pub user_id: i64,
    pub reviewed_at: DateTime<Utc>,
    pub rating: i64,
    pub review_duration_ms: Option<i64>,
    pub state_before: i64,
    pub state_after: i64,
}

#[tauri::command]
pub async fn get_due_cards(
    limit: Option<i64>,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<Flashcard>, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let now = Utc::now();

    let clamped_limit = limit.unwrap_or(20).clamp(1, 100);

    let flashcards = sqlx::query_as!(
        Flashcard,
        r#"
        SELECT
            id as "id!",
            text_id as "text_id!",
            user_id as "user_id!",
            original_text,
            cloze_text,
            cloze_index as "cloze_index!",
            display_index as "display_index!",
            cloze_number as "cloze_number!",
            created_at as "created_at: _",
            updated_at as "updated_at: _",
            cloze_note_id,
            due as "due: _",
            stability as "stability!",
            difficulty as "difficulty!",
            elapsed_days as "elapsed_days!",
            scheduled_days as "scheduled_days!",
            reps as "reps!",
            lapses as "lapses!",
            state as "state!",
            last_review as "last_review: _"
        FROM flashcards
        WHERE datetime(due) <= datetime(?)
        ORDER BY datetime(due) ASC
        LIMIT ?
        "#,
        now,
        clamped_limit
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch due cards: {}", e))?;

    Ok(flashcards)
}

#[tauri::command]
pub async fn grade_card(
    flashcard_id: i64,
    rating: i64,
    filter: Option<StudyFilter>,
    review_duration_ms: Option<i64>,
    session_id: Option<String>,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<GradeResult, String> {
    if !(1..=4).contains(&rating) {
        return Err("Rating must be 1-4".to_string());
    }

    let db = db.lock().await;
    let pool = db.pool();
    let now = Utc::now();

    let flashcard = sqlx::query_as!(
        Flashcard,
        r#"
        SELECT
            id as "id!",
            text_id as "text_id!",
            user_id as "user_id!",
            original_text,
            cloze_text,
            cloze_index as "cloze_index!",
            display_index as "display_index!",
            cloze_number as "cloze_number!",
            created_at as "created_at: _",
            updated_at as "updated_at: _",
            cloze_note_id,
            due as "due: _",
            stability as "stability!",
            difficulty as "difficulty!",
            elapsed_days as "elapsed_days!",
            scheduled_days as "scheduled_days!",
            reps as "reps!",
            lapses as "lapses!",
            state as "state!",
            last_review as "last_review: _"
        FROM flashcards
        WHERE id = ?
        "#,
        flashcard_id
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to fetch flashcard: {}", e))?
    .ok_or_else(|| "Card not found".to_string())?;

    let elapsed_days = if let Some(last_review) = flashcard.last_review {
        let duration = now.signed_duration_since(last_review);
        duration.num_days().max(0)
    } else {
        0
    };

    let scheduler = FSRSScheduler::new();
    let scheduling_info: SchedulingInfo = scheduler.schedule(
        flashcard.stability,
        flashcard.difficulty,
        flashcard.state,
        elapsed_days,
        rating,
    );

    let lapses_increment = if rating == 1 { 1 } else { 0 };
    let state_before = flashcard.state;

    sqlx::query!(
        r#"
        UPDATE flashcards
        SET stability = ?,
            difficulty = ?,
            due = ?,
            scheduled_days = ?,
            elapsed_days = ?,
            reps = reps + 1,
            lapses = lapses + ?,
            state = ?,
            last_review = ?,
            updated_at = ?
        WHERE id = ?
        "#,
        scheduling_info.new_stability,
        scheduling_info.new_difficulty,
        scheduling_info.next_due,
        scheduling_info.interval,
        elapsed_days,
        lapses_increment,
        scheduling_info.new_state,
        now,
        now,
        flashcard_id
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to update flashcard: {}", e))?;

    let user_id = 1;
    sqlx::query!(
        r#"
        INSERT INTO review_history (
            flashcard_id, user_id, reviewed_at, rating,
            review_duration_ms, session_id,
            state_before, state_after
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        flashcard_id,
        user_id,
        now,
        rating,
        review_duration_ms,
        session_id,
        state_before,
        scheduling_info.new_state
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to insert review history: {}", e))?;

    // Track daily progress if filter is provided
    if let Some(filter) = filter {
        let today = now.format("%Y-%m-%d").to_string();
        let scope_type = filter.scope_type();
        let scope_id = filter.scope_id();

        // Determine if this was a new card or review card
        let is_new_card = state_before == 0;

        // Upsert progress tracking
        if is_new_card {
            sqlx::query!(
                r#"
                INSERT INTO daily_progress (
                    user_id, scope_type, scope_id, date,
                    new_cards_seen, review_cards_seen
                )
                VALUES (?, ?, ?, ?, 1, 0)
                ON CONFLICT(user_id, scope_type, scope_id, date)
                DO UPDATE SET
                    new_cards_seen = new_cards_seen + 1,
                    updated_at = datetime('now')
                "#,
                user_id,
                scope_type,
                scope_id,
                today
            )
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to update progress: {}", e))?;
        } else {
            sqlx::query!(
                r#"
                INSERT INTO daily_progress (
                    user_id, scope_type, scope_id, date,
                    new_cards_seen, review_cards_seen
                )
                VALUES (?, ?, ?, ?, 0, 1)
                ON CONFLICT(user_id, scope_type, scope_id, date)
                DO UPDATE SET
                    review_cards_seen = review_cards_seen + 1,
                    updated_at = datetime('now')
                "#,
                user_id,
                scope_type,
                scope_id,
                today
            )
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to update progress: {}", e))?;
        }
    }

    let updated_flashcard = sqlx::query_as!(
        Flashcard,
        r#"
        SELECT
            id as "id!",
            text_id as "text_id!",
            user_id as "user_id!",
            original_text,
            cloze_text,
            cloze_index as "cloze_index!",
            display_index as "display_index!",
            cloze_number as "cloze_number!",
            created_at as "created_at: _",
            updated_at as "updated_at: _",
            cloze_note_id,
            due as "due: _",
            stability as "stability!",
            difficulty as "difficulty!",
            elapsed_days as "elapsed_days!",
            scheduled_days as "scheduled_days!",
            reps as "reps!",
            lapses as "lapses!",
            state as "state!",
            last_review as "last_review: _"
        FROM flashcards
        WHERE id = ?
        "#,
        flashcard_id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch updated flashcard: {}", e))?;

    Ok(GradeResult {
        flashcard: updated_flashcard,
        interval_days: scheduling_info.interval,
        next_due: scheduling_info.next_due,
    })
}

#[tauri::command]
pub async fn get_review_stats(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<ReviewStats, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let now = Utc::now();

    let stats = sqlx::query!(
        r#"
        SELECT
            COUNT(CASE WHEN datetime(due) <= datetime(?) THEN 1 END) as "due_count!",
            COUNT(CASE WHEN state = 0 THEN 1 END) as "new_count!",
            COUNT(CASE WHEN state IN (1, 3) THEN 1 END) as "learning_count!",
            COUNT(CASE WHEN state = 2 THEN 1 END) as "review_count!"
        FROM flashcards
        "#,
        now
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch review stats: {}", e))?;

    Ok(ReviewStats {
        due_count: stats.due_count,
        new_count: stats.new_count,
        learning_count: stats.learning_count,
        review_count: stats.review_count,
    })
}

#[tauri::command]
pub async fn get_review_history_since(
    since: String,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<ReviewHistoryEntry>, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let since_dt = DateTime::parse_from_rfc3339(&since)
        .map_err(|e| format!("Invalid date format: {}", e))?
        .with_timezone(&Utc);

    let history = sqlx::query_as!(
        ReviewHistoryEntry,
        r#"
        SELECT
            id as "id!",
            flashcard_id as "flashcard_id!",
            user_id as "user_id!",
            reviewed_at as "reviewed_at: _",
            rating as "rating!",
            review_duration_ms,
            state_before as "state_before!",
            state_after as "state_after!"
        FROM review_history
        WHERE reviewed_at >= ?
        ORDER BY reviewed_at DESC
        "#,
        since_dt
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch review history: {}", e))?;

    Ok(history)
}

#[tauri::command]
pub async fn get_due_cards_filtered(
    filter: StudyFilter,
    limit: Option<i64>,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<Flashcard>, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let now = Utc::now();
    let user_id = 1i64;
    let today = now.format("%Y-%m-%d").to_string();

    let clamped_limit = limit.unwrap_or(20).clamp(1, 100);

    // Get study limits for this scope
    let study_limits_row = sqlx::query!(
        r#"
        SELECT
            id,
            user_id,
            daily_new_cards,
            daily_reviews,
            per_text_new_limit,
            per_text_review_limit,
            per_folder_new_limit,
            per_folder_review_limit,
            updated_at
        FROM study_limits
        WHERE user_id = ?
        "#,
        user_id
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to fetch study limits: {}", e))?;

    let study_limits = if let Some(row) = study_limits_row {
        let updated_at = DateTime::<Utc>::from_naive_utc_and_offset(row.updated_at, Utc);
        Some(StudyLimits {
            id: row.id.ok_or("Missing id")?,
            user_id: row.user_id.ok_or("Missing user_id")?,
            daily_new_cards: row.daily_new_cards,
            daily_reviews: row.daily_reviews,
            per_text_new_limit: row.per_text_new_limit,
            per_text_review_limit: row.per_text_review_limit,
            per_folder_new_limit: row.per_folder_new_limit,
            per_folder_review_limit: row.per_folder_review_limit,
            updated_at,
        })
    } else {
        None
    };

    let (new_limit, review_limit) = if let Some(limits) = study_limits {
        match &filter {
            StudyFilter::Global => (limits.daily_new_cards, limits.daily_reviews),
            StudyFilter::Text { .. } => (
                limits.per_text_new_limit.unwrap_or(limits.daily_new_cards),
                limits.per_text_review_limit.unwrap_or(limits.daily_reviews),
            ),
            StudyFilter::Folder { .. } => (
                limits.per_folder_new_limit.unwrap_or(limits.daily_new_cards),
                limits.per_folder_review_limit.unwrap_or(limits.daily_reviews),
            ),
        }
    } else {
        (20, 200)
    };

    // Get today's progress
    let scope_type = filter.scope_type();
    let scope_id = filter.scope_id();
    let progress = sqlx::query_as!(
        DailyProgress,
        r#"
        SELECT
            id as "id!",
            user_id as "user_id!",
            scope_type,
            scope_id,
            date,
            new_cards_seen as "new_cards_seen!",
            review_cards_seen as "review_cards_seen!"
        FROM daily_progress
        WHERE user_id = ? AND scope_type = ? AND scope_id IS ? AND date = ?
        "#,
        user_id,
        scope_type,
        scope_id,
        today
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to fetch progress: {}", e))?;

    let (new_seen, review_seen) = if let Some(p) = progress {
        (p.new_cards_seen, p.review_cards_seen)
    } else {
        (0, 0)
    };

    let new_remaining = (new_limit - new_seen).max(0);
    let review_remaining = (review_limit - review_seen).max(0);

    // Build the query based on filter type
    let flashcards = match filter {
        StudyFilter::Global => {
            // Query new cards (state = 0)
            let mut new_cards = sqlx::query_as!(
                Flashcard,
                r#"
                SELECT
                    id as "id!",
                    text_id as "text_id!",
                    user_id as "user_id!",
                    original_text,
                    cloze_text,
                    cloze_index as "cloze_index!",
                    display_index as "display_index!",
                    cloze_number as "cloze_number!",
                    created_at as "created_at: _",
                    updated_at as "updated_at: _",
                    cloze_note_id,
                    due as "due: _",
                    stability as "stability!",
                    difficulty as "difficulty!",
                    elapsed_days as "elapsed_days!",
                    scheduled_days as "scheduled_days!",
                    reps as "reps!",
                    lapses as "lapses!",
                    state as "state!",
                    last_review as "last_review: _"
                FROM flashcards
                WHERE datetime(due) <= datetime(?) AND state = 0
                ORDER BY datetime(due) ASC
                LIMIT ?
                "#,
                now,
                new_remaining
            )
            .fetch_all(pool)
            .await
            .map_err(|e| format!("Failed to fetch new cards: {}", e))?;

            // Query review cards (state != 0)
            let mut review_cards = sqlx::query_as!(
                Flashcard,
                r#"
                SELECT
                    id as "id!",
                    text_id as "text_id!",
                    user_id as "user_id!",
                    original_text,
                    cloze_text,
                    cloze_index as "cloze_index!",
                    display_index as "display_index!",
                    cloze_number as "cloze_number!",
                    created_at as "created_at: _",
                    updated_at as "updated_at: _",
                    cloze_note_id,
                    due as "due: _",
                    stability as "stability!",
                    difficulty as "difficulty!",
                    elapsed_days as "elapsed_days!",
                    scheduled_days as "scheduled_days!",
                    reps as "reps!",
                    lapses as "lapses!",
                    state as "state!",
                    last_review as "last_review: _"
                FROM flashcards
                WHERE datetime(due) <= datetime(?) AND state != 0
                ORDER BY datetime(due) ASC
                LIMIT ?
                "#,
                now,
                review_remaining
            )
            .fetch_all(pool)
            .await
            .map_err(|e| format!("Failed to fetch review cards: {}", e))?;

            new_cards.append(&mut review_cards);
            new_cards.sort_by(|a, b| a.due.cmp(&b.due));
            new_cards.into_iter().take(clamped_limit as usize).collect()
        }
        StudyFilter::Text { text_id } => {
            // Query new cards for specific text
            let mut new_cards = sqlx::query_as!(
                Flashcard,
                r#"
                SELECT
                    id as "id!",
                    text_id as "text_id!",
                    user_id as "user_id!",
                    original_text,
                    cloze_text,
                    cloze_index as "cloze_index!",
                    display_index as "display_index!",
                    cloze_number as "cloze_number!",
                    created_at as "created_at: _",
                    updated_at as "updated_at: _",
                    cloze_note_id,
                    due as "due: _",
                    stability as "stability!",
                    difficulty as "difficulty!",
                    elapsed_days as "elapsed_days!",
                    scheduled_days as "scheduled_days!",
                    reps as "reps!",
                    lapses as "lapses!",
                    state as "state!",
                    last_review as "last_review: _"
                FROM flashcards
                WHERE text_id = ? AND datetime(due) <= datetime(?) AND state = 0
                ORDER BY datetime(due) ASC
                LIMIT ?
                "#,
                text_id,
                now,
                new_remaining
            )
            .fetch_all(pool)
            .await
            .map_err(|e| format!("Failed to fetch new cards: {}", e))?;

            // Query review cards for specific text
            let mut review_cards = sqlx::query_as!(
                Flashcard,
                r#"
                SELECT
                    id as "id!",
                    text_id as "text_id!",
                    user_id as "user_id!",
                    original_text,
                    cloze_text,
                    cloze_index as "cloze_index!",
                    display_index as "display_index!",
                    cloze_number as "cloze_number!",
                    created_at as "created_at: _",
                    updated_at as "updated_at: _",
                    cloze_note_id,
                    due as "due: _",
                    stability as "stability!",
                    difficulty as "difficulty!",
                    elapsed_days as "elapsed_days!",
                    scheduled_days as "scheduled_days!",
                    reps as "reps!",
                    lapses as "lapses!",
                    state as "state!",
                    last_review as "last_review: _"
                FROM flashcards
                WHERE text_id = ? AND datetime(due) <= datetime(?) AND state != 0
                ORDER BY datetime(due) ASC
                LIMIT ?
                "#,
                text_id,
                now,
                review_remaining
            )
            .fetch_all(pool)
            .await
            .map_err(|e| format!("Failed to fetch review cards: {}", e))?;

            new_cards.append(&mut review_cards);
            new_cards.sort_by(|a, b| a.due.cmp(&b.due));
            new_cards.into_iter().take(clamped_limit as usize).collect()
        }
        StudyFilter::Folder { folder_id } => {
            // Query new cards with recursive folder tree
            let mut new_cards = sqlx::query_as!(
                Flashcard,
                r#"
                WITH RECURSIVE folder_tree AS (
                    SELECT id FROM folders WHERE id = ?
                    UNION ALL
                    SELECT f.id FROM folders f
                    INNER JOIN folder_tree ft ON f.parent_id = ft.id
                )
                SELECT
                    flashcards.id as "id!",
                    flashcards.text_id as "text_id!",
                    flashcards.user_id as "user_id!",
                    flashcards.original_text,
                    flashcards.cloze_text,
                    flashcards.cloze_index as "cloze_index!",
                    flashcards.display_index as "display_index!",
                    flashcards.cloze_number as "cloze_number!",
                    flashcards.created_at as "created_at: _",
                    flashcards.updated_at as "updated_at: _",
                    flashcards.cloze_note_id,
                    flashcards.due as "due: _",
                    flashcards.stability as "stability!",
                    flashcards.difficulty as "difficulty!",
                    flashcards.elapsed_days as "elapsed_days!",
                    flashcards.scheduled_days as "scheduled_days!",
                    flashcards.reps as "reps!",
                    flashcards.lapses as "lapses!",
                    flashcards.state as "state!",
                    flashcards.last_review as "last_review: _"
                FROM flashcards
                INNER JOIN texts ON flashcards.text_id = texts.id
                WHERE texts.folder_id IN (SELECT id FROM folder_tree)
                AND datetime(flashcards.due) <= datetime(?)
                AND flashcards.state = 0
                ORDER BY datetime(flashcards.due) ASC
                LIMIT ?
                "#,
                folder_id,
                now,
                new_remaining
            )
            .fetch_all(pool)
            .await
            .map_err(|e| format!("Failed to fetch new cards: {}", e))?;

            // Query review cards with recursive folder tree
            let mut review_cards = sqlx::query_as!(
                Flashcard,
                r#"
                WITH RECURSIVE folder_tree AS (
                    SELECT id FROM folders WHERE id = ?
                    UNION ALL
                    SELECT f.id FROM folders f
                    INNER JOIN folder_tree ft ON f.parent_id = ft.id
                )
                SELECT
                    flashcards.id as "id!",
                    flashcards.text_id as "text_id!",
                    flashcards.user_id as "user_id!",
                    flashcards.original_text,
                    flashcards.cloze_text,
                    flashcards.cloze_index as "cloze_index!",
                    flashcards.display_index as "display_index!",
                    flashcards.cloze_number as "cloze_number!",
                    flashcards.created_at as "created_at: _",
                    flashcards.updated_at as "updated_at: _",
                    flashcards.cloze_note_id,
                    flashcards.due as "due: _",
                    flashcards.stability as "stability!",
                    flashcards.difficulty as "difficulty!",
                    flashcards.elapsed_days as "elapsed_days!",
                    flashcards.scheduled_days as "scheduled_days!",
                    flashcards.reps as "reps!",
                    flashcards.lapses as "lapses!",
                    flashcards.state as "state!",
                    flashcards.last_review as "last_review: _"
                FROM flashcards
                INNER JOIN texts ON flashcards.text_id = texts.id
                WHERE texts.folder_id IN (SELECT id FROM folder_tree)
                AND datetime(flashcards.due) <= datetime(?)
                AND flashcards.state != 0
                ORDER BY datetime(flashcards.due) ASC
                LIMIT ?
                "#,
                folder_id,
                now,
                review_remaining
            )
            .fetch_all(pool)
            .await
            .map_err(|e| format!("Failed to fetch review cards: {}", e))?;

            new_cards.append(&mut review_cards);
            new_cards.sort_by(|a, b| a.due.cmp(&b.due));
            new_cards.into_iter().take(clamped_limit as usize).collect()
        }
    };

    Ok(flashcards)
}

#[tauri::command]
pub async fn get_limit_status(
    filter: StudyFilter,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<LimitStatus, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let now = Utc::now();
    let user_id = 1i64;
    let today = now.format("%Y-%m-%d").to_string();

    // Get study limits for this scope
    let study_limits_row = sqlx::query!(
        r#"
        SELECT
            id,
            user_id,
            daily_new_cards,
            daily_reviews,
            per_text_new_limit,
            per_text_review_limit,
            per_folder_new_limit,
            per_folder_review_limit,
            updated_at
        FROM study_limits
        WHERE user_id = ?
        "#,
        user_id
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to fetch study limits: {}", e))?;

    let study_limits = if let Some(row) = study_limits_row {
        let updated_at = DateTime::<Utc>::from_naive_utc_and_offset(row.updated_at, Utc);
        Some(StudyLimits {
            id: row.id.ok_or("Missing id")?,
            user_id: row.user_id.ok_or("Missing user_id")?,
            daily_new_cards: row.daily_new_cards,
            daily_reviews: row.daily_reviews,
            per_text_new_limit: row.per_text_new_limit,
            per_text_review_limit: row.per_text_review_limit,
            per_folder_new_limit: row.per_folder_new_limit,
            per_folder_review_limit: row.per_folder_review_limit,
            updated_at,
        })
    } else {
        None
    };

    let (new_limit, review_limit) = if let Some(limits) = study_limits {
        match &filter {
            StudyFilter::Global => (limits.daily_new_cards, limits.daily_reviews),
            StudyFilter::Text { .. } => (
                limits.per_text_new_limit.unwrap_or(limits.daily_new_cards),
                limits.per_text_review_limit.unwrap_or(limits.daily_reviews),
            ),
            StudyFilter::Folder { .. } => (
                limits.per_folder_new_limit.unwrap_or(limits.daily_new_cards),
                limits.per_folder_review_limit.unwrap_or(limits.daily_reviews),
            ),
        }
    } else {
        (20, 200)
    };

    // Get today's progress
    let scope_type = filter.scope_type();
    let scope_id = filter.scope_id();
    let progress = sqlx::query_as!(
        DailyProgress,
        r#"
        SELECT
            id as "id!",
            user_id as "user_id!",
            scope_type,
            scope_id,
            date,
            new_cards_seen as "new_cards_seen!",
            review_cards_seen as "review_cards_seen!"
        FROM daily_progress
        WHERE user_id = ? AND scope_type = ? AND scope_id IS ? AND date = ?
        "#,
        user_id,
        scope_type,
        scope_id,
        today
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to fetch progress: {}", e))?;

    let (new_seen, review_seen) = if let Some(p) = progress {
        (p.new_cards_seen, p.review_cards_seen)
    } else {
        (0, 0)
    };

    Ok(LimitStatus {
        new_cards_remaining: (new_limit - new_seen).max(0),
        review_cards_remaining: (review_limit - review_seen).max(0),
        new_cards_limit: new_limit,
        review_cards_limit: review_limit,
        new_cards_seen: new_seen,
        review_cards_seen: review_seen,
    })
}

#[tauri::command]
pub async fn get_review_stats_filtered(
    filter: StudyFilter,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<ReviewStats, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let now = Utc::now();

    let (due_count, new_count, learning_count, review_count) = match filter {
        StudyFilter::Global => {
            let row = sqlx::query!(
                r#"
                SELECT
                    COUNT(CASE WHEN datetime(due) <= datetime(?) THEN 1 END) as "due_count!",
                    COUNT(CASE WHEN state = 0 THEN 1 END) as "new_count!",
                    COUNT(CASE WHEN state IN (1, 3) THEN 1 END) as "learning_count!",
                    COUNT(CASE WHEN state = 2 THEN 1 END) as "review_count!"
                FROM flashcards
                "#,
                now
            )
            .fetch_one(pool)
            .await
            .map_err(|e| format!("Failed to fetch review stats: {}", e))?;
            (row.due_count, row.new_count, row.learning_count, row.review_count)
        }
        StudyFilter::Text { text_id } => {
            let row = sqlx::query!(
                r#"
                SELECT
                    COUNT(CASE WHEN datetime(due) <= datetime(?) THEN 1 END) as "due_count!",
                    COUNT(CASE WHEN state = 0 THEN 1 END) as "new_count!",
                    COUNT(CASE WHEN state IN (1, 3) THEN 1 END) as "learning_count!",
                    COUNT(CASE WHEN state = 2 THEN 1 END) as "review_count!"
                FROM flashcards
                WHERE text_id = ?
                "#,
                now,
                text_id
            )
            .fetch_one(pool)
            .await
            .map_err(|e| format!("Failed to fetch review stats: {}", e))?;
            (row.due_count, row.new_count, row.learning_count, row.review_count)
        }
        StudyFilter::Folder { folder_id } => {
            let row = sqlx::query!(
                r#"
                WITH RECURSIVE folder_tree AS (
                    SELECT id FROM folders WHERE id = ?
                    UNION ALL
                    SELECT f.id FROM folders f
                    INNER JOIN folder_tree ft ON f.parent_id = ft.id
                )
                SELECT
                    COUNT(CASE WHEN datetime(flashcards.due) <= datetime(?) THEN 1 END) as "due_count!",
                    COUNT(CASE WHEN flashcards.state = 0 THEN 1 END) as "new_count!",
                    COUNT(CASE WHEN flashcards.state IN (1, 3) THEN 1 END) as "learning_count!",
                    COUNT(CASE WHEN flashcards.state = 2 THEN 1 END) as "review_count!"
                FROM flashcards
                INNER JOIN texts ON flashcards.text_id = texts.id
                WHERE texts.folder_id IN (SELECT id FROM folder_tree)
                "#,
                folder_id,
                now
            )
            .fetch_one(pool)
            .await
            .map_err(|e| format!("Failed to fetch review stats: {}", e))?;
            (row.due_count, row.new_count, row.learning_count, row.review_count)
        }
    };

    Ok(ReviewStats {
        due_count,
        new_count,
        learning_count,
        review_count,
    })
}

#[tauri::command]
pub async fn get_study_limits(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<StudyLimits, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let user_id = 1i64;

    let limits = sqlx::query!(
        r#"
        SELECT
            id,
            user_id,
            daily_new_cards,
            daily_reviews,
            per_text_new_limit,
            per_text_review_limit,
            per_folder_new_limit,
            per_folder_review_limit,
            updated_at
        FROM study_limits
        WHERE user_id = ?
        "#,
        user_id
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to fetch study limits: {}", e))?;

    if let Some(row) = limits {
        let updated_at = DateTime::<Utc>::from_naive_utc_and_offset(row.updated_at, Utc);
        Ok(StudyLimits {
            id: row.id.ok_or("Missing id")?,
            user_id: row.user_id.ok_or("Missing user_id")?,
            daily_new_cards: row.daily_new_cards,
            daily_reviews: row.daily_reviews,
            per_text_new_limit: row.per_text_new_limit,
            per_text_review_limit: row.per_text_review_limit,
            per_folder_new_limit: row.per_folder_new_limit,
            per_folder_review_limit: row.per_folder_review_limit,
            updated_at,
        })
    } else {
        // Return defaults if not found
        Ok(StudyLimits {
            id: 0,
            user_id,
            daily_new_cards: 20,
            daily_reviews: 200,
            per_text_new_limit: None,
            per_text_review_limit: None,
            per_folder_new_limit: None,
            per_folder_review_limit: None,
            updated_at: Utc::now(),
        })
    }
}

#[tauri::command]
pub async fn update_study_limits(
    daily_new_cards: Option<i64>,
    daily_reviews: Option<i64>,
    per_text_new_limit: Option<i64>,
    per_text_review_limit: Option<i64>,
    per_folder_new_limit: Option<i64>,
    per_folder_review_limit: Option<i64>,
    db_state: State<'_, Arc<Mutex<Database>>>,
) -> Result<StudyLimits, String> {
    let db = db_state.lock().await;
    let pool = db.pool();
    let user_id = 1i64;
    let now = Utc::now();

    // Check if limits exist
    let existing = sqlx::query!(
        r#"SELECT id FROM study_limits WHERE user_id = ?"#,
        user_id
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to check existing limits: {}", e))?;

    if existing.is_some() {
        // Update existing
        sqlx::query!(
            r#"
            UPDATE study_limits
            SET daily_new_cards = COALESCE(?, daily_new_cards),
                daily_reviews = COALESCE(?, daily_reviews),
                per_text_new_limit = COALESCE(?, per_text_new_limit),
                per_text_review_limit = COALESCE(?, per_text_review_limit),
                per_folder_new_limit = COALESCE(?, per_folder_new_limit),
                per_folder_review_limit = COALESCE(?, per_folder_review_limit),
                updated_at = ?
            WHERE user_id = ?
            "#,
            daily_new_cards,
            daily_reviews,
            per_text_new_limit,
            per_text_review_limit,
            per_folder_new_limit,
            per_folder_review_limit,
            now,
            user_id
        )
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to update study limits: {}", e))?;
    } else {
        // Insert new
        let default_new_cards = daily_new_cards.unwrap_or(20);
        let default_reviews = daily_reviews.unwrap_or(200);
        sqlx::query!(
            r#"
            INSERT INTO study_limits (
                user_id, daily_new_cards, daily_reviews,
                per_text_new_limit, per_text_review_limit,
                per_folder_new_limit, per_folder_review_limit,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            user_id,
            default_new_cards,
            default_reviews,
            per_text_new_limit,
            per_text_review_limit,
            per_folder_new_limit,
            per_folder_review_limit,
            now
        )
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to insert study limits: {}", e))?;
    }

    // Fetch and return updated limits
    drop(db);
    get_study_limits(db_state).await
}
