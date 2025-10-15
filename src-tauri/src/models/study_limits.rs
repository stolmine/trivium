use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StudyLimits {
    pub id: i64,
    pub user_id: i64,
    pub daily_new_cards: i64,
    pub daily_reviews: i64,
    pub per_text_new_limit: Option<i64>,
    pub per_text_review_limit: Option<i64>,
    pub per_folder_new_limit: Option<i64>,
    pub per_folder_review_limit: Option<i64>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyProgress {
    pub id: i64,
    pub user_id: i64,
    pub scope_type: String,
    pub scope_id: Option<String>,
    pub date: String,
    pub new_cards_seen: i64,
    pub review_cards_seen: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LimitStatus {
    pub new_cards_remaining: i64,
    pub review_cards_remaining: i64,
    pub new_cards_limit: i64,
    pub review_cards_limit: i64,
    pub new_cards_seen: i64,
    pub review_cards_seen: i64,
}
