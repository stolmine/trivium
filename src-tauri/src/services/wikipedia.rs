use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};

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
    let cleaned_text = clean_empty_sections(&plain_text);

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
    ];

    let mut result = Vec::new();

    for node in document.root_element().children() {
        if let Some(elem) = scraper::ElementRef::wrap(node) {
            extract_text_recursive(elem, &mut result, &unwanted_selectors);
        }
    }

    let text = result.join("\n");
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
        _ => {}
    }
}

fn get_text_with_links(node: scraper::element_ref::ElementRef) -> String {
    let mut result = String::new();
    for child in node.children() {
        if let Some(text) = child.value().as_text() {
            result.push_str(text);
        } else if let Some(elem) = scraper::ElementRef::wrap(child) {
            if elem.value().name() == "a" {
                result.push_str(&elem.text().collect::<String>());
            } else {
                result.push_str(&get_text_with_links(elem));
            }
        }
    }
    result
}

fn matches_selector(node: scraper::element_ref::ElementRef, selector: &Selector) -> bool {
    selector.matches(&node)
}

fn clean_empty_sections(text: &str) -> String {
    let lines: Vec<&str> = text.lines().collect();
    let mut result = Vec::new();
    let mut i = 0;

    while i < lines.len() {
        let line = lines[i];

        if line.starts_with("==") && line.ends_with("==") {
            let section_header = line;
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
}
