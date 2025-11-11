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
use crate::models::paragraph::Paragraph;
use crate::models::read_range::ReadRange;
use crate::models::text::{CreateTextRequest, Text};
use crate::services::parser::{detect_paragraphs, store_paragraphs};
use crate::services::range_calculator::RangeCalculator;
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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteMarksResult {
    pub deleted_count: usize,
    pub mark_ids: Vec<i64>,
}

#[tauri::command]
pub async fn delete_marks(
    mark_ids: Vec<i64>,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<DeleteMarksResult, String> {
    let db = db.lock().await;
    let pool = db.pool();

    if mark_ids.is_empty() {
        return Ok(DeleteMarksResult {
            deleted_count: 0,
            mark_ids: vec![],
        });
    }

    // Build SQL with placeholders for IN clause
    let placeholders = mark_ids.iter()
        .map(|_| "?")
        .collect::<Vec<_>>()
        .join(",");

    let query_str = format!(
        "DELETE FROM cloze_notes WHERE id IN ({})",
        placeholders
    );

    // Execute with transaction
    let mut tx = pool.begin().await
        .map_err(|e| format!("Transaction error: {}", e))?;

    let mut query = sqlx::query(&query_str);
    for id in &mark_ids {
        query = query.bind(id);
    }

    let result = query.execute(&mut *tx).await
        .map_err(|e| format!("Delete error: {}", e))?;

    tx.commit().await
        .map_err(|e| format!("Commit error: {}", e))?;

    Ok(DeleteMarksResult {
        deleted_count: result.rows_affected() as usize,
        mark_ids: mark_ids.clone(),
    })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteReadRangesResult {
    pub deleted_count: usize,
}

#[tauri::command]
pub async fn delete_read_ranges(
    text_id: i64,
    ranges: Vec<(i64, i64)>,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<DeleteReadRangesResult, String> {
    let db = db.lock().await;
    let pool = db.pool();

    if ranges.is_empty() {
        return Ok(DeleteReadRangesResult {
            deleted_count: 0,
        });
    }

    let mut tx = pool.begin().await
        .map_err(|e| format!("Transaction error: {}", e))?;

    let mut deleted_count = 0;

    for (start_pos, end_pos) in ranges {
        let result = sqlx::query(
            "DELETE FROM read_ranges
             WHERE text_id = ? AND start_position = ? AND end_position = ?"
        )
        .bind(text_id)
        .bind(start_pos)
        .bind(end_pos)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Delete error: {}", e))?;

        deleted_count += result.rows_affected() as usize;
    }

    tx.commit().await
        .map_err(|e| format!("Commit error: {}", e))?;

    Ok(DeleteReadRangesResult {
        deleted_count,
    })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SmartExcerpt {
    pub text_id: i64,
    pub excerpt: String,
    pub start_pos: i64,
    pub end_pos: i64,
    pub current_position: i64,
    pub total_length: i64,
    pub read_ranges: Vec<ReadRange>,
    pub excerpt_type: String,
}

#[tauri::command]
pub async fn get_smart_excerpt(
    text_id: i64,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<SmartExcerpt, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let user_id = 1;

    let text = sqlx::query!(
        r#"
        SELECT id as "id!", content, content_length as "content_length!"
        FROM texts
        WHERE id = ?
        "#,
        text_id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch text: {}", e))?;

    let total_length = text.content_length;

    if total_length == 0 {
        return Ok(SmartExcerpt {
            text_id,
            excerpt: String::new(),
            start_pos: 0,
            end_pos: 0,
            current_position: 0,
            total_length: 0,
            read_ranges: vec![],
            excerpt_type: "beginning".to_string(),
        });
    }

    let read_ranges = sqlx::query_as!(
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

    let current_position = read_ranges
        .iter()
        .map(|r| r.end_position)
        .max()
        .unwrap_or(0);

    let unread_ranges = RangeCalculator::get_unread_ranges(total_length, read_ranges.clone());

    let (excerpt_start, excerpt_type) = if !unread_ranges.is_empty() {
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

        let first_unread_para = paragraphs.iter().find(|p| {
            unread_ranges
                .iter()
                .any(|(start, end)| p.start_position >= *start && p.start_position < *end)
        });

        match first_unread_para {
            Some(para) => (para.start_position, "unread"),
            None => {
                if current_position > 0 {
                    (current_position.saturating_sub(250).max(0), "current")
                } else {
                    (0, "beginning")
                }
            }
        }
    } else if current_position > 0 {
        (current_position.saturating_sub(250).max(0), "current")
    } else {
        (0, "beginning")
    };

    let utf16_units: Vec<u16> = text.content.encode_utf16().collect();
    let excerpt_start_usize = excerpt_start as usize;

    if excerpt_start_usize >= utf16_units.len() {
        return Ok(SmartExcerpt {
            text_id,
            excerpt: String::new(),
            start_pos: total_length,
            end_pos: total_length,
            current_position,
            total_length,
            read_ranges,
            excerpt_type: excerpt_type.to_string(),
        });
    }

    let target_length = 500;
    let mut excerpt_end_usize = (excerpt_start_usize + target_length).min(utf16_units.len());

    if excerpt_end_usize < utf16_units.len() {
        let search_start = (excerpt_end_usize.saturating_sub(50)).max(excerpt_start_usize);
        let search_end = (excerpt_end_usize + 50).min(utf16_units.len());

        let excerpt_slice: Vec<u16> = utf16_units[search_start..search_end].to_vec();
        if let Ok(excerpt_str) = String::from_utf16(&excerpt_slice) {
            let relative_pos = excerpt_end_usize - search_start;

            if let Some(newline_pos) = excerpt_str[..relative_pos.min(excerpt_str.len())]
                .rfind('\n')
            {
                let utf16_offset = excerpt_str[..newline_pos].encode_utf16().count();
                excerpt_end_usize = search_start + utf16_offset;
            } else if let Some(period_pos) = excerpt_str[..relative_pos.min(excerpt_str.len())]
                .rfind(". ")
            {
                let utf16_offset = excerpt_str[..period_pos + 1].encode_utf16().count();
                excerpt_end_usize = search_start + utf16_offset;
            }
        }
    }

    excerpt_end_usize = excerpt_end_usize
        .max(excerpt_start_usize)
        .min(utf16_units.len());

    let excerpt_slice: Vec<u16> = utf16_units[excerpt_start_usize..excerpt_end_usize].to_vec();
    let excerpt = String::from_utf16(&excerpt_slice)
        .map_err(|e| format!("Failed to decode excerpt: {}", e))?;

    Ok(SmartExcerpt {
        text_id,
        excerpt: excerpt.trim().to_string(),
        start_pos: excerpt_start,
        end_pos: excerpt_end_usize as i64,
        current_position,
        total_length,
        read_ranges,
        excerpt_type: excerpt_type.to_string(),
    })
}
