// Folder management commands
//
// Tauri commands for managing hierarchical folder structure:
// - Create folders with optional parent
// - Get folder tree
// - Rename folders
// - Delete folders (cascade to children, move texts to null)
// - Move texts to folders
// - Get texts in a folder
//

use crate::db::Database;
use crate::models::folder::Folder;
use crate::models::text::Text;
use crate::models::read_range::ReadRange;
use crate::services::parser;
use crate::services::range_calculator::RangeCalculator;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;
use uuid::Uuid;

#[tauri::command]
pub async fn create_folder(
    name: String,
    parent_id: Option<String>,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Folder, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    sqlx::query!(
        r#"
        INSERT INTO folders (id, name, parent_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        "#,
        id,
        name,
        parent_id,
        now,
        now
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create folder: {}", e))?;

    let folder = sqlx::query_as!(
        Folder,
        r#"
        SELECT id, name, parent_id, created_at, updated_at
        FROM folders
        WHERE id = ?
        "#,
        id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch created folder: {}", e))?;

    Ok(folder)
}

#[tauri::command]
pub async fn get_folder_tree(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<Folder>, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let folders = sqlx::query_as!(
        Folder,
        r#"
        SELECT id, name, parent_id, created_at, updated_at
        FROM folders
        ORDER BY name ASC
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch folder tree: {}", e))?;

    Ok(folders)
}

#[tauri::command]
pub async fn rename_folder(
    id: String,
    name: String,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<(), String> {
    let db = db.lock().await;
    let pool = db.pool();

    let result = sqlx::query!(
        r#"
        UPDATE folders
        SET name = ?, updated_at = datetime('now')
        WHERE id = ?
        "#,
        name,
        id
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to rename folder: {}", e))?;

    if result.rows_affected() == 0 {
        return Err("Folder not found".to_string());
    }

    Ok(())
}

#[tauri::command]
pub async fn delete_folder(
    id: String,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<(), String> {
    let db = db.lock().await;
    let pool = db.pool();

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    sqlx::query!(
        r#"
        UPDATE texts
        SET folder_id = NULL
        WHERE folder_id = ? OR folder_id IN (
            WITH RECURSIVE folder_tree AS (
                SELECT id FROM folders WHERE parent_id = ?
                UNION ALL
                SELECT f.id FROM folders f
                INNER JOIN folder_tree ft ON f.parent_id = ft.id
            )
            SELECT id FROM folder_tree
        )
        "#,
        id,
        id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to move texts out of folder: {}", e))?;

    let result = sqlx::query!(
        r#"
        DELETE FROM folders
        WHERE id = ?
        "#,
        id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to delete folder: {}", e))?;

    if result.rows_affected() == 0 {
        return Err("Folder not found".to_string());
    }

    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn move_text_to_folder(
    text_id: i64,
    folder_id: Option<String>,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<(), String> {
    let db = db.lock().await;
    let pool = db.pool();

    let result = sqlx::query!(
        r#"
        UPDATE texts
        SET folder_id = ?
        WHERE id = ?
        "#,
        folder_id,
        text_id
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to move text to folder: {}", e))?;

    if result.rows_affected() == 0 {
        return Err("Text not found".to_string());
    }

    Ok(())
}

#[tauri::command]
pub async fn move_folder(
    folder_id: String,
    parent_id: Option<String>,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<(), String> {
    let db = db.lock().await;
    let pool = db.pool();

    let result = sqlx::query!(
        r#"
        UPDATE folders
        SET parent_id = ?
        WHERE id = ?
        "#,
        parent_id,
        folder_id
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to move folder: {}", e))?;

    if result.rows_affected() == 0 {
        return Err("Folder not found".to_string());
    }

    Ok(())
}

#[tauri::command]
pub async fn get_texts_in_folder(
    folder_id: Option<String>,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<Text>, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let texts = if let Some(folder_id) = folder_id {
        sqlx::query_as!(
            Text,
            r#"
            SELECT
                id as "id!", title, source, source_url, content, content_length as "content_length!",
                ingested_at as "ingested_at: _", updated_at as "updated_at: _",
                metadata, author, publication_date, publisher, access_date, doi, isbn, folder_id
            FROM texts
            WHERE folder_id = ?
            ORDER BY ingested_at DESC
            "#,
            folder_id
        )
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch texts in folder: {}", e))?
    } else {
        sqlx::query_as!(
            Text,
            r#"
            SELECT
                id as "id!", title, source, source_url, content, content_length as "content_length!",
                ingested_at as "ingested_at: _", updated_at as "updated_at: _",
                metadata, author, publication_date, publisher, access_date, doi, isbn, folder_id
            FROM texts
            WHERE folder_id IS NULL
            ORDER BY ingested_at DESC
            "#
        )
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch texts in root: {}", e))?
    };

    Ok(texts)
}

#[tauri::command]
pub async fn calculate_folder_progress(
    folder_id: String,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<f64, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let user_id = 1;

    let text_ids = sqlx::query!(
        r#"
        SELECT id, content_length, content
        FROM texts
        WHERE folder_id IN (
            WITH RECURSIVE folder_tree AS (
                SELECT id FROM folders WHERE id = ?
                UNION ALL
                SELECT f.id FROM folders f
                INNER JOIN folder_tree ft ON f.parent_id = ft.id
            )
            SELECT id FROM folder_tree
        )
        "#,
        folder_id
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch texts in folder tree: {}", e))?;

    // Handle empty folders
    if text_ids.is_empty() {
        return Ok(0.0);
    }

    // Calculate progress for each text and average them
    let mut total_progress = 0.0;
    let mut text_count = 0;

    for text_record in text_ids {
        let total_chars = text_record.content_length;
        let excluded_chars = parser::calculate_excluded_character_count(&text_record.content);
        let countable_chars = total_chars - excluded_chars;

        if countable_chars <= 0 {
            continue;
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
            text_record.id,
            user_id
        )
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch read ranges: {}", e))?;

        let read_chars = RangeCalculator::calculate_read_characters(ranges);
        let progress = (read_chars as f64 / countable_chars as f64) * 100.0;

        total_progress += progress;
        text_count += 1;
    }

    if text_count == 0 {
        return Ok(0.0);
    }

    Ok(total_progress / text_count as f64)
}
