use sqlx::sqlite::SqlitePoolOptions;
use sqlx::{Pool, Sqlite, migrate::MigrateDatabase};
use std::path::PathBuf;
use anyhow::{Context, Result};

pub struct Database {
    pool: Pool<Sqlite>,
}

impl Database {
    pub async fn new(db_path: PathBuf) -> Result<Self> {
        let db_url = format!("sqlite:{}", db_path.to_string_lossy());

        if !Sqlite::database_exists(&db_url).await.unwrap_or(false) {
            Sqlite::create_database(&db_url)
                .await
                .context("Failed to create database")?;
        }

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(&db_url)
            .await
            .context("Failed to connect to database")?;

        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .context("Failed to run migrations")?;

        Ok(Self { pool })
    }

    pub fn pool(&self) -> &Pool<Sqlite> {
        &self.pool
    }
}
