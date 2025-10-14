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

    let content_length = request.content.chars().count() as i64;
    let now = Utc::now();

    let result = sqlx::query!(
        r#"
        INSERT INTO texts (
            title, source, source_url, content, content_length,
            ingested_at, updated_at, metadata,
            author, publication_date, publisher, access_date, doi, isbn
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        request.isbn
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
