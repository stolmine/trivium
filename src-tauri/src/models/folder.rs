// Folder model
//
// Data structures for representing hierarchical folders in the application.
//
// Corresponds to the `folders` table in the database:
// - id: UUID identifier (TEXT)
// - name: Folder name
// - parent_id: Optional parent folder ID for hierarchy
// - created_at: Timestamp when folder was created
// - updated_at: Last modification timestamp
//

use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
