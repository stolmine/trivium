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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            std::fs::create_dir_all(&app_data_dir)
                .expect("Failed to create app data directory");

            let db_path = app_data_dir.join("trivium.db");

            // Block setup until database is initialized
            tauri::async_runtime::block_on(async move {
                let database = Database::new(db_path)
                    .await
                    .expect("Failed to initialize database");

                app.manage(Arc::new(Mutex::new(database)));
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::texts::create_text,
            commands::texts::list_texts,
            commands::texts::get_texts_with_available_marks,
            commands::texts::get_text,
            commands::texts::rename_text,
            commands::texts::delete_text,
            commands::texts::update_text_content,
            commands::texts::update_text_with_smart_marks,
            commands::texts::delete_marks,
            commands::texts::delete_read_ranges,
            commands::reading::mark_range_as_read,
            commands::reading::unmark_range_as_read,
            commands::reading::get_read_ranges,
            commands::reading::calculate_text_progress,
            commands::reading::get_paragraphs,
            commands::reading::get_next_unread_paragraph,
            commands::reading::get_previous_paragraph,
            commands::reading::get_most_recently_read_text,
            commands::reading::clear_read_progress,
            commands::reading::start_reading_session,
            commands::reading::end_reading_session,
            commands::reading::get_countable_length,
            commands::flashcards::create_flashcard_from_cloze,
            commands::flashcards::get_flashcards_by_text,
            commands::flashcards::delete_flashcard,
            commands::flashcards::get_flashcard_preview,
            commands::flashcards::create_mark,
            commands::flashcards::get_marks_for_text,
            commands::flashcard_hub::get_hub_marks,
            commands::flashcard_hub::skip_mark,
            commands::flashcard_hub::delete_mark,
            commands::flashcard_hub::get_hub_stats,
            commands::flashcard_hub::create_card_from_mark,
            commands::review::get_due_cards,
            commands::review::get_due_cards_filtered,
            commands::review::grade_card,
            commands::review::undo_review,
            commands::review::get_review_stats,
            commands::review::get_review_stats_filtered,
            commands::review::get_review_history_since,
            commands::review::get_limit_status,
            commands::review::get_study_limits,
            commands::review::update_study_limits,
            commands::review::bury_card,
            commands::folder::create_folder,
            commands::folder::get_folder_tree,
            commands::folder::rename_folder,
            commands::folder::delete_folder,
            commands::folder::move_text_to_folder,
            commands::folder::move_folder,
            commands::folder::get_texts_in_folder,
            commands::folder::calculate_folder_progress,
            commands::wikipedia::fetch_wikipedia_article,
            commands::settings::get_settings,
            commands::settings::update_setting,
            commands::settings::get_database_size,
            commands::settings::export_database,
            commands::settings::import_database,
            commands::settings::reset_all_data,
            commands::settings::reset_reading_progress,
            commands::settings::reset_all_flashcards,
            commands::settings::reset_flashcard_stats,
            commands::statistics::get_review_statistics,
            commands::statistics::get_difficulty_by_hour,
            commands::statistics::get_daily_review_stats,
            commands::statistics::get_reading_stats,
            commands::statistics::get_study_time_stats,
            commands::library_statistics::get_text_statistics,
            commands::library_statistics::get_folder_statistics
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
