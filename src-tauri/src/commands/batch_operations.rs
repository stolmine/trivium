use crate::db::Database;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ItemType {
    Folder { id: String },
    Text { id: i64 },
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MoveResult {
    pub success_count: usize,
    pub failure_count: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteResult {
    pub deleted_count: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub success_count: usize,
    pub failure_count: usize,
    pub exported_files: Vec<String>,
    pub errors: Vec<String>,
}

#[tauri::command]
pub async fn move_multiple_items(
    items: Vec<ItemType>,
    target_folder_id: Option<String>,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<MoveResult, String> {
    if items.is_empty() {
        return Ok(MoveResult {
            success_count: 0,
            failure_count: 0,
            errors: vec![],
        });
    }

    let db = db.lock().await;
    let pool = db.pool();

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    let mut success_count = 0;
    let mut failure_count = 0;
    let mut errors = Vec::new();

    for item in items {
        match item {
            ItemType::Text { id } => {
                let result = sqlx::query!(
                    r#"
                    UPDATE texts
                    SET folder_id = ?
                    WHERE id = ?
                    "#,
                    target_folder_id,
                    id
                )
                .execute(&mut *tx)
                .await;

                match result {
                    Ok(res) => {
                        if res.rows_affected() > 0 {
                            success_count += 1;
                        } else {
                            failure_count += 1;
                            errors.push(format!("Text {} not found", id));
                        }
                    }
                    Err(e) => {
                        failure_count += 1;
                        errors.push(format!("Failed to move text {}: {}", id, e));
                    }
                }
            }
            ItemType::Folder { id } => {
                let result = sqlx::query!(
                    r#"
                    UPDATE folders
                    SET parent_id = ?
                    WHERE id = ?
                    "#,
                    target_folder_id,
                    id
                )
                .execute(&mut *tx)
                .await;

                match result {
                    Ok(res) => {
                        if res.rows_affected() > 0 {
                            success_count += 1;
                        } else {
                            failure_count += 1;
                            errors.push(format!("Folder {} not found", id));
                        }
                    }
                    Err(e) => {
                        failure_count += 1;
                        errors.push(format!("Failed to move folder {}: {}", id, e));
                    }
                }
            }
        }
    }

    if failure_count > 0 {
        tx.rollback()
            .await
            .map_err(|e| format!("Failed to rollback transaction: {}", e))?;
        return Ok(MoveResult {
            success_count: 0,
            failure_count: failure_count + success_count,
            errors,
        });
    }

    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(MoveResult {
        success_count,
        failure_count,
        errors,
    })
}

#[tauri::command]
pub async fn delete_multiple_items(
    items: Vec<ItemType>,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<DeleteResult, String> {
    if items.is_empty() {
        return Ok(DeleteResult {
            deleted_count: 0,
            errors: vec![],
        });
    }

    let db = db.lock().await;
    let pool = db.pool();

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    let mut deleted_count = 0;
    let mut errors = Vec::new();

    for item in items {
        match item {
            ItemType::Text { id } => {
                let result = sqlx::query!(
                    r#"
                    DELETE FROM texts
                    WHERE id = ?
                    "#,
                    id
                )
                .execute(&mut *tx)
                .await;

                match result {
                    Ok(res) => {
                        deleted_count += res.rows_affected() as usize;
                    }
                    Err(e) => {
                        errors.push(format!("Failed to delete text {}: {}", id, e));
                    }
                }
            }
            ItemType::Folder { id } => {
                let move_texts_result = sqlx::query!(
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
                .await;

                if let Err(e) = move_texts_result {
                    errors.push(format!("Failed to move texts out of folder {}: {}", id, e));
                    continue;
                }

                let delete_result = sqlx::query!(
                    r#"
                    DELETE FROM folders
                    WHERE id = ?
                    "#,
                    id
                )
                .execute(&mut *tx)
                .await;

                match delete_result {
                    Ok(res) => {
                        deleted_count += res.rows_affected() as usize;
                    }
                    Err(e) => {
                        errors.push(format!("Failed to delete folder {}: {}", id, e));
                    }
                }
            }
        }
    }

    if !errors.is_empty() {
        tx.rollback()
            .await
            .map_err(|e| format!("Failed to rollback transaction: {}", e))?;
        return Ok(DeleteResult {
            deleted_count: 0,
            errors,
        });
    }

    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(DeleteResult {
        deleted_count,
        errors,
    })
}

#[tauri::command]
pub async fn export_texts(
    text_ids: Vec<i64>,
    format: String,
    app_handle: tauri::AppHandle,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<ExportResult, String> {
    use tauri_plugin_dialog::DialogExt;

    if text_ids.is_empty() {
        return Ok(ExportResult {
            success_count: 0,
            failure_count: 0,
            exported_files: vec![],
            errors: vec![],
        });
    }

    if format != "markdown" && format != "plain" {
        return Err("Invalid format: must be 'markdown' or 'plain'".to_string());
    }

    let directory_path = app_handle
        .dialog()
        .file()
        .blocking_pick_folder();

    let directory = match directory_path {
        Some(path) => std::path::PathBuf::from(path.as_path().ok_or("Invalid path")?),
        None => {
            return Err("No directory selected".to_string());
        }
    };

    let db = db.lock().await;
    let pool = db.pool();

    let mut success_count = 0;
    let mut failure_count = 0;
    let mut exported_files = Vec::new();
    let mut errors = Vec::new();

    for text_id in text_ids {
        let text_result = sqlx::query!(
            r#"
            SELECT id, title, content
            FROM texts
            WHERE id = ?
            "#,
            text_id
        )
        .fetch_one(pool)
        .await;

        let text = match text_result {
            Ok(t) => t,
            Err(e) => {
                failure_count += 1;
                errors.push(format!("Failed to fetch text {}: {}", text_id, e));
                continue;
            }
        };

        let sanitized_title = sanitize_filename(&text.title);
        let extension = if format == "markdown" { "md" } else { "txt" };
        let filename = format!("{}.{}", sanitized_title, extension);
        let file_path = directory.join(&filename);

        let content = if format == "markdown" {
            format!("# {}\n\n{}", text.title, text.content)
        } else {
            text.content.clone()
        };

        match std::fs::write(&file_path, content) {
            Ok(_) => {
                success_count += 1;
                exported_files.push(filename);
            }
            Err(e) => {
                failure_count += 1;
                errors.push(format!("Failed to write file {}: {}", filename, e));
            }
        }
    }

    Ok(ExportResult {
        success_count,
        failure_count,
        exported_files,
        errors,
    })
}

fn sanitize_filename(name: &str) -> String {
    let invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
    let mut sanitized = name
        .chars()
        .map(|c| if invalid_chars.contains(&c) { '_' } else { c })
        .collect::<String>();

    if sanitized.len() > 200 {
        sanitized.truncate(200);
    }

    if sanitized.is_empty() {
        sanitized = "untitled".to_string();
    }

    sanitized
}
