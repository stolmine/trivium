use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Paragraph {
    pub id: i64,
    pub text_id: i64,
    pub paragraph_index: i64,
    pub start_position: i64,
    pub end_position: i64,
    pub character_count: i64,
    pub created_at: DateTime<Utc>,
}
