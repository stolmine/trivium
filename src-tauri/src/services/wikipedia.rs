use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use regex::Regex;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::sync::LazyLock;

static REFERENCE_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\[\d+\]").unwrap()
});

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WikipediaArticle {
    pub title: String,
    pub extract: String,
    pub url: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub enum WikipediaError {
    InvalidUrl(String),
    ArticleNotFound(String),
    NetworkError(String),
    ParseError(String),
}

impl std::fmt::Display for WikipediaError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WikipediaError::InvalidUrl(msg) => write!(f, "Invalid Wikipedia URL: {}", msg),
            WikipediaError::ArticleNotFound(title) => {
                write!(f, "Wikipedia article not found: {}", title)
            }
            WikipediaError::NetworkError(msg) => write!(f, "Network error: {}", msg),
            WikipediaError::ParseError(msg) => write!(f, "Failed to parse response: {}", msg),
        }
    }
}

impl std::error::Error for WikipediaError {}

#[derive(Debug, Deserialize)]
struct WikiApiResponse {
    parse: WikiApiParse,
}

#[derive(Debug, Deserialize)]
struct WikiApiParse {
    title: String,
    pageid: i64,
    text: WikiApiText,
}

#[derive(Debug, Deserialize)]
struct WikiApiText {
    #[serde(rename = "*")]
    content: String,
}

pub async fn fetch_wikipedia_article(url: &str) -> Result<WikipediaArticle> {
    let title = extract_title_from_url(url)?;
    let encoded_title = urlencoding::encode(&title);

    let api_url = format!(
        "https://en.wikipedia.org/w/api.php?action=parse&page={}&format=json&prop=text",
        encoded_title
    );

    let client = reqwest::Client::builder()
        .user_agent("Trivium/0.1.0 (Incremental Reading Application; contact@example.com)")
        .build()
        .map_err(|e| anyhow!(WikipediaError::NetworkError(e.to_string())))?;

    let response = client
        .get(&api_url)
        .send()
        .await
        .map_err(|e| anyhow!(WikipediaError::NetworkError(e.to_string())))?;

    if !response.status().is_success() {
        return Err(anyhow!(WikipediaError::NetworkError(format!(
            "HTTP error: {}",
            response.status()
        ))));
    }

    let api_response: WikiApiResponse = response
        .json()
        .await
        .map_err(|e| anyhow!(WikipediaError::ParseError(e.to_string())))?;

    let html_content = &api_response.parse.text.content;
    let plain_text = html_to_plain_text(html_content)?;
    let text_without_refs = strip_reference_indicators(&plain_text);
    let cleaned_text = clean_empty_sections(&text_without_refs);

    Ok(WikipediaArticle {
        title: api_response.parse.title.clone(),
        extract: cleaned_text,
        url: url.to_string(),
        timestamp: Utc::now(),
    })
}

fn html_to_plain_text(html: &str) -> Result<String> {
    let document = Html::parse_fragment(html);

    let unwanted_selectors = vec![
        ".infobox",
        ".navbox",
        ".vertical-navbox",
        ".ambox",
        "table",
        ".reflist",
        ".reference",
        ".mw-editsection",
        "sup.reference",
        ".printfooter",
        ".catlinks",
        "#toc",
        ".toc",
        "style",
        "script",
        ".noexcerpt",
        ".geo-default",
        ".geo-dms",
        ".geo-dec",
        ".geo",
    ];

    let mut result = Vec::new();

    for node in document.root_element().children() {
        if let Some(elem) = scraper::ElementRef::wrap(node) {
            extract_text_recursive(elem, &mut result, &unwanted_selectors);
        }
    }

    let text = result.join("\n");
    let text = remove_css_artifacts(&text);
    let text = remove_wayback_artifacts(&text);
    let text = remove_coordinate_artifacts(&text);
    Ok(text)
}

fn extract_text_recursive(
    node: scraper::element_ref::ElementRef,
    result: &mut Vec<String>,
    unwanted_selectors: &[&str],
) {
    let tag_name = node.value().name();

    for sel_str in unwanted_selectors {
        if let Ok(selector) = Selector::parse(sel_str) {
            if matches_selector(node, &selector) {
                return;
            }
        }
    }

    match tag_name {
        "h1" | "h2" => {
            let text = node.text().collect::<String>().trim().to_string();
            if !text.is_empty() && !text.starts_with('[') {
                result.push(format!("\n\n== {} ==\n", text));
            }
        }
        "h3" => {
            let text = node.text().collect::<String>().trim().to_string();
            if !text.is_empty() && !text.starts_with('[') {
                result.push(format!("\n\n=== {} ===\n", text));
            }
        }
        "h4" | "h5" | "h6" => {
            let text = node.text().collect::<String>().trim().to_string();
            if !text.is_empty() && !text.starts_with('[') {
                result.push(format!("\n\n==== {} ====\n", text));
            }
        }
        "p" | "li" | "dd" => {
            let text = get_text_with_links(node).trim().to_string();
            if !text.is_empty() {
                result.push(text);
                result.push("".to_string());
            }
        }
        "ul" | "ol" | "dl" => {
            for child in node.children() {
                if let Some(elem) = scraper::ElementRef::wrap(child) {
                    extract_text_recursive(elem, result, unwanted_selectors);
                }
            }
        }
        "div" | "section" | "article" => {
            for child in node.children() {
                if let Some(elem) = scraper::ElementRef::wrap(child) {
                    extract_text_recursive(elem, result, unwanted_selectors);
                }
            }
        }
        "blockquote" => {
            let mut quote_parts = Vec::new();
            for child in node.children() {
                if let Some(elem) = scraper::ElementRef::wrap(child) {
                    extract_text_recursive(elem, &mut quote_parts, unwanted_selectors);
                }
            }

            if !quote_parts.is_empty() {
                let quote_text = quote_parts.join("\n");
                let trimmed = quote_text.trim();
                if !trimmed.is_empty() {
                    for line in trimmed.lines() {
                        let trimmed_line = line.trim();
                        if !trimmed_line.is_empty() {
                            result.push(format!("> {}", trimmed_line));
                        } else {
                            result.push(">".to_string());
                        }
                    }
                    result.push("".to_string());
                }
            }
        }
        _ => {}
    }
}

fn is_image_url(url: &str) -> bool {
    let lower = url.to_lowercase();
    lower.ends_with(".jpg") ||
    lower.ends_with(".jpeg") ||
    lower.ends_with(".png") ||
    lower.ends_with(".gif") ||
    lower.ends_with(".svg") ||
    lower.ends_with(".webp") ||
    lower.ends_with(".bmp") ||
    lower.ends_with(".ico")
}

fn get_text_with_links(node: scraper::element_ref::ElementRef) -> String {
    let mut result = String::new();
    for child in node.children() {
        if let Some(text) = child.value().as_text() {
            result.push_str(text);
        } else if let Some(elem) = scraper::ElementRef::wrap(child) {
            if elem.value().name() == "a" {
                let link_text = elem.text().collect::<String>();
                if let Some(href) = elem.value().attr("href") {
                    let full_url = if href.starts_with("/wiki/") {
                        format!("https://en.wikipedia.org{}", href)
                    } else if href.starts_with("http://") || href.starts_with("https://") {
                        href.to_string()
                    } else {
                        link_text.clone()
                    };

                    if is_image_url(&full_url) {
                        continue;
                    }

                    if link_text.trim().is_empty() {
                        continue;
                    }

                    if full_url != link_text {
                        result.push_str(&format!("[{}]({})", link_text, full_url));
                    } else {
                        result.push_str(&link_text);
                    }
                } else {
                    result.push_str(&link_text);
                }
            } else {
                result.push_str(&get_text_with_links(elem));
            }
        }
    }
    result
}

fn remove_css_artifacts(text: &str) -> String {
    let css_pattern = Regex::new(r"\.mw-parser-output[^}]*\{[^}]*\}").unwrap();
    let inline_style_pattern = Regex::new(r"\{[^}]*:[^}]*\}").unwrap();

    let text = css_pattern.replace_all(text, "");
    let text = inline_style_pattern.replace_all(&text, "");
    text.to_string()
}

fn remove_wayback_artifacts(text: &str) -> String {
    let wayback_pattern = Regex::new(r"Archived\s+\d+\s+\w+\s+\d+\s+at\s+the\s+Wayback\s+Machine").unwrap();
    wayback_pattern.replace_all(text, "").to_string()
}

fn remove_coordinate_artifacts(text: &str) -> String {
    let coord_pattern = Regex::new(r"\d+°\d+′[NS]\s+\d+°\d+′[EW][^a-zA-Z]*").unwrap();
    coord_pattern.replace_all(text, "").to_string()
}

fn matches_selector(node: scraper::element_ref::ElementRef, selector: &Selector) -> bool {
    selector.matches(&node)
}

fn strip_reference_indicators(text: &str) -> String {
    REFERENCE_REGEX.replace_all(text, "").to_string()
}

fn clean_empty_sections(text: &str) -> String {
    let lines: Vec<&str> = text.lines().collect();
    let mut result = Vec::new();
    let mut i = 0;

    let skip_sections = vec![
        "External links",
        "See also",
        "References",
        "Notes",
        "Further reading",
    ];

    while i < lines.len() {
        let line = lines[i];

        if line.starts_with("==") && line.ends_with("==") {
            let section_header = line;
            let section_title = line.trim_matches(|c| c == '=' || c == ' ');

            let should_skip = skip_sections.iter().any(|&skip| section_title == skip);

            i += 1;

            let mut section_content = Vec::new();
            while i < lines.len() {
                let next_line = lines[i];
                if next_line.starts_with("==") && next_line.ends_with("==") {
                    break;
                }
                section_content.push(next_line);
                i += 1;
            }

            if should_skip {
                continue;
            }

            let has_content = section_content
                .iter()
                .any(|line| !line.trim().is_empty());

            if has_content {
                result.push(section_header);
                result.extend(section_content);
            }
        } else {
            result.push(line);
            i += 1;
        }
    }

    let mut cleaned = result.join("\n");

    while cleaned.contains("\n\n\n") {
        cleaned = cleaned.replace("\n\n\n", "\n\n");
    }

    cleaned.trim().to_string()
}

fn extract_title_from_url(url: &str) -> Result<String> {
    let url = url.trim();

    if !url.contains("wikipedia.org") {
        return Err(anyhow!(WikipediaError::InvalidUrl(
            "URL must be from wikipedia.org".to_string()
        )));
    }

    let wiki_prefix = "/wiki/";
    let wiki_index = url
        .find(wiki_prefix)
        .ok_or_else(|| anyhow!(WikipediaError::InvalidUrl("URL must contain /wiki/".to_string())))?;

    let title_start = wiki_index + wiki_prefix.len();
    let title_with_params = &url[title_start..];

    let title = if let Some(hash_index) = title_with_params.find('#') {
        &title_with_params[..hash_index]
    } else if let Some(query_index) = title_with_params.find('?') {
        &title_with_params[..query_index]
    } else {
        title_with_params
    };

    if title.is_empty() {
        return Err(anyhow!(WikipediaError::InvalidUrl(
            "No article title found in URL".to_string()
        )));
    }

    let decoded_title = urlencoding::decode(title)
        .map_err(|e| anyhow!(WikipediaError::InvalidUrl(format!("Invalid URL encoding: {}", e))))?;

    Ok(decoded_title.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_title_simple() {
        let url = "https://en.wikipedia.org/wiki/Rust_(programming_language)";
        let title = extract_title_from_url(url).unwrap();
        assert_eq!(title, "Rust_(programming_language)");
    }

    #[test]
    fn test_extract_title_with_hash() {
        let url = "https://en.wikipedia.org/wiki/Rust_(programming_language)#History";
        let title = extract_title_from_url(url).unwrap();
        assert_eq!(title, "Rust_(programming_language)");
    }

    #[test]
    fn test_extract_title_with_query() {
        let url = "https://en.wikipedia.org/wiki/Rust_(programming_language)?action=edit";
        let title = extract_title_from_url(url).unwrap();
        assert_eq!(title, "Rust_(programming_language)");
    }

    #[test]
    fn test_extract_title_url_encoded() {
        let url = "https://en.wikipedia.org/wiki/Rust%20programming";
        let title = extract_title_from_url(url).unwrap();
        assert_eq!(title, "Rust programming");
    }

    #[test]
    fn test_extract_title_with_path() {
        let url = "https://en.wikipedia.org/wiki/Computer_science";
        let title = extract_title_from_url(url).unwrap();
        assert_eq!(title, "Computer_science");
    }

    #[test]
    fn test_invalid_url_no_wikipedia() {
        let url = "https://example.com/wiki/Article";
        let result = extract_title_from_url(url);
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_url_no_wiki_prefix() {
        let url = "https://en.wikipedia.org/Article";
        let result = extract_title_from_url(url);
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_url_empty_title() {
        let url = "https://en.wikipedia.org/wiki/";
        let result = extract_title_from_url(url);
        assert!(result.is_err());
    }

    #[test]
    fn test_clean_empty_sections_removes_empty() {
        let text = "Introduction text\n\n== Empty Section ==\n\n== Section With Content ==\nSome content here\n\n== Another Empty ==\n\n";
        let cleaned = clean_empty_sections(text);
        assert!(cleaned.contains("== Section With Content =="));
        assert!(!cleaned.contains("== Empty Section =="));
        assert!(!cleaned.contains("== Another Empty =="));
    }

    #[test]
    fn test_clean_empty_sections_preserves_content() {
        let text = "Intro\n\n== Section 1 ==\nContent 1\n\n== Section 2 ==\nContent 2\n";
        let cleaned = clean_empty_sections(text);
        assert!(cleaned.contains("== Section 1 =="));
        assert!(cleaned.contains("Content 1"));
        assert!(cleaned.contains("== Section 2 =="));
        assert!(cleaned.contains("Content 2"));
    }

    #[test]
    fn test_clean_empty_sections_reduces_blank_lines() {
        let text = "Text\n\n\n\n\nMore text";
        let cleaned = clean_empty_sections(text);
        assert!(!cleaned.contains("\n\n\n"));
    }

    #[test]
    fn test_strip_reference_indicators_single_digit() {
        let text = "This is a sentence with a reference[1] here.";
        let stripped = strip_reference_indicators(text);
        assert_eq!(stripped, "This is a sentence with a reference here.");
    }

    #[test]
    fn test_strip_reference_indicators_multiple_digits() {
        let text = "Reference[123] and another[4567] reference.";
        let stripped = strip_reference_indicators(text);
        assert_eq!(stripped, "Reference and another reference.");
    }

    #[test]
    fn test_strip_reference_indicators_multiple_refs() {
        let text = "First[1] second[2] third[3] text.";
        let stripped = strip_reference_indicators(text);
        assert_eq!(stripped, "First second third text.");
    }

    #[test]
    fn test_strip_reference_indicators_preserves_non_numeric() {
        let text = "This [note] and [abc] should be preserved.";
        let stripped = strip_reference_indicators(text);
        assert_eq!(stripped, "This [note] and [abc] should be preserved.");
    }

    #[test]
    fn test_strip_reference_indicators_preserves_section_headers() {
        let text = "== Section Header ==\nContent with reference[1] here.";
        let stripped = strip_reference_indicators(text);
        assert_eq!(stripped, "== Section Header ==\nContent with reference here.");
    }

    #[test]
    fn test_strip_reference_indicators_no_refs() {
        let text = "This text has no references.";
        let stripped = strip_reference_indicators(text);
        assert_eq!(stripped, "This text has no references.");
    }

    #[test]
    fn test_html_to_plain_text_preserves_mw_parser_output_content() {
        let html = r#"
            <div class="mw-parser-output">
                <p>This is the main content of the article.</p>
                <p>It should be preserved.</p>
            </div>
        "#;
        let result = html_to_plain_text(html).unwrap();
        assert!(result.contains("This is the main content"));
        assert!(result.contains("It should be preserved"));
    }

    #[test]
    fn test_remove_css_artifacts_removes_mw_parser_output_css() {
        let text = ".mw-parser-output{color:red;font-size:12px}\nActual content here\n.mw-parser-output .special{margin:10px}";
        let cleaned = remove_css_artifacts(text);
        assert!(!cleaned.contains(".mw-parser-output{"));
        assert!(!cleaned.contains("color:red"));
        assert!(cleaned.contains("Actual content here"));
    }

    #[test]
    fn test_html_to_plain_text_removes_unwanted_elements() {
        let html = r#"
            <div class="mw-parser-output">
                <p>Article content.</p>
                <div class="infobox">This should be removed</div>
                <p>More content.</p>
                <table><tr><td>Table content to remove</td></tr></table>
            </div>
        "#;
        let result = html_to_plain_text(html).unwrap();
        assert!(result.contains("Article content"));
        assert!(result.contains("More content"));
        assert!(!result.contains("This should be removed"));
        assert!(!result.contains("Table content"));
    }

    #[test]
    fn test_is_image_url_detects_common_formats() {
        assert!(is_image_url("https://example.com/image.jpg"));
        assert!(is_image_url("https://example.com/image.jpeg"));
        assert!(is_image_url("https://example.com/image.png"));
        assert!(is_image_url("https://example.com/image.gif"));
        assert!(is_image_url("https://example.com/image.svg"));
        assert!(is_image_url("https://example.com/image.webp"));
        assert!(is_image_url("/wiki/File:Example.PNG"));
        assert!(!is_image_url("https://example.com/article"));
        assert!(!is_image_url("https://en.wikipedia.org/wiki/Article"));
    }

    #[test]
    fn test_get_text_with_links_filters_image_links() {
        let html = r#"<p>Text with <a href="https://example.com/image.jpg"></a> and <a href="https://example.com/article">link</a>.</p>"#;
        let document = Html::parse_fragment(html);
        let p_selector = Selector::parse("p").unwrap();
        let p_elem = document.select(&p_selector).next().unwrap();
        let result = get_text_with_links(p_elem);
        assert!(!result.contains(".jpg"));
        assert!(result.contains("[link](https://example.com/article)"));
    }

    #[test]
    fn test_get_text_with_links_filters_empty_links() {
        let html = r#"<p>Text with <a href="https://example.com/page"></a> and <a href="https://example.com/other">text</a>.</p>"#;
        let document = Html::parse_fragment(html);
        let p_selector = Selector::parse("p").unwrap();
        let p_elem = document.select(&p_selector).next().unwrap();
        let result = get_text_with_links(p_elem);
        assert!(!result.contains("[]("));
        assert!(result.contains("[text](https://example.com/other)"));
    }

    #[test]
    fn test_blockquote_basic() {
        let html = r#"<blockquote><p>This is a quote.</p></blockquote>"#;
        let result = html_to_plain_text(html).unwrap();
        assert!(result.contains("> This is a quote."));
    }

    #[test]
    fn test_blockquote_with_link() {
        let html = r#"<blockquote><p>Quote with <a href="/wiki/Test">link</a>.</p></blockquote>"#;
        let result = html_to_plain_text(html).unwrap();
        assert!(result.contains("> Quote with [link]"));
    }

    #[test]
    fn test_blockquote_multiline() {
        let html = r#"<blockquote><p>Line one.</p><p>Line two.</p></blockquote>"#;
        let result = html_to_plain_text(html).unwrap();
        assert!(result.contains("> Line one."));
        assert!(result.contains("> Line two."));
    }

    #[test]
    fn test_blockquote_empty() {
        let html = r#"<blockquote></blockquote>"#;
        let result = html_to_plain_text(html).unwrap();
        assert!(!result.contains(">"));
    }

    #[test]
    fn test_blockquote_whitespace_only() {
        let html = r#"<blockquote><p>   </p></blockquote>"#;
        let result = html_to_plain_text(html).unwrap();
        assert!(!result.contains(">"));
    }
}
