// Text parsing service
//
// Handles parsing and processing of text content.
//
// Responsibilities:
// - Parse cloze deletion syntax (e.g., "{{c1::hidden text}}")
// - Extract cloze deletions from text
// - Validate cloze syntax
// - Split text into sentences or logical chunks
// - Clean and normalize text content
// - Parse exclude tags ([[exclude]]...[[/exclude]])
//
// The parser supports Anki-style cloze deletion syntax, which is the
// standard format for creating fill-in-the-blank flashcards.

use anyhow::Result;
use regex::Regex;
use sqlx::{Pool, Sqlite};

#[derive(Debug, Clone)]
pub struct Paragraph {
    pub paragraph_index: i64,
    pub start_position: i64,
    pub end_position: i64,
    pub character_count: i64,
}

pub fn detect_paragraphs(content: &str) -> Vec<Paragraph> {
    let mut paragraphs = Vec::new();
    let mut current_position = 0;
    let mut paragraph_index = 0;

    let parts: Vec<&str> = content.split("\n\n").collect();

    for part in parts {
        let trimmed = part.trim();

        if trimmed.is_empty() {
            continue;
        }

        let start = content[current_position..]
            .find(trimmed)
            .map(|pos| current_position + pos)
            .unwrap_or(current_position);

        let end = start + trimmed.len();
        let char_count = trimmed.chars().count() as i64;

        paragraphs.push(Paragraph {
            paragraph_index,
            start_position: start as i64,
            end_position: end as i64,
            character_count: char_count,
        });

        paragraph_index += 1;
        current_position = end;
    }

    if paragraphs.is_empty() && !content.trim().is_empty() {
        let trimmed = content.trim();
        paragraphs.push(Paragraph {
            paragraph_index: 0,
            start_position: 0,
            end_position: trimmed.len() as i64,
            character_count: trimmed.chars().count() as i64,
        });
    }

    paragraphs
}

pub async fn store_paragraphs(
    pool: &Pool<Sqlite>,
    text_id: i64,
    paragraphs: &[Paragraph],
) -> Result<()> {
    for paragraph in paragraphs {
        sqlx::query!(
            r#"
            INSERT INTO paragraphs (text_id, paragraph_index, start_position, end_position, character_count)
            VALUES (?, ?, ?, ?, ?)
            "#,
            text_id,
            paragraph.paragraph_index,
            paragraph.start_position,
            paragraph.end_position,
            paragraph.character_count
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}

pub fn calculate_excluded_character_count(content: &str) -> i64 {
    let re = Regex::new(r"\[\[exclude\]\](.*?)\[\[/exclude\]\]").unwrap();
    let mut total_excluded = 0i64;

    for cap in re.captures_iter(content) {
        if let Some(excluded_text) = cap.get(1) {
            total_excluded += excluded_text.as_str().len() as i64;
        }
    }

    total_excluded
}
