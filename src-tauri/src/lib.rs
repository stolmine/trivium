mod commands;
mod models;
mod services;
mod db;

use db::Database;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            tauri::async_runtime::spawn(async move {
                let app_data_dir = app_handle
                    .path()
                    .app_data_dir()
                    .expect("Failed to get app data directory");

                std::fs::create_dir_all(&app_data_dir)
                    .expect("Failed to create app data directory");

                let db_path = app_data_dir.join("trivium.db");

                let database = Database::new(db_path)
                    .await
                    .expect("Failed to initialize database");

                app_handle.manage(Arc::new(Mutex::new(database)));
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::texts::create_text,
            commands::texts::list_texts,
            commands::texts::get_text
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
