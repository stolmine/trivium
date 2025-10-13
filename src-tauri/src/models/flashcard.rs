use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Flashcard {
    pub id: i64,
    pub text_id: i64,
    pub user_id: i64,
    pub original_text: String,
    pub cloze_text: String,
    pub cloze_index: i64,
    pub display_index: i64,
    pub cloze_number: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub cloze_note_id: Option<i64>,
    pub due: DateTime<Utc>,
    pub stability: f64,
    pub difficulty: f64,
    pub elapsed_days: i64,
    pub scheduled_days: i64,
    pub reps: i64,
    pub lapses: i64,
    pub state: i64,
    pub last_review: Option<DateTime<Utc>>,
}
