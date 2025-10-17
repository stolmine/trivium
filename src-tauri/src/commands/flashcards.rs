use crate::db::Database;
use crate::models::flashcard::Flashcard;
use crate::services::cloze_parser::ClozeParser;
use crate::services::cloze_renderer::ClozeRenderer;
use chrono::Utc;
use serde::Serialize;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FlashcardPreview {
    pub html: String,
    pub cloze_number: u32,
}

#[tauri::command]
pub async fn create_flashcard_from_cloze(
    text_id: i64,
    selected_text: String,
    cloze_text: String,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<Flashcard>, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let user_id = 1;
    let now = Utc::now();

    let parsed = ClozeParser::parse(&cloze_text)
        .map_err(|e| format!("Failed to parse cloze text: {}", e))?;

    let cloze_numbers = ClozeParser::extract_cloze_numbers(&cloze_text)
        .map_err(|e| format!("Failed to extract cloze numbers: {}", e))?;

    if cloze_numbers.is_empty() {
        return Err("No cloze deletions found in text".to_string());
    }

    let parsed_segments_json = serde_json::to_string(&parsed.segments)
        .map_err(|e| format!("Failed to serialize parsed segments: {}", e))?;

    let cloze_count = cloze_numbers.len() as i64;

    let cloze_note_result = sqlx::query!(
        r#"
        INSERT INTO cloze_notes (text_id, user_id, original_text, parsed_segments, cloze_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        "#,
        text_id,
        user_id,
        cloze_text,
        parsed_segments_json,
        cloze_count,
        now,
        now
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create cloze note: {}", e))?;

    let cloze_note_id = cloze_note_result.last_insert_rowid();

    let max_display_result = sqlx::query!(
        "SELECT COALESCE(MAX(display_index), 0) as max_idx FROM flashcards WHERE text_id = ?",
        text_id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to get max display_index: {}", e))?;

    let mut next_display_index = max_display_result.max_idx + 1;

    let mut flashcards = Vec::new();

    for cloze_number in cloze_numbers {
        let cloze_index = cloze_number as i64;
        let flashcard_result = sqlx::query!(
            r#"
            INSERT INTO flashcards (
                text_id, user_id, original_text, cloze_text, cloze_index,
                display_index, cloze_number, cloze_note_id,
                created_at, updated_at, due,
                stability, difficulty, elapsed_days, scheduled_days,
                reps, lapses, state, last_review
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            text_id,
            user_id,
            selected_text,
            cloze_text,
            cloze_index,
            next_display_index,
            cloze_number,
            cloze_note_id,
            now,
            now,
            now,
            0.0,
            0.0,
            0,
            0,
            0,
            0,
            0,
            None::<chrono::DateTime<Utc>>
        )
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to create flashcard for cloze {}: {}", cloze_number, e))?;

        let flashcard_id = flashcard_result.last_insert_rowid();

        let flashcard = sqlx::query_as!(
            Flashcard,
            r#"
            SELECT
                id as "id!",
                text_id as "text_id!",
                user_id as "user_id!",
                original_text,
                cloze_text,
                cloze_index as "cloze_index!",
                display_index as "display_index!",
                cloze_number as "cloze_number!",
                created_at as "created_at: _",
                updated_at as "updated_at: _",
                cloze_note_id,
                due as "due: _",
                stability as "stability!",
                difficulty as "difficulty!",
                elapsed_days as "elapsed_days!",
                scheduled_days as "scheduled_days!",
                reps as "reps!",
                lapses as "lapses!",
                state as "state!",
                last_review as "last_review: _"
            FROM flashcards
            WHERE id = ?
            "#,
            flashcard_id
        )
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Failed to fetch created flashcard: {}", e))?;

        flashcards.push(flashcard);
        next_display_index += 1;
    }

    Ok(flashcards)
}

#[tauri::command]
pub async fn get_flashcards_by_text(
    text_id: i64,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<Flashcard>, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let flashcards = sqlx::query_as!(
        Flashcard,
        r#"
        SELECT
            id as "id!",
            text_id as "text_id!",
            user_id as "user_id!",
            original_text,
            cloze_text,
            cloze_index as "cloze_index!",
            display_index as "display_index!",
            cloze_number as "cloze_number!",
            created_at as "created_at: _",
            updated_at as "updated_at: _",
            cloze_note_id,
            due as "due: _",
            stability as "stability!",
            difficulty as "difficulty!",
            elapsed_days as "elapsed_days!",
            scheduled_days as "scheduled_days!",
            reps as "reps!",
            lapses as "lapses!",
            state as "state!",
            last_review as "last_review: _"
        FROM flashcards
        WHERE text_id = ?
        ORDER BY display_index ASC
        "#,
        text_id
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch flashcards: {}", e))?;

    Ok(flashcards)
}

#[tauri::command]
pub async fn delete_flashcard(
    flashcard_id: i64,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<(), String> {
    let db = db.lock().await;
    let pool = db.pool();

    sqlx::query!(
        r#"
        DELETE FROM flashcards
        WHERE id = ?
        "#,
        flashcard_id
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to delete flashcard: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_flashcard_preview(
    cloze_text: String,
    cloze_number: u32,
) -> Result<FlashcardPreview, String> {
    let rendered = ClozeRenderer::render(&cloze_text, cloze_number)
        .map_err(|e| format!("Failed to render cloze: {}", e))?;

    Ok(FlashcardPreview {
        html: rendered.html,
        cloze_number,
    })
}

/// Create a mark (cloze_note without flashcards) for later processing in Create Cards hub
#[tauri::command]
pub async fn create_mark(
    text_id: i64,
    selected_text: String,
    start_position: i64,
    end_position: i64,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<i64, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let user_id = 1;
    let now = Utc::now();

    // Create a simple cloze_note without any cloze deletions
    // This will appear in the Create Cards hub with status='pending'
    let cloze_note_result = sqlx::query!(
        r#"
        INSERT INTO cloze_notes (
            text_id, user_id, original_text, parsed_segments, cloze_count,
            start_position, end_position,
            created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        text_id,
        user_id,
        selected_text,
        "[]",  // Empty parsed segments - no cloze deletions yet
        0,     // No cloze deletions
        start_position,
        end_position,
        now,
        now
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create mark: {}", e))?;

    Ok(cloze_note_result.last_insert_rowid())
}
