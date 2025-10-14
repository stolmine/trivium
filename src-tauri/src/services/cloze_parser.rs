use anyhow::{anyhow, Result};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::sync::LazyLock;

static CLOZE_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\{\{c(\d+)::([^}]*?)(?:::([^}]+?))?\}\}").unwrap()
});

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ClozeSegment {
    pub cloze_number: u32,
    pub text: String,
    pub hint: Option<String>,
    pub start_position: usize,
    pub end_position: usize,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ParsedCloze {
    pub original_text: String,
    pub segments: Vec<ClozeSegment>,
}

#[derive(Debug, Clone)]
pub enum ClozeParseError {
    EmptyCloze,
    InvalidClozeNumber(String),
    UnmatchedBraces,
    NestedClozes,
}

impl std::fmt::Display for ClozeParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ClozeParseError::EmptyCloze => write!(f, "Cloze deletion contains empty text"),
            ClozeParseError::InvalidClozeNumber(num) => {
                write!(f, "Invalid cloze number: {}", num)
            }
            ClozeParseError::UnmatchedBraces => write!(f, "Unmatched braces in cloze syntax"),
            ClozeParseError::NestedClozes => write!(f, "Nested cloze deletions are not supported"),
        }
    }
}

impl std::error::Error for ClozeParseError {}

pub struct ClozeParser;

impl ClozeParser {
    pub fn parse(text: &str) -> Result<ParsedCloze> {
        Self::validate_braces(text)?;
        Self::validate_no_nesting(text)?;

        let mut segments = Vec::new();

        for cap in CLOZE_REGEX.captures_iter(text) {
            let full_match = cap.get(0).unwrap();
            let cloze_num_str = cap.get(1).unwrap().as_str();
            let cloze_text = cap.get(2).unwrap().as_str();
            let hint = cap.get(3).map(|m| m.as_str().to_string());

            let cloze_number = cloze_num_str
                .parse::<u32>()
                .map_err(|_| ClozeParseError::InvalidClozeNumber(cloze_num_str.to_string()))?;

            if cloze_number == 0 {
                return Err(anyhow!(ClozeParseError::InvalidClozeNumber(
                    cloze_num_str.to_string()
                )));
            }

            if cloze_text.trim().is_empty() {
                return Err(anyhow!(ClozeParseError::EmptyCloze));
            }

            segments.push(ClozeSegment {
                cloze_number,
                text: cloze_text.to_string(),
                hint,
                start_position: full_match.start(),
                end_position: full_match.end(),
            });
        }

        Ok(ParsedCloze {
            original_text: text.to_string(),
            segments,
        })
    }

    pub fn extract_cloze_numbers(text: &str) -> Result<Vec<u32>> {
        let parsed = Self::parse(text)?;
        let mut numbers: Vec<u32> = parsed
            .segments
            .iter()
            .map(|s| s.cloze_number)
            .collect();
        numbers.sort_unstable();
        numbers.dedup();
        Ok(numbers)
    }

    pub fn has_cloze_deletions(text: &str) -> bool {
        CLOZE_REGEX.is_match(text)
    }

    pub fn count_cloze_deletions(text: &str) -> usize {
        match Self::extract_cloze_numbers(text) {
            Ok(numbers) => numbers.len(),
            Err(_) => 0,
        }
    }

    fn validate_braces(text: &str) -> Result<()> {
        let mut depth = 0;
        let mut i = 0;
        let chars: Vec<char> = text.chars().collect();

        while i < chars.len() {
            if i + 1 < chars.len() && chars[i] == '{' && chars[i + 1] == '{' {
                depth += 1;
                i += 2;
            } else if i + 1 < chars.len() && chars[i] == '}' && chars[i + 1] == '}' {
                depth -= 1;
                if depth < 0 {
                    return Err(anyhow!(ClozeParseError::UnmatchedBraces));
                }
                i += 2;
            } else {
                i += 1;
            }
        }

        if depth != 0 {
            return Err(anyhow!(ClozeParseError::UnmatchedBraces));
        }

        Ok(())
    }

    fn validate_no_nesting(text: &str) -> Result<()> {
        let mut depth = 0;
        let mut i = 0;
        let chars: Vec<char> = text.chars().collect();

        while i < chars.len() {
            if i + 1 < chars.len() && chars[i] == '{' && chars[i + 1] == '{' {
                depth += 1;
                if depth > 1 {
                    return Err(anyhow!(ClozeParseError::NestedClozes));
                }
                i += 2;
            } else if i + 1 < chars.len() && chars[i] == '}' && chars[i + 1] == '}' {
                depth -= 1;
                i += 2;
            } else {
                i += 1;
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_cloze() {
        let text = "The capital of France is {{c1::Paris}}.";
        let result = ClozeParser::parse(text).unwrap();

        assert_eq!(result.segments.len(), 1);
        assert_eq!(result.segments[0].cloze_number, 1);
        assert_eq!(result.segments[0].text, "Paris");
        assert_eq!(result.segments[0].hint, None);
    }

    #[test]
    fn test_parse_cloze_with_hint() {
        let text = "The capital of France is {{c1::Paris::city}}.";
        let result = ClozeParser::parse(text).unwrap();

        assert_eq!(result.segments.len(), 1);
        assert_eq!(result.segments[0].cloze_number, 1);
        assert_eq!(result.segments[0].text, "Paris");
        assert_eq!(result.segments[0].hint, Some("city".to_string()));
    }

    #[test]
    fn test_parse_multiple_clozes() {
        let text = "{{c1::Paris}} is the capital of {{c2::France}}.";
        let result = ClozeParser::parse(text).unwrap();

        assert_eq!(result.segments.len(), 2);
        assert_eq!(result.segments[0].cloze_number, 1);
        assert_eq!(result.segments[0].text, "Paris");
        assert_eq!(result.segments[1].cloze_number, 2);
        assert_eq!(result.segments[1].text, "France");
    }

    #[test]
    fn test_parse_same_cloze_number() {
        let text = "{{c1::Paris}} and {{c1::Lyon}} are cities in France.";
        let result = ClozeParser::parse(text).unwrap();

        assert_eq!(result.segments.len(), 2);
        assert_eq!(result.segments[0].cloze_number, 1);
        assert_eq!(result.segments[1].cloze_number, 1);
    }

    #[test]
    fn test_empty_cloze() {
        let text = "The capital is {{c1::}}.";
        let result = ClozeParser::parse(text);

        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_cloze_number() {
        let text = "The capital is {{c0::Paris}}.";
        let result = ClozeParser::parse(text);

        assert!(result.is_err());
    }

    #[test]
    fn test_unmatched_braces() {
        let text = "The capital is {{c1::Paris}.";
        let result = ClozeParser::parse(text);

        assert!(result.is_err());
    }

    #[test]
    fn test_nested_clozes() {
        let text = "{{c1::The {{c2::nested}} text}}";
        let result = ClozeParser::parse(text);

        assert!(result.is_err());
    }

    #[test]
    fn test_extract_cloze_numbers() {
        let text = "{{c1::Paris}} is the capital of {{c2::France}} in {{c1::Europe}}.";
        let numbers = ClozeParser::extract_cloze_numbers(text).unwrap();

        assert_eq!(numbers, vec![1, 2]);
    }

    #[test]
    fn test_has_cloze_deletions() {
        assert!(ClozeParser::has_cloze_deletions("{{c1::text}}"));
        assert!(!ClozeParser::has_cloze_deletions("plain text"));
    }

    #[test]
    fn test_count_cloze_deletions() {
        let text = "{{c1::Paris}} is in {{c2::France}} and {{c1::Europe}}.";
        assert_eq!(ClozeParser::count_cloze_deletions(text), 2);
    }
}
