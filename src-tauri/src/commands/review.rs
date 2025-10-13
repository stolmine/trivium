use crate::db::Database;
use crate::models::flashcard::Flashcard;
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
        WHERE due <= ?
        ORDER BY due ASC
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
            state_before, state_after
        )
        VALUES (?, ?, ?, ?, ?, ?)
        "#,
        flashcard_id,
        user_id,
        now,
        rating,
        state_before,
        scheduling_info.new_state
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to insert review history: {}", e))?;

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
            COUNT(CASE WHEN due <= ? THEN 1 END) as "due_count!",
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
