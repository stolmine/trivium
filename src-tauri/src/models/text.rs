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
