use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ClozeNote {
    pub id: i64,
    pub text_id: i64,
    pub user_id: i64,
    pub original_text: String,
    pub parsed_segments: String,
    pub cloze_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
