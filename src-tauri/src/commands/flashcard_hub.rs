use crate::db::Database;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

/// Scope type for filtering marks in the hub
#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ScopeType {
    Library,
    Folder,
    Text,
}

/// Mark with context for display in the creation hub
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarkWithContext {
    pub id: i64,
    pub text_id: i64,
    pub text_title: String,
    pub start_position: i64,
    pub end_position: i64,
    pub marked_text: String,
    pub before_context: String,
    pub after_context: String,
    pub has_card: bool,
    pub created_at: DateTime<Utc>,
}

/// Response for paginated marks
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HubMarksResponse {
    pub marks: Vec<MarkWithContext>,
    pub total_count: i64,
    pub has_more: bool,
    pub current_offset: i64,
}

/// Hub statistics for dashboard and progress tracking
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HubStats {
    pub pending: i64,      // Becomes "pending" in JSON
    pub skipped: i64,      // Becomes "skipped" in JSON
    pub converted: i64,    // Becomes "converted" in JSON
    pub today_count: i64,  // Becomes "todayCount" in JSON
    pub week_count: i64,   // Becomes "weekCount" in JSON
}

/// Response for card creation
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatedCard {
    pub id: i64,
    pub mark_id: i64,
    pub question: String,
    pub answer: String,
    pub created_at: DateTime<Utc>,
    pub text_id: i64,
    pub text_title: String,
}

/// Convert UTF-16 code unit offset to byte offset
/// Positions in the database are UTF-16 code units (matching JavaScript's string.length)
/// but Rust string slicing requires byte offsets
fn utf16_offset_to_byte_offset(text: &str, utf16_offset: usize) -> usize {
    let mut current_utf16 = 0;
    let mut byte_offset = 0;

    for ch in text.chars() {
        if current_utf16 >= utf16_offset {
            break;
        }
        current_utf16 += ch.len_utf16();
        byte_offset += ch.len_utf8();
    }

    byte_offset
}

/// Helper to extract context around marked text using stored positions in DOM space
///
/// Positions are stored in DOM textContent space (rendered HTML with no markdown).
/// This function:
/// 1. Processes raw content to match how frontend renders it (strip exclude tags, strip markdown)
/// 2. Uses the DOM positions to extract the marked text and context
/// 3. Returns context strings and positions
fn extract_context_from_positions(content: &str, start_pos: i64, end_pos: i64, context_chars: usize) -> (String, String, i64, i64) {
    // Convert content to DOM space (strip [[exclude]] tags and markdown links)
    // This matches how the frontend processes content for rendering
    let dom_content = process_content_to_dom_space(content);

    // Convert UTF-16 positions to byte offsets for safe string slicing
    let start_utf16 = start_pos as usize;
    let end_utf16 = end_pos as usize;

    // Get UTF-16 length to check bounds
    let dom_utf16_len = dom_content.encode_utf16().count();

    // Ensure positions are within bounds (in UTF-16 space)
    if start_utf16 >= dom_utf16_len || end_utf16 > dom_utf16_len || start_utf16 >= end_utf16 {
        return (String::new(), String::new(), start_pos, end_pos);
    }

    // Convert UTF-16 offsets to byte offsets
    let start_byte = utf16_offset_to_byte_offset(&dom_content, start_utf16);
    let end_byte = utf16_offset_to_byte_offset(&dom_content, end_utf16);

    // Calculate context boundaries in UTF-16 space
    let before_start_utf16 = start_utf16.saturating_sub(context_chars);
    let after_end_utf16 = std::cmp::min(end_utf16 + context_chars, dom_utf16_len);

    // Convert context boundaries to byte offsets
    let before_start_byte = utf16_offset_to_byte_offset(&dom_content, before_start_utf16);
    let after_end_byte = utf16_offset_to_byte_offset(&dom_content, after_end_utf16);

    // Extract before context (up to context_chars before)
    let before_context = dom_content[before_start_byte..start_byte].to_string();

    // Extract after context (up to context_chars after)
    let after_context = dom_content[end_byte..after_end_byte].to_string();

    (before_context, after_context, start_pos, end_pos)
}

/// Process content to DOM space by stripping [[exclude]] tags and markdown links
/// This matches how the frontend renders content
fn process_content_to_dom_space(content: &str) -> String {
    use regex::Regex;

    // First, strip [[exclude]] tags (keep the content inside)
    // Use (?s) for dotall mode to match across newlines
    let exclude_regex = Regex::new(r"(?s)\[\[exclude\]\](.*?)\[\[/exclude\]\]").unwrap();
    let mut cleaned = exclude_regex.replace_all(content, "$1").to_string();

    // Then strip markdown links: [text](url) -> text
    let link_regex = Regex::new(r"\[([^\]]*)\]\([^\)]+\)").unwrap();
    cleaned = link_regex.replace_all(&cleaned, "$1").to_string();

    // Strip mediawiki-style headers: == Header == -> Header
    let header_regex = Regex::new(r"={2,}\s*(.+?)\s*={2,}").unwrap();
    cleaned = header_regex.replace_all(&cleaned, "$1").to_string();

    cleaned
}

/// Helper to extract context around marked text in content using string search
/// This is a fallback for old marks that don't have stored positions
fn extract_context(content: &str, marked_text: &str, context_chars: usize) -> (String, String, i64, i64) {
    // Find the position of the marked text in content
    if let Some(pos) = content.find(marked_text) {
        let start_pos = pos;
        let end_pos = pos + marked_text.len();

        // Extract before context (up to context_chars before)
        let before_start = pos.saturating_sub(context_chars);
        let before_context = content[before_start..pos].to_string();

        // Extract after context (up to context_chars after)
        let after_end = std::cmp::min(end_pos + context_chars, content.len());
        let after_context = content[end_pos..after_end].to_string();

        (before_context, after_context, start_pos as i64, end_pos as i64)
    } else {
        // If marked text not found, return empty contexts and position 0
        (String::new(), String::new(), 0, marked_text.len() as i64)
    }
}

/// Get marks for the flashcard creation hub based on scope
///
/// # Arguments
/// * `scope` - Filter scope: library, folder, or text
/// * `scope_id` - Optional ID for folder or text scope
/// * `limit` - Maximum number of marks to return (default varies by scope)
/// * `offset` - Offset for pagination (default 0)
#[tauri::command]
pub async fn get_hub_marks(
    scope: ScopeType,
    scope_id: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<HubMarksResponse, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let clamped_limit = match scope {
        ScopeType::Library => limit.unwrap_or(1000).clamp(1, 1000),
        ScopeType::Folder => limit.unwrap_or(200).clamp(1, 200),
        ScopeType::Text => limit.unwrap_or(100).clamp(1, 100),
    };
    let offset_val = offset.unwrap_or(0);

    let (total_count, marks) = match scope {
        ScopeType::Library => {
            // Get total count first
            let total_count: i64 = sqlx::query_scalar!(
                r#"
                SELECT COUNT(*) as "count!"
                FROM cloze_notes cn
                WHERE cn.status IN ('pending', 'skipped')
                  AND (SELECT COUNT(*) FROM flashcards WHERE cloze_note_id = cn.id) = 0
                "#
            )
            .fetch_one(pool)
            .await
            .map_err(|e| format!("Failed to count library marks: {}", e))?;

            // Get all pending marks from entire library
            let rows = sqlx::query!(
                r#"
                SELECT
                    cn.id,
                    cn.text_id,
                    t.title,
                    t.content,
                    cn.original_text,
                    cn.start_position,
                    cn.end_position,
                    cn.created_at,
                    (SELECT COUNT(*) FROM flashcards WHERE cloze_note_id = cn.id) as card_count
                FROM cloze_notes cn
                INNER JOIN texts t ON cn.text_id = t.id
                WHERE cn.status IN ('pending', 'skipped')
                  AND (SELECT COUNT(*) FROM flashcards WHERE cloze_note_id = cn.id) = 0
                ORDER BY cn.last_seen_at ASC NULLS FIRST, cn.created_at ASC
                LIMIT ? OFFSET ?
                "#,
                clamped_limit,
                offset_val
            )
            .fetch_all(pool)
            .await
            .map_err(|e| format!("Failed to fetch library marks: {}", e))?;

            let marks: Vec<MarkWithContext> = rows.into_iter()
                .map(|row| {
                    // Use stored positions if available, otherwise fallback to string search
                    let (before_context, after_context, start_pos, end_pos) = match (row.start_position, row.end_position) {
                        (Some(start), Some(end)) => {
                            extract_context_from_positions(&row.content, start, end, 200)
                        }
                        _ => {
                            // Fallback to string search for old marks without positions
                            extract_context(&row.content, &row.original_text, 200)
                        }
                    };

                    MarkWithContext {
                        id: row.id.unwrap_or(0),
                        text_id: row.text_id,
                        text_title: row.title,
                        start_position: start_pos,
                        end_position: end_pos,
                        marked_text: row.original_text,
                        before_context,
                        after_context,
                        has_card: row.card_count > 0,
                        created_at: DateTime::from_naive_utc_and_offset(row.created_at, Utc),
                    }
                })
                .collect();

            (total_count, marks)
        }
        ScopeType::Folder => {
            let folder_id = scope_id
                .ok_or_else(|| "Folder ID required for folder scope".to_string())?;

            // Get total count first
            let total_count: i64 = sqlx::query_scalar!(
                r#"
                SELECT COUNT(*) as "count!"
                FROM cloze_notes cn
                INNER JOIN texts t ON cn.text_id = t.id
                WHERE cn.status IN ('pending', 'skipped')
                  AND (SELECT COUNT(*) FROM flashcards WHERE cloze_note_id = cn.id) = 0
                  AND t.folder_id IN (
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
            .fetch_one(pool)
            .await
            .map_err(|e| format!("Failed to count folder marks: {}", e))?;

            // Get pending marks from texts in specified folder AND all its subfolders (recursive)
            let rows = sqlx::query!(
                r#"
                SELECT
                    cn.id,
                    cn.text_id,
                    t.title,
                    t.content,
                    cn.original_text,
                    cn.start_position,
                    cn.end_position,
                    cn.created_at,
                    (SELECT COUNT(*) FROM flashcards WHERE cloze_note_id = cn.id) as card_count
                FROM cloze_notes cn
                INNER JOIN texts t ON cn.text_id = t.id
                WHERE cn.status IN ('pending', 'skipped')
                  AND (SELECT COUNT(*) FROM flashcards WHERE cloze_note_id = cn.id) = 0
                  AND t.folder_id IN (
                    WITH RECURSIVE folder_tree AS (
                        SELECT id FROM folders WHERE id = ?
                        UNION ALL
                        SELECT f.id FROM folders f
                        INNER JOIN folder_tree ft ON f.parent_id = ft.id
                    )
                    SELECT id FROM folder_tree
                )
                ORDER BY cn.last_seen_at ASC NULLS FIRST, cn.created_at ASC
                LIMIT ? OFFSET ?
                "#,
                folder_id,
                clamped_limit,
                offset_val
            )
            .fetch_all(pool)
            .await
            .map_err(|e| format!("Failed to fetch folder marks: {}", e))?;

            let marks: Vec<MarkWithContext> = rows.into_iter()
                .map(|row| {
                    // Use stored positions if available, otherwise fallback to string search
                    let (before_context, after_context, start_pos, end_pos) = match (row.start_position, row.end_position) {
                        (Some(start), Some(end)) => {
                            extract_context_from_positions(&row.content, start, end, 200)
                        }
                        _ => {
                            // Fallback to string search for old marks without positions
                            extract_context(&row.content, &row.original_text, 200)
                        }
                    };

                    MarkWithContext {
                        id: row.id.unwrap_or(0),
                        text_id: row.text_id,
                        text_title: row.title,
                        start_position: start_pos,
                        end_position: end_pos,
                        marked_text: row.original_text,
                        before_context,
                        after_context,
                        has_card: row.card_count > 0,
                        created_at: DateTime::from_naive_utc_and_offset(row.created_at, Utc),
                    }
                })
                .collect();

            (total_count, marks)
        }
        ScopeType::Text => {
            let text_id = scope_id
                .ok_or_else(|| "Text ID required for text scope".to_string())?
                .parse::<i64>()
                .map_err(|e| format!("Invalid text ID: {}", e))?;

            // Get total count first
            let total_count: i64 = sqlx::query_scalar!(
                r#"
                SELECT COUNT(*) as "count!"
                FROM cloze_notes cn
                WHERE cn.status IN ('pending', 'skipped')
                  AND (SELECT COUNT(*) FROM flashcards WHERE cloze_note_id = cn.id) = 0
                  AND cn.text_id = ?
                "#,
                text_id
            )
            .fetch_one(pool)
            .await
            .map_err(|e| format!("Failed to count text marks: {}", e))?;

            // Get pending marks from specific text
            let rows = sqlx::query!(
                r#"
                SELECT
                    cn.id,
                    cn.text_id,
                    t.title,
                    t.content,
                    cn.original_text,
                    cn.start_position,
                    cn.end_position,
                    cn.created_at,
                    (SELECT COUNT(*) FROM flashcards WHERE cloze_note_id = cn.id) as "card_count!: i64"
                FROM cloze_notes cn
                INNER JOIN texts t ON cn.text_id = t.id
                WHERE cn.status IN ('pending', 'skipped')
                  AND (SELECT COUNT(*) FROM flashcards WHERE cloze_note_id = cn.id) = 0
                  AND cn.text_id = ?
                ORDER BY cn.last_seen_at ASC NULLS FIRST, cn.created_at ASC
                LIMIT ? OFFSET ?
                "#,
                text_id,
                clamped_limit,
                offset_val
            )
            .fetch_all(pool)
            .await
            .map_err(|e| format!("Failed to fetch text marks: {}", e))?;

            let marks: Vec<MarkWithContext> = rows.into_iter()
                .map(|row| {
                    // Use stored positions if available, otherwise fallback to string search
                    let (before_context, after_context, start_pos, end_pos) = match (row.start_position, row.end_position) {
                        (Some(start), Some(end)) => {
                            extract_context_from_positions(&row.content, start, end, 200)
                        }
                        _ => {
                            // Fallback to string search for old marks without positions
                            extract_context(&row.content, &row.original_text, 200)
                        }
                    };

                    MarkWithContext {
                        id: row.id.unwrap_or(0),
                        text_id: row.text_id,
                        text_title: row.title,
                        start_position: start_pos,
                        end_position: end_pos,
                        marked_text: row.original_text,
                        before_context,
                        after_context,
                        has_card: row.card_count > 0,
                        created_at: DateTime::from_naive_utc_and_offset(row.created_at, Utc),
                    }
                })
                .collect();

            (total_count, marks)
        }
    };

    let marks_len = marks.len() as i64;
    Ok(HubMarksResponse {
        marks,
        total_count,
        has_more: offset_val + marks_len < total_count,
        current_offset: offset_val,
    })
}

/// Skip a mark - mark as skipped for current session (will reappear later)
/// Updates last_seen_at and increments session_count
#[tauri::command]
pub async fn skip_mark(
    mark_id: i64,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<(), String> {
    let db = db.lock().await;
    let pool = db.pool();
    let now = Utc::now();

    sqlx::query!(
        r#"
        UPDATE cloze_notes
        SET status = 'skipped',
            last_seen_at = ?,
            session_count = session_count + 1,
            updated_at = ?
        WHERE id = ?
        "#,
        now,
        now,
        mark_id
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to skip mark: {}", e))?;

    Ok(())
}

/// Delete a mark - permanently remove from database
/// Flashcards created from this mark will be preserved (ON DELETE SET NULL)
#[tauri::command]
pub async fn delete_mark(
    mark_id: i64,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<(), String> {
    let db = db.lock().await;
    let pool = db.pool();

    sqlx::query!(
        r#"
        DELETE FROM cloze_notes
        WHERE id = ?
        "#,
        mark_id
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to delete mark: {}", e))?;

    Ok(())
}

/// Get hub statistics for dashboard and progress tracking
#[tauri::command]
pub async fn get_hub_stats(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<HubStats, String> {
    let db = db.lock().await;
    let pool = db.pool();
    let now = Utc::now();

    // Get pending marks count
    let pending_result = sqlx::query!(
        r#"
        SELECT COUNT(*) as count
        FROM cloze_notes
        WHERE status = 'pending'
        "#
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to count pending marks: {}", e))?;

    // Get skipped marks count
    let skipped_result = sqlx::query!(
        r#"
        SELECT COUNT(*) as count
        FROM cloze_notes
        WHERE status = 'skipped'
        "#
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to count skipped marks: {}", e))?;

    // Get converted marks count
    let converted_result = sqlx::query!(
        r#"
        SELECT COUNT(*) as count
        FROM cloze_notes
        WHERE status = 'converted'
        "#
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to count converted marks: {}", e))?;

    // Get cards created today
    let today_result = sqlx::query!(
        r#"
        SELECT COUNT(*) as count
        FROM flashcards
        WHERE DATE(created_at) = DATE(?)
        "#,
        now
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to count today's cards: {}", e))?;

    // Get cards created this week (last 7 days)
    let week_result = sqlx::query!(
        r#"
        SELECT COUNT(*) as count
        FROM flashcards
        WHERE datetime(created_at) >= datetime(?, '-7 days')
        "#,
        now
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to count week's cards: {}", e))?;

    Ok(HubStats {
        pending: pending_result.count,
        skipped: skipped_result.count,
        converted: converted_result.count,
        today_count: today_result.count,
        week_count: week_result.count,
    })
}

/// Create flashcards from a mark with cloze deletions
/// Parses cloze text, creates multiple flashcards (one per cloze deletion), and marks the cloze note as 'converted'
#[tauri::command]
pub async fn create_card_from_mark(
    mark_id: i64,
    selected_text: String,
    cloze_text: String,
    db_state: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<CreatedCard>, String> {
    use crate::services::cloze_parser::ClozeParser;

    let db = db_state.lock().await;
    let pool = db.pool();
    let now = Utc::now();
    let user_id = 1;

    // Get the cloze note details including positions
    let cloze_note = sqlx::query!(
        r#"
        SELECT cn.id, cn.text_id, t.title as text_title, cn.start_position, cn.end_position
        FROM cloze_notes cn
        INNER JOIN texts t ON cn.text_id = t.id
        WHERE cn.id = ?
        "#,
        mark_id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch cloze note: {}", e))?;

    // Parse the cloze text to extract segments and cloze numbers
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

    // Update the cloze note with parsed segments and cloze count
    sqlx::query!(
        r#"
        UPDATE cloze_notes
        SET parsed_segments = ?,
            cloze_count = ?,
            original_text = ?,
            updated_at = ?
        WHERE id = ?
        "#,
        parsed_segments_json,
        cloze_count,
        cloze_text,
        now,
        mark_id
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to update cloze note: {}", e))?;

    // Get the max display_index for this text
    let max_display_result = sqlx::query!(
        "SELECT COALESCE(MAX(display_index), 0) as max_idx FROM flashcards WHERE text_id = ?",
        cloze_note.text_id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to get max display_index: {}", e))?;

    let mut next_display_index = max_display_result.max_idx + 1;
    let mut created_cards = Vec::new();

    // Create a flashcard for each cloze deletion
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
            cloze_note.text_id,
            user_id,
            selected_text,
            cloze_text,
            cloze_index,
            next_display_index,
            cloze_number,
            mark_id,
            now,
            now,
            now,  // due immediately
            0.0,  // stability
            0.0,  // difficulty
            0,    // elapsed_days
            0,    // scheduled_days
            0,    // reps
            0,    // lapses
            0,    // state: New
            None::<chrono::DateTime<Utc>>  // last_review
        )
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to create flashcard for cloze {}: {}", cloze_number, e))?;

        let flashcard_id = flashcard_result.last_insert_rowid();

        created_cards.push(CreatedCard {
            id: flashcard_id,
            mark_id,
            question: cloze_text.clone(),
            answer: format!("Cloze {}", cloze_number),
            created_at: now,
            text_id: cloze_note.text_id,
            text_title: cloze_note.text_title.clone(),
        });

        next_display_index += 1;
    }

    // Mark the range as read if positions are available
    // This ensures the text is marked as completed even if portions are already read
    if let (Some(start_pos), Some(end_pos)) = (cloze_note.start_position, cloze_note.end_position) {
        use crate::commands::reading::mark_range_as_read;

        // Drop the database lock before calling mark_range_as_read to avoid deadlock
        drop(db);

        // Mark the range as read (with auto_completed flag set to true)
        // The mark_range_as_read function will automatically skip already-read portions
        mark_range_as_read(
            cloze_note.text_id,
            start_pos,
            end_pos,
            None, // session_id
            None, // character_count
            None, // word_count
            Some(true), // is_auto_completed
            db_state.clone(),
        )
        .await
        .map_err(|e| format!("Failed to mark range as read: {}", e))?;

        // Re-acquire the lock
        let db = db_state.lock().await;
        let pool = db.pool();

        // Mark the cloze note as 'converted'
        sqlx::query!(
            r#"
            UPDATE cloze_notes
            SET status = 'converted', updated_at = ?
            WHERE id = ?
            "#,
            now,
            mark_id
        )
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to update cloze note status: {}", e))?;
    } else {
        // If no positions available, just mark as converted
        sqlx::query!(
            r#"
            UPDATE cloze_notes
            SET status = 'converted', updated_at = ?
            WHERE id = ?
            "#,
            now,
            mark_id
        )
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to update cloze note status: {}", e))?;
    }

    Ok(created_cards)
}
