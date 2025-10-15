use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum StudyFilter {
    #[serde(rename_all = "camelCase")]
    Global,

    #[serde(rename_all = "camelCase")]
    Text { text_id: i64 },

    #[serde(rename_all = "camelCase")]
    Folder { folder_id: String },
}

impl StudyFilter {
    pub fn scope_type(&self) -> &str {
        match self {
            StudyFilter::Global => "global",
            StudyFilter::Text { .. } => "text",
            StudyFilter::Folder { .. } => "folder",
        }
    }

    pub fn scope_id(&self) -> Option<String> {
        match self {
            StudyFilter::Global => None,
            StudyFilter::Text { text_id } => Some(text_id.to_string()),
            StudyFilter::Folder { folder_id } => Some(folder_id.clone()),
        }
    }
}
