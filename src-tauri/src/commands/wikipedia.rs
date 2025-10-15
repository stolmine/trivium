use crate::services::wikipedia;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WikipediaArticleData {
    pub title: String,
    pub content: String,
    pub url: String,
    pub timestamp: String,
}

#[tauri::command]
pub async fn fetch_wikipedia_article(url: String) -> Result<WikipediaArticleData, String> {
    let article = wikipedia::fetch_wikipedia_article(&url)
        .await
        .map_err(|e| e.to_string())?;

    Ok(WikipediaArticleData {
        title: article.title,
        content: article.extract,
        url: article.url,
        timestamp: article.timestamp.to_rfc3339(),
    })
}
