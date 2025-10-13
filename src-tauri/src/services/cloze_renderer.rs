use anyhow::Result;
use serde::{Deserialize, Serialize};
use crate::services::cloze_parser::{ClozeParser, ParsedCloze};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RenderedCloze {
    pub html: String,
    pub cloze_number: u32,
}

pub struct ClozeRenderer;

impl ClozeRenderer {
    pub fn render(text: &str, active_cloze: u32) -> Result<RenderedCloze> {
        let parsed = ClozeParser::parse(text)?;
        let html = Self::render_parsed(&parsed, active_cloze);

        Ok(RenderedCloze {
            html,
            cloze_number: active_cloze,
        })
    }

    pub fn render_all(text: &str) -> Result<Vec<RenderedCloze>> {
        let cloze_numbers = ClozeParser::extract_cloze_numbers(text)?;
        let mut rendered = Vec::new();

        for cloze_num in cloze_numbers {
            rendered.push(Self::render(text, cloze_num)?);
        }

        Ok(rendered)
    }

    fn render_parsed(parsed: &ParsedCloze, active_cloze: u32) -> String {
        let mut result = String::new();
        let mut last_pos = 0;

        for segment in &parsed.segments {
            result.push_str(&parsed.original_text[last_pos..segment.start_position]);

            if segment.cloze_number == active_cloze {
                let hint_attr = segment
                    .hint
                    .as_ref()
                    .map(|h| format!(" data-hint=\"{}\"", html_escape(h)))
                    .unwrap_or_default();

                result.push_str(&format!(
                    "<span class=\"cloze-hidden\"{}>[...]</span>",
                    hint_attr
                ));
            } else {
                result.push_str(&format!(
                    "<span class=\"cloze-visible\">{}</span>",
                    html_escape(&segment.text)
                ));
            }

            last_pos = segment.end_position;
        }

        result.push_str(&parsed.original_text[last_pos..]);
        result
    }

    pub fn render_with_all_visible(text: &str) -> Result<String> {
        let parsed = ClozeParser::parse(text)?;
        let mut result = String::new();
        let mut last_pos = 0;

        for segment in &parsed.segments {
            result.push_str(&parsed.original_text[last_pos..segment.start_position]);
            result.push_str(&html_escape(&segment.text));
            last_pos = segment.end_position;
        }

        result.push_str(&parsed.original_text[last_pos..]);
        Ok(result)
    }

    pub fn strip_cloze_syntax(text: &str) -> String {
        match Self::render_with_all_visible(text) {
            Ok(stripped) => stripped,
            Err(_) => text.to_string(),
        }
    }
}

fn html_escape(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_render_single_cloze() {
        let text = "The capital of France is {{c1::Paris}}.";
        let result = ClozeRenderer::render(text, 1).unwrap();

        assert!(result.html.contains("<span class=\"cloze-hidden\">[...]</span>"));
        assert!(!result.html.contains("Paris"));
        assert!(result.html.contains("The capital of France is"));
    }

    #[test]
    fn test_render_with_hint() {
        let text = "The capital of France is {{c1::Paris::city}}.";
        let result = ClozeRenderer::render(text, 1).unwrap();

        assert!(result.html.contains("data-hint=\"city\""));
        assert!(result.html.contains("<span class=\"cloze-hidden\""));
    }

    #[test]
    fn test_render_multiple_clozes_hide_first() {
        let text = "{{c1::Paris}} is the capital of {{c2::France}}.";
        let result = ClozeRenderer::render(text, 1).unwrap();

        assert!(result.html.contains("<span class=\"cloze-hidden\">[...]</span>"));
        assert!(result.html.contains("<span class=\"cloze-visible\">France</span>"));
        assert!(!result.html.contains("Paris"));
    }

    #[test]
    fn test_render_multiple_clozes_hide_second() {
        let text = "{{c1::Paris}} is the capital of {{c2::France}}.";
        let result = ClozeRenderer::render(text, 2).unwrap();

        assert!(result.html.contains("<span class=\"cloze-visible\">Paris</span>"));
        assert!(result.html.contains("<span class=\"cloze-hidden\">[...]</span>"));
        assert!(!result.html.contains("France"));
    }

    #[test]
    fn test_render_same_cloze_number() {
        let text = "{{c1::Paris}} and {{c1::Lyon}} are cities.";
        let result = ClozeRenderer::render(text, 1).unwrap();

        let hidden_count = result.html.matches("<span class=\"cloze-hidden\"").count();
        assert_eq!(hidden_count, 2);
        assert!(!result.html.contains("Paris"));
        assert!(!result.html.contains("Lyon"));
    }

    #[test]
    fn test_render_all() {
        let text = "{{c1::Paris}} is in {{c2::France}} and {{c3::Europe}}.";
        let results = ClozeRenderer::render_all(text).unwrap();

        assert_eq!(results.len(), 3);
        assert_eq!(results[0].cloze_number, 1);
        assert_eq!(results[1].cloze_number, 2);
        assert_eq!(results[2].cloze_number, 3);
    }

    #[test]
    fn test_render_with_all_visible() {
        let text = "{{c1::Paris}} is the capital of {{c2::France}}.";
        let result = ClozeRenderer::render_with_all_visible(text).unwrap();

        assert_eq!(result, "Paris is the capital of France.");
        assert!(!result.contains("{{"));
        assert!(!result.contains("}}"));
    }

    #[test]
    fn test_strip_cloze_syntax() {
        let text = "The answer is {{c1::42::number}}.";
        let result = ClozeRenderer::strip_cloze_syntax(text);

        assert_eq!(result, "The answer is 42.");
    }

    #[test]
    fn test_html_escape() {
        let text = "The code is {{c1::<div>test</div>}}.";
        let result = ClozeRenderer::render(text, 1).unwrap();

        assert!(!result.html.contains("<div>"));
        assert!(result.html.contains("&lt;div&gt;") || result.html.contains("[...]"));
    }

    #[test]
    fn test_render_inactive_cloze() {
        let text = "The capital is {{c1::Paris}}.";
        let result = ClozeRenderer::render(text, 2).unwrap();

        assert!(result.html.contains("<span class=\"cloze-visible\">Paris</span>"));
        assert!(!result.html.contains("cloze-hidden"));
    }
}
