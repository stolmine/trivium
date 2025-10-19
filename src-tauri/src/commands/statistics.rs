use crate::db::Database;
use chrono::{DateTime, Utc};
use serde::Serialize;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewStatistics {
    pub total_reviews: i64,
    pub unique_cards_reviewed: i64,
    pub avg_rating: f64,
    pub retention_rate: f64,
    pub daily_streak: i64,
    pub forecast_next_7_days: Vec<ForecastDay>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ForecastDay {
    pub date: String,
    pub cards_due: i64,
    pub new_cards: i64,
    pub review_cards: i64,
    pub learning_cards: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HourlyReviewDistribution {
    pub hour: i64,
    pub review_count: i64,
    pub again_rate: f64,
    pub hard_rate: f64,
    pub good_rate: f64,
    pub easy_rate: f64,
    pub avg_duration_ms: Option<f64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyReviewStats {
    pub date: String,
    pub total_reviews: i64,
    pub unique_cards: i64,
    pub avg_rating: f64,
    pub again_count: i64,
    pub hard_count: i64,
    pub good_count: i64,
    pub easy_count: i64,
    pub avg_duration_ms: Option<f64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingStatistics {
    pub total_time_seconds: i64,
    pub total_characters_read: i64,
    pub session_count: i64,
    pub avg_session_duration: f64,
    pub texts_read: i64,
    pub by_folder: Vec<FolderReadingStats>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderReadingStats {
    pub folder_id: String,
    pub folder_name: String,
    pub total_time_seconds: i64,
    pub characters_read: i64,
    pub session_count: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StudyTimeStats {
    pub total_study_time_ms: i64,
    pub avg_time_per_card_ms: f64,
    pub total_cards_reviewed: i64,
    pub by_date: Vec<DailyStudyTime>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyStudyTime {
    pub date: String,
    pub total_time_ms: i64,
    pub card_count: i64,
    pub avg_time_per_card_ms: f64,
}

async fn calculate_daily_streak(db: &sqlx::SqlitePool) -> Result<i64, String> {
    let row = sqlx::query!(
        r#"
        WITH RECURSIVE date_sequence AS (
            SELECT DATE('now') as check_date
            UNION ALL
            SELECT DATE(check_date, '-1 day')
            FROM date_sequence
            WHERE check_date >= DATE('now', '-365 days')
        ),
        daily_reviews AS (
            SELECT DISTINCT DATE(reviewed_at) as review_date
            FROM review_history
            WHERE reviewed_at >= DATE('now', '-365 days')
        )
        SELECT COUNT(*) as "streak!: i64"
        FROM date_sequence
        WHERE check_date IN (SELECT review_date FROM daily_reviews)
            AND check_date <= DATE('now')
            AND NOT EXISTS (
                SELECT 1
                FROM date_sequence ds2
                WHERE ds2.check_date > date_sequence.check_date
                    AND ds2.check_date <= DATE('now')
                    AND ds2.check_date NOT IN (SELECT review_date FROM daily_reviews)
            )
        "#
    )
    .fetch_one(db)
    .await
    .map_err(|e| format!("Failed to calculate daily streak: {}", e))?;

    Ok(row.streak)
}

async fn get_forecast_7_days(db: &sqlx::SqlitePool) -> Result<Vec<ForecastDay>, String> {
    let rows = sqlx::query!(
        r#"
        WITH RECURSIVE next_7_days AS (
            SELECT DATE('now') as forecast_date, 0 as day_num
            UNION ALL
            SELECT DATE(forecast_date, '+1 day'), day_num + 1
            FROM next_7_days
            WHERE day_num < 6
        )
        SELECT
            n7d.forecast_date as "date!",
            COALESCE(COUNT(f.id), 0) as "cards_due!: i64",
            COALESCE(SUM(CASE WHEN f.state = 0 THEN 1 ELSE 0 END), 0) as "new_cards!: i64",
            COALESCE(SUM(CASE WHEN f.state = 2 THEN 1 ELSE 0 END), 0) as "review_cards!: i64",
            COALESCE(SUM(CASE WHEN f.state IN (1, 3) THEN 1 ELSE 0 END), 0) as "learning_cards!: i64"
        FROM next_7_days n7d
        LEFT JOIN flashcards f ON DATE(f.due) = n7d.forecast_date
        GROUP BY n7d.forecast_date
        ORDER BY n7d.forecast_date
        "#
    )
    .fetch_all(db)
    .await
    .map_err(|e| format!("Failed to get 7-day forecast: {}", e))?;

    Ok(rows
        .into_iter()
        .map(|row| ForecastDay {
            date: row.date,
            cards_due: row.cards_due,
            new_cards: row.new_cards,
            review_cards: row.review_cards,
            learning_cards: row.learning_cards,
        })
        .collect())
}

#[tauri::command]
pub async fn get_review_statistics(
    start_date: String,
    end_date: String,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<ReviewStatistics, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let start_dt = DateTime::parse_from_rfc3339(&start_date)
        .map_err(|e| format!("Invalid start date format: {}", e))?
        .with_timezone(&Utc);

    let end_dt = DateTime::parse_from_rfc3339(&end_date)
        .map_err(|e| format!("Invalid end date format: {}", e))?
        .with_timezone(&Utc);

    let stats = sqlx::query!(
        r#"
        SELECT
            COUNT(*) as "total_reviews!: i64",
            COUNT(DISTINCT flashcard_id) as "unique_cards!: i64",
            COALESCE(AVG(CAST(rating AS REAL)), 0.0) as "avg_rating!: f64",
            COALESCE(
                CAST(SUM(CASE WHEN rating >= 3 THEN 1 ELSE 0 END) AS REAL) /
                NULLIF(CAST(COUNT(*) AS REAL), 0.0) * 100.0,
                0.0
            ) as "retention_rate!: f64"
        FROM review_history
        WHERE reviewed_at >= ? AND reviewed_at <= ?
        "#,
        start_dt,
        end_dt
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch review statistics: {}", e))?;

    let daily_streak = calculate_daily_streak(pool).await?;
    let forecast = get_forecast_7_days(pool).await?;

    Ok(ReviewStatistics {
        total_reviews: stats.total_reviews,
        unique_cards_reviewed: stats.unique_cards,
        avg_rating: stats.avg_rating,
        retention_rate: stats.retention_rate,
        daily_streak,
        forecast_next_7_days: forecast,
    })
}

#[tauri::command]
pub async fn get_difficulty_by_hour(
    start_date: String,
    end_date: String,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<HourlyReviewDistribution>, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let start_dt = DateTime::parse_from_rfc3339(&start_date)
        .map_err(|e| format!("Invalid start date format: {}", e))?
        .with_timezone(&Utc);

    let end_dt = DateTime::parse_from_rfc3339(&end_date)
        .map_err(|e| format!("Invalid end date format: {}", e))?
        .with_timezone(&Utc);

    let rows = sqlx::query!(
        r#"
        SELECT
            CAST(strftime('%H', reviewed_at) AS INTEGER) as "hour!: i64",
            COUNT(*) as "review_count!: i64",
            COALESCE(
                CAST(SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS REAL) /
                NULLIF(CAST(COUNT(*) AS REAL), 0.0),
                0.0
            ) as "again_rate!: f64",
            COALESCE(
                CAST(SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS REAL) /
                NULLIF(CAST(COUNT(*) AS REAL), 0.0),
                0.0
            ) as "hard_rate!: f64",
            COALESCE(
                CAST(SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS REAL) /
                NULLIF(CAST(COUNT(*) AS REAL), 0.0),
                0.0
            ) as "good_rate!: f64",
            COALESCE(
                CAST(SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS REAL) /
                NULLIF(CAST(COUNT(*) AS REAL), 0.0),
                0.0
            ) as "easy_rate!: f64",
            AVG(CAST(review_duration_ms AS REAL)) as "avg_duration_ms: f64"
        FROM review_history
        WHERE reviewed_at >= ? AND reviewed_at <= ?
        GROUP BY strftime('%H', reviewed_at)
        ORDER BY strftime('%H', reviewed_at)
        "#,
        start_dt,
        end_dt
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch hourly distribution: {}", e))?;

    Ok(rows
        .into_iter()
        .map(|row| HourlyReviewDistribution {
            hour: row.hour,
            review_count: row.review_count,
            again_rate: row.again_rate,
            hard_rate: row.hard_rate,
            good_rate: row.good_rate,
            easy_rate: row.easy_rate,
            avg_duration_ms: row.avg_duration_ms,
        })
        .collect())
}

#[tauri::command]
pub async fn get_daily_review_stats(
    start_date: String,
    end_date: String,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<DailyReviewStats>, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let start_dt = DateTime::parse_from_rfc3339(&start_date)
        .map_err(|e| format!("Invalid start date format: {}", e))?
        .with_timezone(&Utc);

    let end_dt = DateTime::parse_from_rfc3339(&end_date)
        .map_err(|e| format!("Invalid end date format: {}", e))?
        .with_timezone(&Utc);

    let rows = sqlx::query!(
        r#"
        SELECT
            DATE(reviewed_at) as "date!: String",
            COUNT(*) as "total_reviews!: i64",
            COUNT(DISTINCT flashcard_id) as "unique_cards!: i64",
            COALESCE(AVG(CAST(rating AS REAL)), 0.0) as "avg_rating!: f64",
            SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as "again_count!: i64",
            SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as "hard_count!: i64",
            SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as "good_count!: i64",
            SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as "easy_count!: i64",
            AVG(CAST(review_duration_ms AS REAL)) as "avg_duration_ms: f64"
        FROM review_history
        WHERE reviewed_at >= ? AND reviewed_at <= ?
        GROUP BY DATE(reviewed_at)
        ORDER BY DATE(reviewed_at)
        "#,
        start_dt,
        end_dt
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch daily review stats: {}", e))?;

    Ok(rows
        .into_iter()
        .map(|row| DailyReviewStats {
            date: row.date,
            total_reviews: row.total_reviews,
            unique_cards: row.unique_cards,
            avg_rating: row.avg_rating,
            again_count: row.again_count,
            hard_count: row.hard_count,
            good_count: row.good_count,
            easy_count: row.easy_count,
            avg_duration_ms: row.avg_duration_ms,
        })
        .collect())
}

#[tauri::command]
pub async fn get_reading_stats(
    start_date: String,
    end_date: String,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<ReadingStatistics, String> {
    println!("[RUST: get_reading_stats] Called with start_date: {}, end_date: {}", start_date, end_date);

    let db = db.lock().await;
    let pool = db.pool();

    let start_dt = DateTime::parse_from_rfc3339(&start_date)
        .map_err(|e| format!("Invalid start date format: {}", e))?
        .with_timezone(&Utc);

    let end_dt = DateTime::parse_from_rfc3339(&end_date)
        .map_err(|e| format!("Invalid end date format: {}", e))?
        .with_timezone(&Utc);

    println!("[RUST: get_reading_stats] Parsed dates - start_dt: {:?}, end_dt: {:?}", start_dt, end_dt);

    let stats = sqlx::query!(
        r#"
        SELECT
            COALESCE(SUM(duration_seconds), 0) as "total_time!: i64",
            COUNT(*) as "session_count!: i64",
            COUNT(DISTINCT text_id) as "texts_read!: i64",
            COALESCE(AVG(CAST(duration_seconds AS REAL)), 0.0) as "avg_duration!: f64"
        FROM reading_sessions
        WHERE ended_at IS NOT NULL
            AND started_at >= ?
            AND started_at <= ?
        "#,
        start_dt,
        end_dt
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch reading statistics: {}", e))?;

    println!("[RUST: get_reading_stats] Main stats: total_time={}, session_count={}, texts_read={}, avg_duration={}",
        stats.total_time, stats.session_count, stats.texts_read, stats.avg_duration);

    let char_count = sqlx::query!(
        r#"
        SELECT COALESCE(SUM(end_position - start_position), 0) as "total_chars!: i64"
        FROM read_ranges
        WHERE marked_at >= ? AND marked_at <= ?
        "#,
        start_dt,
        end_dt
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch character count: {}", e))?;

    println!("[RUST: get_reading_stats] Character count: {}", char_count.total_chars);

    let folder_stats = sqlx::query!(
        r#"
        SELECT
            f.id as "folder_id!",
            f.name as "folder_name!",
            COALESCE(SUM(rs.duration_seconds), 0) as "total_time!: i64",
            COALESCE(SUM(rr.end_position - rr.start_position), 0) as "chars_read!: i64",
            COUNT(DISTINCT rs.id) as "sessions!: i64"
        FROM folders f
        LEFT JOIN texts t ON t.folder_id = f.id
        LEFT JOIN reading_sessions rs ON rs.text_id = t.id
            AND rs.ended_at IS NOT NULL
            AND rs.started_at >= ?
            AND rs.started_at <= ?
        LEFT JOIN read_ranges rr ON rr.text_id = t.id
            AND rr.marked_at >= ?
            AND rr.marked_at <= ?
        GROUP BY f.id, f.name
        HAVING COUNT(DISTINCT rs.id) > 0
        "#,
        start_dt,
        end_dt,
        start_dt,
        end_dt
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch folder statistics: {}", e))?;

    println!("[RUST: get_reading_stats] Folder stats count: {}", folder_stats.len());
    for (idx, stat) in folder_stats.iter().enumerate() {
        println!("[RUST: get_reading_stats] Folder[{}]: id={}, name={}, total_time={}, chars_read={}, sessions={}",
            idx, stat.folder_id, stat.folder_name, stat.total_time, stat.chars_read, stat.sessions);
    }

    let by_folder: Vec<FolderReadingStats> = folder_stats
        .into_iter()
        .map(|row| FolderReadingStats {
            folder_id: row.folder_id.to_string(),
            folder_name: row.folder_name,
            total_time_seconds: row.total_time,
            characters_read: row.chars_read,
            session_count: row.sessions,
        })
        .collect();

    println!("[RUST: get_reading_stats] by_folder array length: {}", by_folder.len());

    let result = ReadingStatistics {
        total_time_seconds: stats.total_time,
        total_characters_read: char_count.total_chars,
        session_count: stats.session_count,
        avg_session_duration: stats.avg_duration,
        texts_read: stats.texts_read,
        by_folder,
    };

    println!("[RUST: get_reading_stats] Returning result: total_time_seconds={}, session_count={}, by_folder_length={}",
        result.total_time_seconds, result.session_count, result.by_folder.len());

    Ok(result)
}

#[tauri::command]
pub async fn get_study_time_stats(
    start_date: String,
    end_date: String,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<StudyTimeStats, String> {
    let db = db.lock().await;
    let pool = db.pool();

    let start_dt = DateTime::parse_from_rfc3339(&start_date)
        .map_err(|e| format!("Invalid start date format: {}", e))?
        .with_timezone(&Utc);

    let end_dt = DateTime::parse_from_rfc3339(&end_date)
        .map_err(|e| format!("Invalid end date format: {}", e))?
        .with_timezone(&Utc);

    let total_stats = sqlx::query!(
        r#"
        SELECT
            COALESCE(SUM(review_duration_ms), 0) as "total_time!: i64",
            COUNT(*) as "total_cards!: i64",
            COALESCE(AVG(CAST(review_duration_ms AS REAL)), 0.0) as "avg_time!: f64"
        FROM review_history
        WHERE review_duration_ms IS NOT NULL
            AND reviewed_at >= ?
            AND reviewed_at <= ?
        "#,
        start_dt,
        end_dt
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch study time statistics: {}", e))?;

    let daily_stats = sqlx::query!(
        r#"
        SELECT
            DATE(reviewed_at) as "date!: String",
            COALESCE(SUM(review_duration_ms), 0) as "total_time_ms!: i64",
            COUNT(*) as "card_count!: i64",
            COALESCE(AVG(CAST(review_duration_ms AS REAL)), 0.0) as "avg_time_ms!: f64"
        FROM review_history
        WHERE review_duration_ms IS NOT NULL
            AND reviewed_at >= ?
            AND reviewed_at <= ?
        GROUP BY DATE(reviewed_at)
        ORDER BY DATE(reviewed_at)
        "#,
        start_dt,
        end_dt
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch daily study time: {}", e))?;

    let by_date = daily_stats
        .into_iter()
        .map(|row| DailyStudyTime {
            date: row.date,
            total_time_ms: row.total_time_ms,
            card_count: row.card_count,
            avg_time_per_card_ms: row.avg_time_ms,
        })
        .collect();

    Ok(StudyTimeStats {
        total_study_time_ms: total_stats.total_time,
        avg_time_per_card_ms: total_stats.avg_time,
        total_cards_reviewed: total_stats.total_cards,
        by_date,
    })
}
