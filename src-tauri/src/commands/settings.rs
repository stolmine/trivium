use crate::db::Database;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Setting {
    pub key: String,
    pub value: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResetResult {
    pub flashcards_deleted: u64,
    pub cloze_notes_deleted: u64,
    pub read_ranges_deleted: u64,
    pub paragraphs_deleted: u64,
    pub texts_deleted: u64,
    pub folders_deleted: u64,
    pub review_history_deleted: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PartialResetResult {
    pub items_deleted: u64,
}

#[tauri::command]
pub async fn get_settings(db: State<'_, Arc<Mutex<Database>>>) -> Result<Vec<Setting>, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let settings = sqlx::query_as!(
        Setting,
        r#"
        SELECT key, value, updated_at
        FROM settings
        ORDER BY key ASC
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch settings: {}", e))?;

    Ok(settings)
}

#[tauri::command]
pub async fn update_setting(
    key: String,
    value: String,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<(), String> {
    let db = db.lock().await;
    let pool = db.pool();
    let now = Utc::now().to_rfc3339();

    sqlx::query!(
        r#"
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
        "#,
        key,
        value,
        now
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to update setting: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_database_size(db: State<'_, Arc<Mutex<Database>>>) -> Result<i64, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let result = sqlx::query!(
        r#"
        SELECT page_count * page_size as size
        FROM pragma_page_count(), pragma_page_size()
        "#
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to get database size: {}", e))?;

    Ok(result.size.unwrap_or(0))
}

#[tauri::command]
pub async fn export_database(app: AppHandle) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let source_db_path = app_data_dir.join("trivium.db");

    if !source_db_path.exists() {
        return Err("Database file not found".to_string());
    }

    let default_filename = format!(
        "trivium_backup_{}.db",
        Utc::now().format("%Y-%m-%d")
    );

    let file_path = app
        .dialog()
        .file()
        .set_title("Export Database")
        .set_file_name(&default_filename)
        .add_filter("SQLite Database", &["db"])
        .blocking_save_file();

    match file_path {
        Some(path) => {
            let dest_path = PathBuf::from(path.as_path().expect("Invalid path"));

            std::fs::copy(&source_db_path, &dest_path)
                .map_err(|e| format!("Failed to copy database: {}", e))?;

            Ok(format!(
                "Database exported successfully to: {}",
                dest_path.display()
            ))
        }
        None => Err("Export cancelled".to_string()),
    }
}

#[tauri::command]
pub async fn import_database(
    app: AppHandle,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let current_db_path = app_data_dir.join("trivium.db");

    let file_path = app
        .dialog()
        .file()
        .set_title("Import Database")
        .add_filter("SQLite Database", &["db", "sqlite", "sqlite3"])
        .blocking_pick_file();

    let import_path = match file_path {
        Some(path) => PathBuf::from(path.as_path().ok_or("Invalid path")?),
        None => return Err("Import cancelled".to_string()),
    };

    if !import_path.exists() {
        return Err("Selected file does not exist".to_string());
    }

    let import_url = format!("sqlite:{}", import_path.to_string_lossy());
    let validation_pool = sqlx::sqlite::SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&import_url)
        .await
        .map_err(|e| format!("Invalid SQLite database: {}", e))?;

    let integrity_check = sqlx::query!("PRAGMA integrity_check")
        .fetch_one(&validation_pool)
        .await
        .map_err(|e| format!("Database integrity check failed: {}", e))?;

    validation_pool.close().await;

    if integrity_check.integrity_check != Some("ok".to_string()) {
        return Err("Database is corrupted".to_string());
    }

    let backup_path = app_data_dir.join(format!(
        "trivium_backup_{}.db",
        Utc::now().format("%Y-%m-%d_%H-%M-%S")
    ));

    if current_db_path.exists() {
        std::fs::copy(&current_db_path, &backup_path)
            .map_err(|e| format!("Failed to create backup: {}", e))?;
    }

    {
        let db_lock = db.lock().await;
        db_lock.pool().close().await;
    }

    let restore_result = std::fs::copy(&import_path, &current_db_path);

    if let Err(e) = restore_result {
        if backup_path.exists() {
            std::fs::copy(&backup_path, &current_db_path)
                .map_err(|_| "Failed to restore from backup after import failure".to_string())?;
        }
        return Err(format!("Failed to import database: {}", e));
    }

    let new_database = Database::new(current_db_path.clone())
        .await
        .map_err(|e| {
            if backup_path.exists() {
                let _ = std::fs::copy(&backup_path, &current_db_path);
            }
            format!("Failed to initialize new database: {}", e)
        })?;

    {
        let mut db_lock = db.lock().await;
        *db_lock = new_database;
    }

    Ok(format!(
        "Database imported successfully. Backup saved to: {}",
        backup_path.display()
    ))
}

#[tauri::command]
pub async fn reset_all_data(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<ResetResult, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    let review_history_result = sqlx::query!(
        r#"
        DELETE FROM review_history
        "#
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to delete review history: {}", e))?;

    let flashcards_result = sqlx::query!(
        r#"
        DELETE FROM flashcards
        "#
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to delete flashcards: {}", e))?;

    let cloze_notes_result = sqlx::query!(
        r#"
        DELETE FROM cloze_notes
        "#
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to delete cloze notes: {}", e))?;

    let read_ranges_result = sqlx::query!(
        r#"
        DELETE FROM read_ranges
        "#
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to delete read ranges: {}", e))?;

    let paragraphs_result = sqlx::query!(
        r#"
        DELETE FROM paragraphs
        "#
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to delete paragraphs: {}", e))?;

    let texts_result = sqlx::query!(
        r#"
        DELETE FROM texts
        "#
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to delete texts: {}", e))?;

    let folders_result = sqlx::query!(
        r#"
        DELETE FROM folders
        "#
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to delete folders: {}", e))?;

    sqlx::query!(
        r#"
        DELETE FROM sqlite_sequence
        WHERE name IN ('texts', 'folders', 'flashcards', 'cloze_notes', 'read_ranges', 'paragraphs', 'review_history')
        "#
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to reset sequences: {}", e))?;

    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(ResetResult {
        flashcards_deleted: flashcards_result.rows_affected(),
        cloze_notes_deleted: cloze_notes_result.rows_affected(),
        read_ranges_deleted: read_ranges_result.rows_affected(),
        paragraphs_deleted: paragraphs_result.rows_affected(),
        texts_deleted: texts_result.rows_affected(),
        folders_deleted: folders_result.rows_affected(),
        review_history_deleted: review_history_result.rows_affected(),
    })
}

#[tauri::command]
pub async fn reset_reading_progress(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<PartialResetResult, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let result = sqlx::query!(
        r#"
        DELETE FROM read_ranges
        "#
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to delete read ranges: {}", e))?;

    Ok(PartialResetResult {
        items_deleted: result.rows_affected(),
    })
}

#[tauri::command]
pub async fn reset_all_flashcards(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<PartialResetResult, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    let review_history_result = sqlx::query!(
        r#"
        DELETE FROM review_history
        "#
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to delete review history: {}", e))?;

    let flashcards_result = sqlx::query!(
        r#"
        DELETE FROM flashcards
        "#
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to delete flashcards: {}", e))?;

    let cloze_notes_result = sqlx::query!(
        r#"
        DELETE FROM cloze_notes
        "#
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to delete cloze notes: {}", e))?;

    sqlx::query!(
        r#"
        DELETE FROM sqlite_sequence
        WHERE name IN ('flashcards', 'cloze_notes', 'review_history')
        "#
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to reset sequences: {}", e))?;

    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    let total_deleted = review_history_result.rows_affected()
        + flashcards_result.rows_affected()
        + cloze_notes_result.rows_affected();

    Ok(PartialResetResult {
        items_deleted: total_deleted,
    })
}

#[tauri::command]
pub async fn reset_flashcard_stats(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<PartialResetResult, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let now = Utc::now().to_rfc3339();

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    sqlx::query!(
        r#"
        DELETE FROM review_history
        "#
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to delete review history: {}", e))?;

    let result = sqlx::query!(
        r#"
        UPDATE flashcards
        SET
            state = 0,
            stability = 0.0,
            difficulty = 0.0,
            elapsed_days = 0,
            scheduled_days = 0,
            reps = 0,
            lapses = 0,
            last_review = NULL,
            due = ?,
            updated_at = ?
        "#,
        now,
        now
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to reset flashcard stats: {}", e))?;

    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(PartialResetResult {
        items_deleted: result.rows_affected(),
    })
}
