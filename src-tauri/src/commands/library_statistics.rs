use crate::db::Database;
use crate::models::read_range::ReadRange;
use crate::services::parser;
use crate::services::range_calculator::RangeCalculator;
use serde::Serialize;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TextStatistics {
    pub id: i64,
    pub title: String,
    pub folder_path: Option<String>,
    pub content_length: i64,
    pub word_count: i64,
    pub paragraph_count: i64,
    pub read_percentage: f64,
    pub current_position: i64,
    pub total_flashcards: i64,
    pub new_cards: i64,
    pub learning_cards: i64,
    pub review_cards: i64,
    pub retention_rate: Option<f64>,
    pub created_at: String,
    pub updated_at: String,
    pub last_read_at: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderStatistics {
    pub id: String,
    pub name: String,
    pub parent_path: Option<String>,
    pub total_texts: i64,
    pub total_content_length: i64,
    pub average_progress: f64,
    pub total_flashcards: i64,
    pub created_at: String,
    pub updated_at: String,
}

fn calculate_word_count(content: &str) -> i64 {
    content
        .split_whitespace()
        .filter(|s| !s.is_empty())
        .count() as i64
}

fn calculate_paragraph_count(content: &str) -> i64 {
    let paragraphs = parser::detect_paragraphs(content);
    paragraphs.len() as i64
}

async fn build_folder_path(pool: &sqlx::SqlitePool, folder_id: &str) -> Result<String, String> {
    let mut path_parts = Vec::new();
    let mut current_id = Some(folder_id.to_string());

    while let Some(id) = current_id {
        let folder = sqlx::query!(
            r#"
            SELECT name, parent_id
            FROM folders
            WHERE id = ?
            "#,
            id
        )
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Failed to fetch folder: {}", e))?;

        match folder {
            Some(f) => {
                path_parts.push(f.name);
                current_id = f.parent_id;
            }
            None => break,
        }
    }

    path_parts.reverse();
    Ok(path_parts.join("/"))
}

#[tauri::command]
pub async fn get_text_statistics(
    text_id: i64,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<TextStatistics, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let user_id = 1;

    let text = sqlx::query!(
        r#"
        SELECT
            id,
            title,
            folder_id,
            content,
            content_length,
            ingested_at,
            updated_at
        FROM texts
        WHERE id = ?
        "#,
        text_id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch text: {}", e))?;

    let folder_path = if let Some(folder_id) = text.folder_id {
        Some(build_folder_path(pool, &folder_id.to_string()).await?)
    } else {
        None
    };

    let word_count = calculate_word_count(&text.content);
    let paragraph_count = calculate_paragraph_count(&text.content);

    let total_chars = text.content_length;
    let excluded_chars = parser::calculate_excluded_character_count(&text.content);
    let header_chars = parser::calculate_header_character_count(&text.content);
    let countable_chars = total_chars - excluded_chars - header_chars;

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
        text_id,
        user_id
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch read ranges: {}", e))?;

    let read_chars = RangeCalculator::calculate_read_characters(ranges.clone());
    let read_percentage = if countable_chars > 0 {
        (read_chars as f64 / countable_chars as f64) * 100.0
    } else {
        0.0
    };

    let current_position = ranges
        .iter()
        .map(|r| r.end_position)
        .max()
        .unwrap_or(0);

    let last_read_at = if !ranges.is_empty() {
        ranges
            .iter()
            .map(|r| r.marked_at)
            .max()
            .map(|dt| dt.to_rfc3339())
    } else {
        None
    };

    let flashcard_counts = sqlx::query!(
        r#"
        SELECT
            COUNT(*) as "total!: i64",
            SUM(CASE WHEN state = 0 THEN 1 ELSE 0 END) as "new!: i64",
            SUM(CASE WHEN state IN (1, 3) THEN 1 ELSE 0 END) as "learning!: i64",
            SUM(CASE WHEN state = 2 THEN 1 ELSE 0 END) as "review!: i64"
        FROM flashcards
        WHERE text_id = ?
        "#,
        text_id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch flashcard counts: {}", e))?;

    let retention_rate = if flashcard_counts.total > 0 {
        let retention = sqlx::query!(
            r#"
            SELECT
                COALESCE(
                    CAST(SUM(CASE WHEN stability > 0 THEN 1 ELSE 0 END) AS REAL) /
                    NULLIF(CAST(COUNT(*) AS REAL), 0.0) * 100.0,
                    0.0
                ) as "rate!: f64"
            FROM flashcards
            WHERE text_id = ?
            "#,
            text_id
        )
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Failed to calculate retention rate: {}", e))?;

        Some(retention.rate)
    } else {
        None
    };

    Ok(TextStatistics {
        id: text.id,
        title: text.title,
        folder_path,
        content_length: text.content_length,
        word_count,
        paragraph_count,
        read_percentage,
        current_position,
        total_flashcards: flashcard_counts.total,
        new_cards: flashcard_counts.new,
        learning_cards: flashcard_counts.learning,
        review_cards: flashcard_counts.review,
        retention_rate,
        created_at: text.ingested_at,
        updated_at: text.updated_at,
        last_read_at,
    })
}

#[tauri::command]
pub async fn get_folder_statistics(
    folder_id: String,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<FolderStatistics, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let user_id = 1;

    let folder = sqlx::query!(
        r#"
        SELECT id, name, parent_id, created_at, updated_at
        FROM folders
        WHERE id = ?
        "#,
        folder_id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch folder: {}", e))?;

    let parent_path = if let Some(ref parent_id) = folder.parent_id {
        Some(build_folder_path(pool, parent_id).await?)
    } else {
        None
    };

    let texts = sqlx::query!(
        r#"
        WITH RECURSIVE folder_tree AS (
            SELECT id FROM folders WHERE id = ?
            UNION ALL
            SELECT f.id FROM folders f
            INNER JOIN folder_tree ft ON f.parent_id = ft.id
        )
        SELECT
            t.id,
            t.content_length,
            t.content
        FROM texts t
        WHERE t.folder_id IN (SELECT id FROM folder_tree)
        "#,
        folder_id
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch texts in folder tree: {}", e))?;

    let total_texts = texts.len() as i64;
    let total_content_length: i64 = texts.iter().map(|t| t.content_length).sum();

    let mut total_progress = 0.0;
    let mut text_count_with_progress = 0;

    for text in &texts {
        let total_chars = text.content_length;
        let excluded_chars = parser::calculate_excluded_character_count(&text.content);
        let header_chars = parser::calculate_header_character_count(&text.content);
        let countable_chars = total_chars - excluded_chars - header_chars;

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
            text.id,
            user_id
        )
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch read ranges: {}", e))?;

        let read_chars = RangeCalculator::calculate_read_characters(ranges);
        let progress = (read_chars as f64 / countable_chars as f64) * 100.0;

        total_progress += progress;
        text_count_with_progress += 1;
    }

    let average_progress = if text_count_with_progress > 0 {
        total_progress / text_count_with_progress as f64
    } else {
        0.0
    };

    let total_flashcards = sqlx::query!(
        r#"
        WITH RECURSIVE folder_tree AS (
            SELECT id FROM folders WHERE id = ?
            UNION ALL
            SELECT f.id FROM folders f
            INNER JOIN folder_tree ft ON f.parent_id = ft.id
        )
        SELECT COALESCE(COUNT(*), 0) as "count!: i64"
        FROM flashcards
        WHERE text_id IN (
            SELECT t.id FROM texts t
            WHERE t.folder_id IN (SELECT id FROM folder_tree)
        )
        "#,
        folder_id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch flashcard count: {}", e))?;

    Ok(FolderStatistics {
        id: folder.id,
        name: folder.name,
        parent_path,
        total_texts,
        total_content_length,
        average_progress,
        total_flashcards: total_flashcards.count,
        created_at: folder.created_at,
        updated_at: folder.updated_at,
    })
}
