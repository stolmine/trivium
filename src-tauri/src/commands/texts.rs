// Text ingestion commands
//
// Tauri commands for ingesting texts from various sources:
// - Paste text directly
// - Import from Wikipedia
// - Load from files
//
// These commands handle storing texts in the database and returning
// metadata for the frontend to display.

use crate::db::Database;
use crate::models::text::{CreateTextRequest, Text};
use crate::services::parser::{detect_paragraphs, store_paragraphs};
use chrono::Utc;
use serde::Serialize;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn create_text(
    request: CreateTextRequest,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Text, String> {
    let db = db.lock().await;
    let pool = db.pool();

    // Use UTF-16 code units to match JavaScript's string.length
    let content_length = request.content.encode_utf16().count() as i64;
    let now = Utc::now();

    let result = sqlx::query!(
        r#"
        INSERT INTO texts (
            title, source, source_url, content, content_length,
            ingested_at, updated_at, metadata,
            author, publication_date, publisher, access_date, doi, isbn, folder_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        request.title,
        request.source,
        request.source_url,
        request.content,
        content_length,
        now,
        now,
        request.metadata,
        request.author,
        request.publication_date,
        request.publisher,
        request.access_date,
        request.doi,
        request.isbn,
        request.folder_id
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to insert text: {}", e))?;

    let text_id = result.last_insert_rowid();

    let paragraphs = detect_paragraphs(&request.content);
    store_paragraphs(pool, text_id, &paragraphs)
        .await
        .map_err(|e| format!("Failed to store paragraphs: {}", e))?;

    let text = sqlx::query_as!(
        Text,
        r#"
        SELECT
            id as "id!", title, source, source_url, content, content_length as "content_length!",
            ingested_at as "ingested_at: _", updated_at as "updated_at: _",
            metadata, author, publication_date, publisher, access_date, doi, isbn, folder_id
        FROM texts
        WHERE id = ?
        "#,
        text_id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch created text: {}", e))?;

    Ok(text)
}

#[tauri::command]
pub async fn list_texts(db: State<'_, Arc<Mutex<Database>>>) -> Result<Vec<Text>, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let texts = sqlx::query_as!(
        Text,
        r#"
        SELECT
            id as "id!", title, source, source_url, content, content_length as "content_length!",
            ingested_at as "ingested_at: _", updated_at as "updated_at: _",
            metadata, author, publication_date, publisher, access_date, doi, isbn, folder_id
        FROM texts
        ORDER BY ingested_at DESC
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch texts: {}", e))?;

    Ok(texts)
}

#[tauri::command]
pub async fn get_texts_with_available_marks(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<Text>, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let texts = sqlx::query_as!(
        Text,
        r#"
        SELECT DISTINCT
            t.id as "id!",
            t.title,
            t.source,
            t.source_url,
            t.content,
            t.content_length as "content_length!",
            t.ingested_at as "ingested_at: _",
            t.updated_at as "updated_at: _",
            t.metadata,
            t.author,
            t.publication_date,
            t.publisher,
            t.access_date,
            t.doi,
            t.isbn,
            t.folder_id
        FROM texts t
        INNER JOIN cloze_notes cn ON cn.text_id = t.id
        WHERE cn.status IN ('pending', 'skipped')
          AND (SELECT COUNT(*) FROM flashcards WHERE cloze_note_id = cn.id) = 0
        ORDER BY t.ingested_at DESC
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch texts with available marks: {}", e))?;

    Ok(texts)
}

#[tauri::command]
pub async fn get_text(
    id: i64,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Text, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let text = sqlx::query_as!(
        Text,
        r#"
        SELECT
            id as "id!", title, source, source_url, content, content_length as "content_length!",
            ingested_at as "ingested_at: _", updated_at as "updated_at: _",
            metadata, author, publication_date, publisher, access_date, doi, isbn, folder_id
        FROM texts
        WHERE id = ?
        "#,
        id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch text: {}", e))?;

    Ok(text)
}

#[tauri::command]
pub async fn rename_text(
    id: i64,
    title: String,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<(), String> {
    let db = db.lock().await;
    let pool = db.pool();
    let now = Utc::now();

    sqlx::query!(
        r#"
        UPDATE texts
        SET title = ?, updated_at = ?
        WHERE id = ?
        "#,
        title,
        now,
        id
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to rename text: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_text(
    id: i64,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<(), String> {
    let db = db.lock().await;
    let pool = db.pool();

    sqlx::query!(
        r#"
        DELETE FROM texts
        WHERE id = ?
        "#,
        id
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to delete text: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn update_text_content(
    text_id: i64,
    new_content: String,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<(), String> {
    let db = db.lock().await;
    let pool = db.pool();
    let now = Utc::now();

    let new_length = new_content.encode_utf16().count() as i64;

    sqlx::query!(
        "UPDATE texts SET content = ?, content_length = ?, updated_at = ? WHERE id = ?",
        new_content,
        new_length,
        now,
        text_id
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to update text content: {}", e))?;

    sqlx::query!(
        r#"
        UPDATE cloze_notes
        SET status = 'needs_review',
            notes = 'Text was edited - please verify mark',
            updated_at = ?
        WHERE text_id = ?
          AND status NOT IN ('buried', 'converted')
        "#,
        now,
        text_id
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to update marks: {}", e))?;

    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateResult {
    pub updated_marks: Vec<i64>,
    pub flagged_marks: Vec<i64>,
    pub unchanged_marks: Vec<i64>,
}

#[derive(sqlx::FromRow)]
struct ClozeNoteMark {
    id: i64,
    start_position: Option<i64>,
    end_position: Option<i64>,
}

#[tauri::command]
pub async fn update_text_with_smart_marks(
    text_id: i64,
    edit_start: i64,
    edit_end: i64,
    new_content: String,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<UpdateResult, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let now = Utc::now();

    if edit_start < 0 || edit_end < edit_start {
        return Err("Invalid edit positions: edit_start must be non-negative and edit_end must be >= edit_start".to_string());
    }

    let original_text = sqlx::query!(
        "SELECT content_length FROM texts WHERE id = ?",
        text_id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch original text: {}", e))?;

    let original_content_length = original_text.content_length;

    if edit_end > original_content_length {
        return Err(format!("Invalid edit_end position: {} exceeds original content length: {}", edit_end, original_content_length));
    }

    let new_content_length = new_content.encode_utf16().count() as i64;
    let length_delta = new_content_length - original_content_length;

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    let marks = sqlx::query_as::<_, ClozeNoteMark>(
        r#"
        SELECT id, start_position, end_position
        FROM cloze_notes
        WHERE text_id = ?
          AND status NOT IN ('buried', 'converted')
        "#
    )
    .bind(text_id)
    .fetch_all(&mut *tx)
    .await
    .map_err(|e| format!("Failed to fetch marks: {}", e))?;

    let mut updated_marks = Vec::new();
    let mut flagged_marks = Vec::new();
    let mut unchanged_marks = Vec::new();

    for mark in marks {
        match (mark.start_position, mark.end_position) {
            (Some(start_pos), Some(end_pos)) => {
                if end_pos <= edit_start {
                    unchanged_marks.push(mark.id);
                } else if start_pos >= edit_end {
                    let new_start = start_pos + length_delta;
                    let new_end = end_pos + length_delta;

                    if new_start < 0 || new_end < 0 || new_end > new_content_length {
                        sqlx::query!(
                            r#"
                            UPDATE cloze_notes
                            SET status = 'needs_review',
                                notes = 'Text edited: mark position became invalid',
                                updated_at = ?
                            WHERE id = ?
                            "#,
                            now,
                            mark.id
                        )
                        .execute(&mut *tx)
                        .await
                        .map_err(|e| format!("Failed to flag mark {}: {}", mark.id, e))?;

                        flagged_marks.push(mark.id);
                    } else {
                        sqlx::query!(
                            r#"
                            UPDATE cloze_notes
                            SET start_position = ?,
                                end_position = ?,
                                updated_at = ?
                            WHERE id = ?
                            "#,
                            new_start,
                            new_end,
                            now,
                            mark.id
                        )
                        .execute(&mut *tx)
                        .await
                        .map_err(|e| format!("Failed to update mark {}: {}", mark.id, e))?;

                        updated_marks.push(mark.id);
                    }
                } else {
                    sqlx::query!(
                        r#"
                        UPDATE cloze_notes
                        SET status = 'needs_review',
                            notes = 'Text edited in marked region',
                            updated_at = ?
                        WHERE id = ?
                        "#,
                        now,
                        mark.id
                    )
                    .execute(&mut *tx)
                    .await
                    .map_err(|e| format!("Failed to flag overlapping mark {}: {}", mark.id, e))?;

                    flagged_marks.push(mark.id);
                }
            }
            _ => {
                sqlx::query!(
                    r#"
                    UPDATE cloze_notes
                    SET status = 'needs_review',
                        notes = 'Text was edited - please verify mark',
                        updated_at = ?
                    WHERE id = ?
                    "#,
                    now,
                    mark.id
                )
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("Failed to flag mark {} with missing positions: {}", mark.id, e))?;

                flagged_marks.push(mark.id);
            }
        }
    }

    sqlx::query!(
        r#"
        UPDATE texts
        SET content = ?,
            content_length = ?,
            updated_at = ?
        WHERE id = ?
        "#,
        new_content,
        new_content_length,
        now,
        text_id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to update text content: {}", e))?;

    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(UpdateResult {
        updated_marks,
        flagged_marks,
        unchanged_marks,
    })
}
