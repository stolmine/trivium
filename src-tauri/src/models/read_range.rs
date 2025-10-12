use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ReadRange {
    pub id: i64,
    pub text_id: i64,
    pub user_id: i64,
    pub start_position: i64,
    pub end_position: i64,
    pub marked_at: DateTime<Utc>,
}
