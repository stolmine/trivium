use crate::db::Database;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DateRange {
    pub earliest: Option<DateTime<Utc>>,
    pub latest: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct FlashcardWithTextInfo {
    pub id: i64,
    pub text_id: i64,
    pub user_id: i64,
    pub original_text: String,
    pub cloze_text: String,
    pub cloze_index: i64,
    pub display_index: i64,
    pub cloze_number: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub cloze_note_id: Option<i64>,
    pub due: DateTime<Utc>,
    pub stability: f64,
    pub difficulty: f64,
    pub elapsed_days: i64,
    pub scheduled_days: i64,
    pub reps: i64,
    pub lapses: i64,
    pub state: i64,
    pub last_review: Option<DateTime<Utc>>,
    pub buried_until: Option<DateTime<Utc>>,
    pub text_title: String,
    pub text_folder_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FlashcardsPage {
    pub flashcards: Vec<FlashcardWithTextInfo>,
    pub total_count: i64,
    pub offset: i64,
    pub limit: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlashcardFilter {
    pub text_id: Option<i64>,
    pub folder_id: Option<String>,
    pub state: Option<Vec<i64>>,
    pub due_before: Option<DateTime<Utc>>,
    pub due_after: Option<DateTime<Utc>>,
    pub created_before: Option<DateTime<Utc>>,
    pub created_after: Option<DateTime<Utc>>,
    pub min_reps: Option<i64>,
    pub max_reps: Option<i64>,
    pub min_difficulty: Option<f64>,
    pub max_difficulty: Option<f64>,
    pub search_text: Option<String>,
    pub is_buried: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SortField {
    pub column: String,
    pub direction: String,
}

#[tauri::command]
pub async fn get_all_flashcards_paginated(
    filter: FlashcardFilter,
    sort: Vec<SortField>,
    offset: i64,
    limit: i64,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<FlashcardsPage, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let now = Utc::now();

    let mut where_clauses = Vec::new();
    let mut params: Vec<String> = Vec::new();

    if let Some(text_id) = filter.text_id {
        where_clauses.push("f.text_id = ?".to_string());
        params.push(text_id.to_string());
    }

    if let Some(folder_id) = filter.folder_id {
        where_clauses.push("t.folder_id = ?".to_string());
        params.push(folder_id);
    }

    if let Some(states) = &filter.state {
        if !states.is_empty() {
            let placeholders = states.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            where_clauses.push(format!("f.state IN ({})", placeholders));
            for state in states {
                params.push(state.to_string());
            }
        }
    }

    if let Some(due_before) = filter.due_before {
        where_clauses.push("f.due <= ?".to_string());
        params.push(due_before.to_rfc3339());
    }

    if let Some(due_after) = filter.due_after {
        where_clauses.push("f.due >= ?".to_string());
        params.push(due_after.to_rfc3339());
    }

    if let Some(created_before) = filter.created_before {
        where_clauses.push("f.created_at <= ?".to_string());
        params.push(created_before.to_rfc3339());
    }

    if let Some(created_after) = filter.created_after {
        where_clauses.push("f.created_at >= ?".to_string());
        params.push(created_after.to_rfc3339());
    }

    if let Some(min_reps) = filter.min_reps {
        where_clauses.push("f.reps >= ?".to_string());
        params.push(min_reps.to_string());
    }

    if let Some(max_reps) = filter.max_reps {
        where_clauses.push("f.reps <= ?".to_string());
        params.push(max_reps.to_string());
    }

    if let Some(min_difficulty) = filter.min_difficulty {
        where_clauses.push("f.difficulty >= ?".to_string());
        params.push(min_difficulty.to_string());
    }

    if let Some(max_difficulty) = filter.max_difficulty {
        where_clauses.push("f.difficulty <= ?".to_string());
        params.push(max_difficulty.to_string());
    }

    if let Some(search_text) = &filter.search_text {
        if !search_text.trim().is_empty() {
            where_clauses.push("(f.cloze_text LIKE ? OR f.original_text LIKE ?)".to_string());
            let search_pattern = format!("%{}%", search_text);
            params.push(search_pattern.clone());
            params.push(search_pattern);
        }
    }

    if let Some(is_buried) = filter.is_buried {
        if is_buried {
            where_clauses.push("f.buried_until IS NOT NULL AND f.buried_until > ?".to_string());
            params.push(now.to_rfc3339());
        } else {
            where_clauses.push("(f.buried_until IS NULL OR f.buried_until <= ?)".to_string());
            params.push(now.to_rfc3339());
        }
    }

    let where_sql = if where_clauses.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", where_clauses.join(" AND "))
    };

    let mut order_clauses = Vec::new();
    for sort_field in &sort {
        let direction = if sort_field.direction == "desc" { "DESC" } else { "ASC" };
        let column = match sort_field.column.as_str() {
            "id" => "f.id",
            "textTitle" => "t.title",
            "clozeText" => "f.cloze_text",
            "originalText" => "f.original_text",
            "due" => "f.due",
            "reps" => "f.reps",
            "difficulty" => "f.difficulty",
            "stability" => "f.stability",
            "state" => "f.state",
            "createdAt" => "f.created_at",
            "lastReview" => "f.last_review",
            "lapses" => "f.lapses",
            "scheduledDays" => "f.scheduled_days",
            "buriedUntil" => "f.buried_until",
            _ => "f.id",
        };
        order_clauses.push(format!("{} {}", column, direction));
    }

    let order_sql = if order_clauses.is_empty() {
        "ORDER BY f.id DESC".to_string()
    } else {
        format!("ORDER BY {}", order_clauses.join(", "))
    };

    let count_query = format!(
        "SELECT COUNT(*) as count FROM flashcards f INNER JOIN texts t ON f.text_id = t.id {}",
        where_sql
    );

    let mut count_query_builder = sqlx::query_scalar(&count_query);
    for param in &params {
        count_query_builder = count_query_builder.bind(param);
    }

    let total_count: i64 = count_query_builder
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Failed to get flashcard count: {}", e))?;

    let flashcard_query = format!(
        r#"
        SELECT
            f.id,
            f.text_id,
            f.user_id,
            f.original_text,
            f.cloze_text,
            f.cloze_index,
            f.display_index,
            f.cloze_number,
            f.created_at,
            f.updated_at,
            f.cloze_note_id,
            f.due,
            f.stability,
            f.difficulty,
            f.elapsed_days,
            f.scheduled_days,
            f.reps,
            f.lapses,
            f.state,
            f.last_review,
            f.buried_until,
            t.title as text_title,
            t.folder_id as text_folder_id
        FROM flashcards f
        INNER JOIN texts t ON f.text_id = t.id
        {}
        {}
        LIMIT ? OFFSET ?
        "#,
        where_sql, order_sql
    );

    let mut query_builder = sqlx::query_as(&flashcard_query);
    for param in &params {
        query_builder = query_builder.bind(param);
    }
    query_builder = query_builder.bind(limit).bind(offset);

    let flashcards: Vec<FlashcardWithTextInfo> = query_builder
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch flashcards: {}", e))?;

    Ok(FlashcardsPage {
        flashcards,
        total_count,
        offset,
        limit,
    })
}

#[tauri::command]
pub async fn get_flashcard_date_range(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<DateRange, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let query = r#"
        SELECT
            MIN(created_at) as earliest,
            MAX(created_at) as latest
        FROM flashcards
    "#;

    let result: Option<(Option<DateTime<Utc>>, Option<DateTime<Utc>>)> = sqlx::query_as(query)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Failed to get flashcard date range: {}", e))?;

    let (earliest, latest) = result.unwrap_or((None, None));

    Ok(DateRange { earliest, latest })
}

#[tauri::command]
pub async fn batch_delete_flashcards(
    flashcard_ids: Vec<i64>,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<i64, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let mut deleted_count = 0i64;

    for flashcard_id in flashcard_ids {
        let result = sqlx::query("DELETE FROM flashcards WHERE id = ?")
            .bind(flashcard_id)
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to delete flashcard {}: {}", flashcard_id, e))?;

        deleted_count += result.rows_affected() as i64;
    }

    Ok(deleted_count)
}

#[derive(Debug, Clone, Serialize, FromRow)]
struct DuplicateSource {
    text_id: i64,
    user_id: i64,
    original_text: String,
    cloze_text: String,
    cloze_index: i64,
    display_index: i64,
    cloze_number: i64,
    cloze_note_id: Option<i64>,
}

#[tauri::command]
pub async fn duplicate_flashcards(
    flashcard_ids: Vec<i64>,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<FlashcardWithTextInfo>, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let now = Utc::now();

    let mut duplicated_flashcards = Vec::new();

    for flashcard_id in flashcard_ids {
        let source: DuplicateSource = sqlx::query_as(
            "SELECT text_id, user_id, original_text, cloze_text, cloze_index, display_index, cloze_number, cloze_note_id
             FROM flashcards WHERE id = ?"
        )
        .bind(flashcard_id)
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Failed to fetch flashcard {}: {}", flashcard_id, e))?;

        let result = sqlx::query(
            r#"
            INSERT INTO flashcards (
                text_id, user_id, original_text, cloze_text, cloze_index, display_index, cloze_number,
                created_at, updated_at, cloze_note_id, due, stability, difficulty, elapsed_days,
                scheduled_days, reps, lapses, state, last_review, buried_until
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(source.text_id)
        .bind(source.user_id)
        .bind(&source.original_text)
        .bind(&source.cloze_text)
        .bind(source.cloze_index)
        .bind(source.display_index)
        .bind(source.cloze_number)
        .bind(now)
        .bind(now)
        .bind(source.cloze_note_id)
        .bind(now)
        .bind(0.0)
        .bind(0.0)
        .bind(0)
        .bind(0)
        .bind(0)
        .bind(0)
        .bind(0)
        .bind(None::<DateTime<Utc>>)
        .bind(None::<DateTime<Utc>>)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to duplicate flashcard {}: {}", flashcard_id, e))?;

        let new_id = result.last_insert_rowid();

        let duplicated: FlashcardWithTextInfo = sqlx::query_as(
            r#"
            SELECT
                f.id, f.text_id, f.user_id, f.original_text, f.cloze_text, f.cloze_index,
                f.display_index, f.cloze_number, f.created_at, f.updated_at, f.cloze_note_id,
                f.due, f.stability, f.difficulty, f.elapsed_days, f.scheduled_days, f.reps,
                f.lapses, f.state, f.last_review, f.buried_until,
                t.title as text_title,
                t.folder_id as text_folder_id
            FROM flashcards f
            INNER JOIN texts t ON f.text_id = t.id
            WHERE f.id = ?
            "#
        )
        .bind(new_id)
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Failed to fetch duplicated flashcard: {}", e))?;

        duplicated_flashcards.push(duplicated);
    }

    Ok(duplicated_flashcards)
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlashcardBatchUpdate {
    pub id: i64,
    pub field: String,
    pub value: serde_json::Value,
}

#[tauri::command]
pub async fn batch_update_flashcards(
    updates: Vec<FlashcardBatchUpdate>,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<FlashcardWithTextInfo>, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let now = Utc::now();

    let mut updated_ids = Vec::new();

    for update in updates {
        match update.field.as_str() {
            "buriedUntil" => {
                let value_str = update.value.as_str().ok_or("Invalid buriedUntil value")?;
                if value_str.is_empty() {
                    sqlx::query("UPDATE flashcards SET buried_until = NULL, updated_at = ? WHERE id = ?")
                        .bind(now)
                        .bind(update.id)
                        .execute(pool)
                        .await
                        .map_err(|e| format!("Failed to update flashcard {}: {}", update.id, e))?;
                } else {
                    let date_value = DateTime::parse_from_rfc3339(value_str)
                        .map_err(|e| format!("Invalid date format: {}", e))?
                        .with_timezone(&Utc);
                    sqlx::query("UPDATE flashcards SET buried_until = ?, updated_at = ? WHERE id = ?")
                        .bind(date_value)
                        .bind(now)
                        .bind(update.id)
                        .execute(pool)
                        .await
                        .map_err(|e| format!("Failed to update flashcard {}: {}", update.id, e))?;
                }
            }
            "resetStats" => {
                sqlx::query(
                    "UPDATE flashcards SET stability = 0.0, difficulty = 0.0, reps = 0, lapses = 0,
                     state = 0, last_review = NULL, elapsed_days = 0, scheduled_days = 0,
                     due = ?, updated_at = ? WHERE id = ?"
                )
                .bind(now)
                .bind(now)
                .bind(update.id)
                .execute(pool)
                .await
                .map_err(|e| format!("Failed to reset stats for flashcard {}: {}", update.id, e))?;
            }
            "state" => {
                let state_value = update.value.as_i64().ok_or("Invalid state value")?;
                sqlx::query("UPDATE flashcards SET state = ?, updated_at = ? WHERE id = ?")
                    .bind(state_value)
                    .bind(now)
                    .bind(update.id)
                    .execute(pool)
                    .await
                    .map_err(|e| format!("Failed to update flashcard {}: {}", update.id, e))?;
            }
            _ => return Err(format!("Unsupported field: {}", update.field)),
        };

        updated_ids.push(update.id);
    }

    if updated_ids.is_empty() {
        return Ok(Vec::new());
    }

    let placeholders = updated_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let query = format!(
        r#"
        SELECT
            f.id, f.text_id, f.user_id, f.original_text, f.cloze_text, f.cloze_index,
            f.display_index, f.cloze_number, f.created_at, f.updated_at, f.cloze_note_id,
            f.due, f.stability, f.difficulty, f.elapsed_days, f.scheduled_days, f.reps,
            f.lapses, f.state, f.last_review, f.buried_until,
            t.title as text_title,
            t.folder_id as text_folder_id
        FROM flashcards f
        INNER JOIN texts t ON f.text_id = t.id
        WHERE f.id IN ({})
        "#,
        placeholders
    );

    let mut query_builder = sqlx::query_as(&query);
    for id in &updated_ids {
        query_builder = query_builder.bind(id);
    }

    let updated_flashcards: Vec<FlashcardWithTextInfo> = query_builder
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch updated flashcards: {}", e))?;

    Ok(updated_flashcards)
}
