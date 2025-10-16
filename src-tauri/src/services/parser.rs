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
    let mut paragraph_index = 0;

    let chars: Vec<char> = content.chars().collect();
    let mut pos = 0;

    while pos < chars.len() {
        while pos < chars.len() && (chars[pos] == '\n' || chars[pos] == '\r' || chars[pos] == ' ' || chars[pos] == '\t') {
            pos += 1;
        }

        if pos >= chars.len() {
            break;
        }

        let start = pos;

        let mut consecutive_newlines = 0;
        while pos < chars.len() {
            if chars[pos] == '\n' {
                consecutive_newlines += 1;
                if consecutive_newlines >= 2 {
                    break;
                }
            } else if chars[pos] != '\r' {
                consecutive_newlines = 0;
            }
            pos += 1;
        }

        let mut end = pos;
        while end > start && (chars[end - 1] == '\n' || chars[end - 1] == '\r' || chars[end - 1] == ' ' || chars[end - 1] == '\t') {
            end -= 1;
        }

        if end > start {
            let char_count = (end - start) as i64;
            paragraphs.push(Paragraph {
                paragraph_index,
                start_position: start as i64,
                end_position: end as i64,
                character_count: char_count,
            });
            paragraph_index += 1;
        }
    }

    if paragraphs.is_empty() && !content.trim().is_empty() {
        let char_count = content.trim().chars().count() as i64;
        paragraphs.push(Paragraph {
            paragraph_index: 0,
            start_position: 0,
            end_position: char_count,
            character_count: char_count,
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
    let re = match Regex::new(r"\[\[exclude\]\](.*?)\[\[/exclude\]\]") {
        Ok(r) => r,
        Err(_) => return 0,
    };
    let mut total_excluded = 0i64;

    for cap in re.captures_iter(content) {
        if let Some(excluded_text) = cap.get(1) {
            total_excluded += excluded_text.as_str().chars().count() as i64;
        }
    }

    total_excluded
}

#[derive(Debug, Clone)]
pub struct HeaderRange {
    pub start_position: i64,
    pub end_position: i64,
}

fn byte_offset_to_char_offset(content: &str, byte_offset: usize) -> usize {
    content[..byte_offset].chars().count()
}

pub fn detect_header_ranges(content: &str) -> Vec<HeaderRange> {
    let mut header_ranges = Vec::new();

    let re = match Regex::new(r"(?m)^(={2,})\s*(.+?)\s*(={2,})$") {
        Ok(r) => r,
        Err(_) => return header_ranges,
    };

    for cap in re.captures_iter(content) {
        if let (Some(full_match), Some(opening), Some(closing)) = (cap.get(0), cap.get(1), cap.get(3)) {
            let opening_count = opening.as_str().len();
            let closing_count = closing.as_str().len();

            if opening_count == closing_count {
                let start_char = byte_offset_to_char_offset(content, full_match.start()) as i64;
                let header_text = &content[full_match.start()..full_match.end()];
                let end_char = start_char + header_text.chars().count() as i64;

                header_ranges.push(HeaderRange {
                    start_position: start_char,
                    end_position: end_char,
                });
            }
        }
    }

    header_ranges
}

pub fn calculate_header_character_count(content: &str) -> i64 {
    let header_ranges = detect_header_ranges(content);
    header_ranges.iter().map(|h| h.end_position - h.start_position).sum()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_header_ranges_h2() {
        let content = "Some text\n\n== Header 2 ==\n\nMore text";
        let headers = detect_header_ranges(content);
        assert_eq!(headers.len(), 1);
        assert!(headers[0].end_position > headers[0].start_position);
    }

    #[test]
    fn test_detect_header_ranges_h3() {
        let content = "Text\n\n=== Header 3 ===\n\nContent";
        let headers = detect_header_ranges(content);
        assert_eq!(headers.len(), 1);
    }

    #[test]
    fn test_detect_header_ranges_h4() {
        let content = "Text\n\n==== Header 4 ====\n\nContent";
        let headers = detect_header_ranges(content);
        assert_eq!(headers.len(), 1);
    }

    #[test]
    fn test_detect_header_ranges_multiple() {
        let content = r#"
== Header 2 ==

Content

=== Header 3 ===

More content

==== Header 4 ====

Final content
"#;
        let headers = detect_header_ranges(content);
        assert_eq!(headers.len(), 3);
    }

    #[test]
    fn test_detect_header_ranges_mismatched_equals() {
        let content = "Text\n\n=== Not A Header ==\n\nContent";
        let headers = detect_header_ranges(content);
        assert_eq!(headers.len(), 0);
    }

    #[test]
    fn test_detect_header_ranges_no_panic() {
        let content = "== Valid Header ==\n=== Also Valid ===\n==== Another ====";
        let headers = detect_header_ranges(content);
        assert_eq!(headers.len(), 3);
    }

    #[test]
    fn test_calculate_header_character_count() {
        let content = "Text\n\n== Header ==\n\nContent";
        let count = calculate_header_character_count(content);
        assert!(count > 0);
    }
}
