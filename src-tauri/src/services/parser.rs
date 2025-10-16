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

    // Convert to UTF-16 code units to match JavaScript's string.length
    let utf16_units: Vec<u16> = content.encode_utf16().collect();
    let mut pos = 0;

    // Helper to check if a UTF-16 code unit is whitespace
    let is_whitespace = |unit: u16| -> bool {
        // Check for common whitespace characters in BMP (Basic Multilingual Plane)
        unit == 0x0020 || // space
        unit == 0x0009 || // tab
        unit == 0x000A || // newline (LF)
        unit == 0x000D    // carriage return (CR)
    };

    let is_newline = |unit: u16| -> bool {
        unit == 0x000A // newline (LF)
    };

    while pos < utf16_units.len() {
        // Skip leading whitespace
        while pos < utf16_units.len() && is_whitespace(utf16_units[pos]) {
            pos += 1;
        }

        if pos >= utf16_units.len() {
            break;
        }

        let start = pos;

        // Find paragraph end (double newline)
        let mut consecutive_newlines = 0;
        while pos < utf16_units.len() {
            if is_newline(utf16_units[pos]) {
                consecutive_newlines += 1;
                if consecutive_newlines >= 2 {
                    break;
                }
            } else if utf16_units[pos] != 0x000D {  // Not CR
                consecutive_newlines = 0;
            }
            pos += 1;
        }

        // Trim trailing whitespace
        let mut end = pos;
        while end > start && is_whitespace(utf16_units[end - 1]) {
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
        // Use UTF-16 code units to match JavaScript's string.length
        let char_count = content.trim().encode_utf16().count() as i64;
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
            // Use UTF-16 code units to match JavaScript's string.length
            total_excluded += excluded_text.as_str().encode_utf16().count() as i64;
        }
    }

    total_excluded
}

#[derive(Debug, Clone)]
pub struct HeaderRange {
    pub start_position: i64,
    pub end_position: i64,
}

// Convert byte offset to UTF-16 code unit offset to match JavaScript's string.length
fn byte_offset_to_utf16_offset(content: &str, byte_offset: usize) -> usize {
    content[..byte_offset].encode_utf16().count()
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
                let start_char = byte_offset_to_utf16_offset(content, full_match.start()) as i64;
                let header_text = &content[full_match.start()..full_match.end()];
                // Use UTF-16 code units to match JavaScript's string.length
                let end_char = start_char + header_text.encode_utf16().count() as i64;

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

    // UTF-16 Bug #4 Tests - Emoji and Multi-byte Characters

    #[test]
    fn test_excluded_character_count_with_emoji() {
        let content = "Hello [[exclude]]👋 world[[/exclude]] Test";
        let excluded = calculate_excluded_character_count(content);
        // "👋 world" = 8 UTF-16 code units (👋 is 2 units + 1 space + 5 chars)
        assert_eq!(excluded, 8);
    }

    #[test]
    fn test_excluded_character_count_with_chinese() {
        let content = "Hello [[exclude]]世界 测试[[/exclude]] World";
        let excluded = calculate_excluded_character_count(content);
        // "世界 测试" = 5 UTF-16 code units (each CJK char is 1 unit)
        assert_eq!(excluded, 5);
    }

    #[test]
    fn test_excluded_character_count_mixed_unicode() {
        let content = "Test [[exclude]]👋 世界 测试[[/exclude]] End";
        let excluded = calculate_excluded_character_count(content);
        // "👋 世界 测试" = 8 UTF-16 code units (👋=2, space=1, 世=1, 界=1, space=1, 测=1, 试=1)
        assert_eq!(excluded, 8);
    }

    #[test]
    fn test_header_character_count_with_emoji() {
        let content = "== Test 👋 World ==\nContent";
        let header_count = calculate_header_character_count(content);
        // "== Test 👋 World ==" = 19 UTF-16 code units (👋 is 2 units)
        assert_eq!(header_count, 19);
    }

    #[test]
    fn test_header_character_count_with_chinese() {
        let content = "== Test 世界 ==\nContent";
        let header_count = calculate_header_character_count(content);
        // "== Test 世界 ==" = 13 UTF-16 code units
        assert_eq!(header_count, 13);
    }

    #[test]
    fn test_paragraph_detection_with_emoji() {
        let content = "First 👋\n\nSecond 世界";
        let paragraphs = detect_paragraphs(content);

        assert_eq!(paragraphs.len(), 2);

        // First paragraph: "First 👋" = 8 UTF-16 code units (👋 is 2 units)
        assert_eq!(paragraphs[0].start_position, 0);
        assert_eq!(paragraphs[0].end_position, 8);
        assert_eq!(paragraphs[0].character_count, 8);

        // Second paragraph: "Second 世界" = 9 UTF-16 code units
        assert_eq!(paragraphs[1].start_position, 10); // 8 + 2 for "\n\n"
        assert_eq!(paragraphs[1].end_position, 19);
        assert_eq!(paragraphs[1].character_count, 9);
    }

    #[test]
    fn test_paragraph_detection_multiple_emoji() {
        let content = "Hi 👋 Test 😀 World";
        let paragraphs = detect_paragraphs(content);

        assert_eq!(paragraphs.len(), 1);

        // "Hi 👋 Test 😀 World" = 19 UTF-16 code units
        // H(1) i(1) space(1) 👋(2) space(1) T(1) e(1) s(1) t(1) space(1) 😀(2) space(1) W(1) o(1) r(1) l(1) d(1)
        assert_eq!(paragraphs[0].character_count, 19);
    }

    #[test]
    fn test_utf16_consistency_with_javascript() {
        // This test verifies that Rust's encode_utf16().count() matches JavaScript's .length
        let test_cases = vec![
            ("Hello World", 11),
            ("Hello 👋 World", 14),  // 👋 is a surrogate pair (2 UTF-16 units)
            ("世界", 2),
            ("Hi 👋 Test 😀 World", 19),
            ("👋😀🎉", 6),  // Each emoji is 2 UTF-16 units
        ];

        for (text, expected_length) in test_cases {
            let utf16_length = text.encode_utf16().count();
            assert_eq!(utf16_length, expected_length,
                "Failed for text: '{}'. Expected {}, got {}",
                text, expected_length, utf16_length);
        }
    }

    #[test]
    fn test_ascii_only_unchanged() {
        // Verify ASCII text behavior is unchanged
        let content = "Hello [[exclude]]test[[/exclude]] World";
        let excluded = calculate_excluded_character_count(content);
        assert_eq!(excluded, 4); // "test" = 4 UTF-16 units (same as chars)
    }

    #[test]
    fn test_fallback_paragraph_with_emoji() {
        // Test single paragraph fallback with emoji
        let content = "Single paragraph with 👋 emoji";
        let paragraphs = detect_paragraphs(content);

        assert_eq!(paragraphs.len(), 1);
        // "Single paragraph with 👋 emoji" = 30 UTF-16 code units (👋 = 2)
        assert_eq!(paragraphs[0].character_count, 30);
    }
}
