// Text model
//
// Data structures for representing texts/articles in the application.
//
// Corresponds to the `texts` table in the database:
// - id: Unique identifier
// - title: Text title
// - source: Source type (wikipedia, paste, file)
// - source_url: Optional URL for sourced content
// - content: Full text content
// - content_length: Character count
// - ingested_at: Timestamp when text was added
// - updated_at: Last modification timestamp
// - metadata: Optional JSON metadata
//

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Text {
    pub id: i64,
    pub title: String,
    pub source: String,
    pub source_url: Option<String>,
    pub content: String,
    pub content_length: i64,
    pub ingested_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub metadata: Option<String>,
    pub author: Option<String>,
    pub publication_date: Option<String>,
    pub publisher: Option<String>,
    pub access_date: Option<String>,
    pub doi: Option<String>,
    pub isbn: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTextRequest {
    pub title: String,
    pub source: String,
    pub source_url: Option<String>,
    pub content: String,
    pub metadata: Option<String>,
    pub author: Option<String>,
    pub publication_date: Option<String>,
    pub publisher: Option<String>,
    pub access_date: Option<String>,
    pub doi: Option<String>,
    pub isbn: Option<String>,
}
