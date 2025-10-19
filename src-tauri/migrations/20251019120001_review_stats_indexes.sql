-- Composite indexes for statistics queries
CREATE INDEX IF NOT EXISTS idx_review_history_user_rating_date
ON review_history(user_id, rating, reviewed_at);

CREATE INDEX IF NOT EXISTS idx_review_history_reviewed_at_hour
ON review_history(strftime('%H', reviewed_at));

-- Views for review statistics
CREATE VIEW review_distribution_hourly AS
SELECT
    user_id,
    CAST(strftime('%H', reviewed_at) AS INTEGER) as hour_of_day,
    COUNT(*) as review_count,
    AVG(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as again_rate,
    AVG(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as hard_rate,
    AVG(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as good_rate,
    AVG(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as easy_rate
FROM review_history
GROUP BY user_id, hour_of_day;

CREATE VIEW review_stats_daily AS
SELECT
    user_id,
    DATE(reviewed_at) as date,
    COUNT(*) as total_reviews,
    COUNT(DISTINCT flashcard_id) as unique_cards,
    AVG(rating) as avg_rating,
    SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as again_count,
    SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as hard_count,
    SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as good_count,
    SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as easy_count,
    AVG(review_duration_ms) as avg_duration_ms
FROM review_history
GROUP BY user_id, DATE(reviewed_at);

CREATE VIEW review_forecast AS
SELECT
    user_id,
    DATE(due) as date,
    COUNT(*) as cards_due,
    SUM(CASE WHEN state = 0 THEN 1 ELSE 0 END) as new_cards,
    SUM(CASE WHEN state = 2 THEN 1 ELSE 0 END) as review_cards,
    SUM(CASE WHEN state IN (1, 3) THEN 1 ELSE 0 END) as learning_cards
FROM flashcards
GROUP BY user_id, DATE(due)
ORDER BY DATE(due);
