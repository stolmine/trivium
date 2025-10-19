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
