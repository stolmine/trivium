use crate::db::Database;
use crate::models::paragraph::Paragraph;
use crate::models::read_range::ReadRange;
use crate::services::parser;
use crate::services::range_calculator::RangeCalculator;
use chrono::Utc;
use serde::Deserialize;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartSessionRequest {
    pub session_id: String,
    pub text_id: i64,
    pub start_position: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EndSessionRequest {
    pub session_id: String,
    pub end_position: i64,
    pub duration_seconds: i64,
}

#[tauri::command]
pub async fn mark_range_as_read(
    text_id: i64,
    start_pos: i64,
    end_pos: i64,
    session_id: Option<String>,
    character_count: Option<i64>,
    word_count: Option<i64>,
    is_auto_completed: Option<bool>,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<(), String> {
    let db = db.lock().await;
    let pool = db.pool();
    let now = Utc::now();
    let user_id = 1;
    let is_auto_completed = is_auto_completed.unwrap_or(false);

    sqlx::query!(
        r#"
        INSERT INTO read_ranges (
            text_id, user_id, start_position, end_position, marked_at,
            session_id, character_count, word_count, is_auto_completed
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        text_id,
        user_id,
        start_pos,
        end_pos,
        now,
        session_id,
        character_count,
        word_count,
        is_auto_completed
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to insert read range: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_read_ranges(
    text_id: i64,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<ReadRange>, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let user_id = 1;

    let ranges = sqlx::query_as!(
        ReadRange,
        r#"
        SELECT
            id as "id!",
            text_id as "text_id!",
            user_id as "user_id!",
            start_position as "start_position!",
            end_position as "end_position!",
            marked_at as "marked_at: _",
            is_auto_completed as "is_auto_completed: bool"
        FROM read_ranges
        WHERE text_id = ? AND user_id = ?
        ORDER BY start_position ASC
        "#,
        text_id,
        user_id
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch read ranges: {}", e))?;

    Ok(ranges)
}

#[tauri::command]
pub async fn calculate_text_progress(
    text_id: i64,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<f64, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let user_id = 1;

    let text_result = sqlx::query!(
        r#"
        SELECT content_length, content
        FROM texts
        WHERE id = ?
        "#,
        text_id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch text: {}", e))?;

    let total_chars = text_result.content_length;
    let excluded_chars = parser::calculate_excluded_character_count(&text_result.content);
    let header_chars = parser::calculate_header_character_count(&text_result.content);
    let countable_chars = total_chars - excluded_chars - header_chars;

    if countable_chars <= 0 {
        return Ok(0.0);
    }

    let ranges = sqlx::query_as!(
        ReadRange,
        r#"
        SELECT
            id as "id!",
            text_id as "text_id!",
            user_id as "user_id!",
            start_position as "start_position!",
            end_position as "end_position!",
            marked_at as "marked_at: _",
            is_auto_completed as "is_auto_completed: bool"
        FROM read_ranges
        WHERE text_id = ? AND user_id = ?
        "#,
        text_id,
        user_id
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch read ranges: {}", e))?;

    let read_chars = RangeCalculator::calculate_read_characters(ranges);
    let progress = (read_chars as f64 / countable_chars as f64) * 100.0;

    Ok(progress)
}

#[tauri::command]
pub async fn get_paragraphs(
    text_id: i64,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<Paragraph>, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let paragraphs = sqlx::query_as!(
        Paragraph,
        r#"
        SELECT
            id as "id!",
            text_id as "text_id!",
            paragraph_index as "paragraph_index!",
            start_position as "start_position!",
            end_position as "end_position!",
            character_count as "character_count!",
            created_at as "created_at: _"
        FROM paragraphs
        WHERE text_id = ?
        ORDER BY paragraph_index ASC
        "#,
        text_id
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch paragraphs: {}", e))?;

    Ok(paragraphs)
}

#[tauri::command]
pub async fn get_next_unread_paragraph(
    text_id: i64,
    current_pos: i64,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Option<Paragraph>, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let user_id = 1;

    let paragraphs = sqlx::query_as!(
        Paragraph,
        r#"
        SELECT
            id as "id!",
            text_id as "text_id!",
            paragraph_index as "paragraph_index!",
            start_position as "start_position!",
            end_position as "end_position!",
            character_count as "character_count!",
            created_at as "created_at: _"
        FROM paragraphs
        WHERE text_id = ? AND start_position >= ?
        ORDER BY paragraph_index ASC
        "#,
        text_id,
        current_pos
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch paragraphs: {}", e))?;

    let ranges = sqlx::query_as!(
        ReadRange,
        r#"
        SELECT
            id as "id!",
            text_id as "text_id!",
            user_id as "user_id!",
            start_position as "start_position!",
            end_position as "end_position!",
            marked_at as "marked_at: _",
            is_auto_completed as "is_auto_completed: bool"
        FROM read_ranges
        WHERE text_id = ? AND user_id = ?
        "#,
        text_id,
        user_id
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch read ranges: {}", e))?;

    for paragraph in paragraphs {
        let is_read = RangeCalculator::is_position_read(paragraph.start_position, &ranges);
        if !is_read {
            return Ok(Some(paragraph));
        }
    }

    Ok(None)
}

#[tauri::command]
pub async fn get_previous_paragraph(
    text_id: i64,
    current_pos: i64,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Option<Paragraph>, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let paragraph = sqlx::query_as!(
        Paragraph,
        r#"
        SELECT
            id as "id!",
            text_id as "text_id!",
            paragraph_index as "paragraph_index!",
            start_position as "start_position!",
            end_position as "end_position!",
            character_count as "character_count!",
            created_at as "created_at: _"
        FROM paragraphs
        WHERE text_id = ? AND start_position < ?
        ORDER BY paragraph_index DESC
        LIMIT 1
        "#,
        text_id,
        current_pos
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to fetch paragraph: {}", e))?;

    Ok(paragraph)
}

#[tauri::command]
pub async fn get_most_recently_read_text(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Option<i64>, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let user_id = 1;

    let result = sqlx::query!(
        r#"
        SELECT text_id
        FROM read_ranges
        WHERE user_id = ?
        ORDER BY marked_at DESC
        LIMIT 1
        "#,
        user_id
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to fetch most recent read range: {}", e))?;

    Ok(result.map(|r| r.text_id))
}

#[tauri::command]
pub async fn unmark_range_as_read(
    text_id: i64,
    start_pos: i64,
    end_pos: i64,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<(), String> {
    let db = db.lock().await;
    let pool = db.pool();
    let user_id = 1;

    // Delete all read ranges that overlap with the selection
    // A range overlaps if: range.start < end_pos AND range.end > start_pos
    sqlx::query!(
        r#"
        DELETE FROM read_ranges
        WHERE text_id = ?
        AND user_id = ?
        AND start_position < ?
        AND end_position > ?
        "#,
        text_id,
        user_id,
        end_pos,
        start_pos
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to unmark read range: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn clear_read_progress(
    text_id: i64,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<(), String> {
    let db = db.lock().await;
    let pool = db.pool();
    let user_id = 1;

    sqlx::query!(
        r#"
        DELETE FROM read_ranges
        WHERE text_id = ? AND user_id = ?
        "#,
        text_id,
        user_id
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to clear read progress: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn start_reading_session(
    request: StartSessionRequest,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<(), String> {
    let db = db.lock().await;
    let pool = db.pool();
    let now = Utc::now();
    let user_id = 1;

    sqlx::query!(
        r#"
        INSERT INTO reading_sessions (
            id, text_id, user_id, started_at, start_position
        )
        VALUES (?, ?, ?, ?, ?)
        "#,
        request.session_id,
        request.text_id,
        user_id,
        now,
        request.start_position
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to start reading session: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn end_reading_session(
    request: EndSessionRequest,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<(), String> {
    let db = db.lock().await;
    let pool = db.pool();
    let now = Utc::now();

    sqlx::query!(
        r#"
        UPDATE reading_sessions
        SET ended_at = ?,
            end_position = ?,
            duration_seconds = ?
        WHERE id = ?
        "#,
        now,
        request.end_position,
        request.duration_seconds,
        request.session_id
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to end reading session: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_countable_length(
    text_id: i64,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<i64, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let text_result = sqlx::query!(
        r#"
        SELECT content_length, content
        FROM texts
        WHERE id = ?
        "#,
        text_id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch text: {}", e))?;

    let total_chars = text_result.content_length;
    let excluded_chars = parser::calculate_excluded_character_count(&text_result.content);
    let header_chars = parser::calculate_header_character_count(&text_result.content);
    let countable_chars = total_chars - excluded_chars - header_chars;

    Ok(countable_chars)
}
