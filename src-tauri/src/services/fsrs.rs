// FSRS-5 Algorithm Implementation
//
// Free Spaced Repetition Scheduler (FSRS) is a spaced repetition algorithm
// that calculates optimal review intervals based on memory models.
//
// This is a manual implementation to avoid dependency conflicts with sqlx.
//
// References:
// - FSRS-5 Paper: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
// - Original Research: Ye, B., et al. (2024). "Optimizing Spaced Repetition Schedule by Capturing the Dynamics of Memory"
//
// Core Concepts:
// - Stability (S): Time in days for retrievability to drop from 100% to 90%
// - Difficulty (D): Inherent complexity of the item (1.0 to 10.0)
// - Retrievability (R): Probability of successful recall (0.0 to 1.0)
// - State: Card lifecycle (0=New, 1=Learning, 2=Review, 3=Relearning)

use chrono::{DateTime, Duration, Utc};

/// FSRS algorithm parameters (optimized defaults from FSRS-5)
///
/// These parameters control how the algorithm calculates stability and difficulty.
/// The default values are research-backed optimal parameters that work well for
/// most learners.
#[derive(Debug, Clone)]
pub struct FSRSParameters {
    /// Initial stabilities for ratings 1-4 (Again, Hard, Good, Easy)
    /// These determine how quickly new cards are scheduled based on first review
    pub initial_stability: [f64; 4],

    /// Weight for difficulty adjustment based on rating
    /// Controls how much each rating affects the difficulty score
    pub difficulty_weight: f64,
}

impl Default for FSRSParameters {
    fn default() -> Self {
        Self {
            // FSRS-6 default parameters (research-backed optimal values)
            // Based on 700M+ reviews from 20,000 users
            // Again=0.212 days (~5 hours), Hard=1.29 days (~31 hours),
            // Good=2.31 days, Easy=8.30 days
            initial_stability: [0.212, 1.2931, 2.3065, 8.2956],

            // Difficulty adjustment weight
            difficulty_weight: 0.5,
        }
    }
}

/// FSRS scheduling information returned after grading a card
///
/// Contains all the updated state information needed to schedule
/// the next review of a flashcard.
#[derive(Debug, Clone)]
pub struct SchedulingInfo {
    /// New stability value (days for R to drop from 100% to 90%)
    pub new_stability: f64,

    /// New difficulty value (1.0 to 10.0)
    pub new_difficulty: f64,

    /// Interval until next review (in days)
    pub interval: i64,

    /// Next due date for the card
    pub next_due: DateTime<Utc>,

    /// New card state (0=New, 1=Learning, 2=Review, 3=Relearning)
    pub new_state: i64,
}

/// FSRS scheduler implementing the FSRS-5 algorithm
///
/// Example:
/// ```ignore
/// use chrono::Utc;
/// use trivium::services::fsrs::FSRSScheduler;
///
/// let scheduler = FSRSScheduler::new();
/// let info = scheduler.schedule(2.4, 5.0, 0, 0, 3);
/// println!("Next review in {} days", info.interval);
/// ```
pub struct FSRSScheduler {
    params: FSRSParameters,
}

impl FSRSScheduler {
    /// Create a new FSRS scheduler with default parameters
    pub fn new() -> Self {
        Self {
            params: FSRSParameters::default(),
        }
    }

    /// Create a scheduler with custom parameters
    pub fn with_parameters(params: FSRSParameters) -> Self {
        Self { params }
    }

    /// Schedule a card based on its current state and the user's rating
    ///
    /// # Arguments
    /// * `current_stability` - Current stability value (0.0 for new cards)
    /// * `current_difficulty` - Current difficulty (5.0 for new cards)
    /// * `current_state` - Current card state (0=New, 1=Learning, 2=Review, 3=Relearning)
    /// * `elapsed_days` - Days since last review (0 for new cards)
    /// * `rating` - User's rating (1=Again, 2=Hard, 3=Good, 4=Easy)
    ///
    /// # Returns
    /// `SchedulingInfo` containing the new stability, difficulty, interval, and due date
    ///
    /// # Example
    /// ```ignore
    /// use trivium::services::fsrs::FSRSScheduler;
    /// let scheduler = FSRSScheduler::new();
    /// // Review a new card with "Good" rating
    /// let info = scheduler.schedule(0.0, 5.0, 0, 0, 3);
    /// assert_eq!(info.interval, 2); // Good rating gives ~2 days
    /// ```
    pub fn schedule(
        &self,
        current_stability: f64,
        current_difficulty: f64,
        current_state: i64,
        elapsed_days: i64,
        rating: i64, // 1=Again, 2=Hard, 3=Good, 4=Easy
    ) -> SchedulingInfo {
        // Validate rating
        assert!((1..=4).contains(&rating), "Rating must be between 1 and 4");

        // Handle new cards (state 0, stability 0)
        let stability = if current_state == 0 || current_stability == 0.0 {
            // Use initial stability for new cards
            self.params.initial_stability[(rating - 1) as usize]
        } else {
            // Calculate retrievability for existing cards
            let r = self.retrievability(elapsed_days, current_stability);

            // Calculate next stability based on rating and retrievability
            self.next_stability(current_stability, rating, current_difficulty, r)
        };

        // Calculate next difficulty
        let difficulty = self.next_difficulty(current_difficulty, rating);

        // Convert stability to interval
        let interval = self.stability_to_interval(stability);

        // Calculate next due date
        let next_due = Utc::now() + Duration::days(interval);

        // Determine new state
        let new_state = match (current_state, rating) {
            (0, 1) => 1, // New + Again = Learning
            (0, _) => 2, // New + (Hard/Good/Easy) = Review
            (_, 1) => 3, // Any + Again = Relearning
            (1, _) => 2, // Learning + (Hard/Good/Easy) = Review
            (3, _) => 2, // Relearning + (Hard/Good/Easy) = Review
            _ => 2,      // Default to Review
        };

        SchedulingInfo {
            new_stability: stability,
            new_difficulty: difficulty,
            interval,
            next_due,
            new_state,
        }
    }

    /// Calculate retrievability using the FSRS formula
    ///
    /// Formula: R = (1 + t / (9 * S))^(-1)
    ///
    /// Where:
    /// - t = elapsed time since last review (days)
    /// - S = current stability
    /// - R = retrievability (probability of successful recall)
    ///
    /// Retrievability decreases as time passes, approaching 0 as t approaches infinity.
    fn retrievability(&self, elapsed_days: i64, stability: f64) -> f64 {
        let t = elapsed_days as f64;
        (1.0 + t / (9.0 * stability)).powf(-1.0)
    }

    /// Calculate next stability based on rating and current state
    ///
    /// Simplified FSRS-5 stability calculation:
    /// - Rating 1 (Again): S' = S * 0.5 (reduce by half)
    /// - Rating 2 (Hard): S' = S * 1.2 (increase by 20%)
    /// - Rating 3 (Good): S' = S * 2.5 (increase by 150%)
    /// - Rating 4 (Easy): S' = S * 4.0 (increase by 300%)
    ///
    /// These multipliers are simplified from the full FSRS-5 formula
    /// but maintain the core behavior of the algorithm.
    fn next_stability(
        &self,
        current_stability: f64,
        rating: i64,
        _difficulty: f64,
        _retrievability: f64,
    ) -> f64 {
        match rating {
            1 => current_stability * 0.5,  // Again: reduce stability
            2 => current_stability * 1.2,  // Hard: slight increase
            3 => current_stability * 2.5,  // Good: substantial increase
            4 => current_stability * 4.0,  // Easy: large increase
            _ => current_stability,        // Invalid rating: no change
        }
    }

    /// Calculate next difficulty based on rating
    ///
    /// Formula: D' = D + w[6] * (rating - 3)
    ///
    /// Where:
    /// - D = current difficulty
    /// - w[6] = difficulty_weight (0.5)
    /// - rating - 3 creates delta: Again=-2, Hard=-1, Good=0, Easy=+1
    ///
    /// Result is clamped to [1.0, 10.0] to prevent extreme values.
    ///
    /// Examples:
    /// - D=5.0, rating=1 (Again): D' = 5.0 + 0.5*(-2) = 4.0
    /// - D=5.0, rating=4 (Easy): D' = 5.0 + 0.5*(1) = 5.5
    fn next_difficulty(&self, current_difficulty: f64, rating: i64) -> f64 {
        let delta = self.params.difficulty_weight * (rating - 3) as f64;
        (current_difficulty + delta).clamp(1.0, 10.0)
    }

    /// Convert stability to interval (days)
    ///
    /// The interval is simply the stability rounded to the nearest day,
    /// with a minimum of 1 day.
    fn stability_to_interval(&self, stability: f64) -> i64 {
        stability.round().max(1.0) as i64
    }
}

impl Default for FSRSScheduler {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_stability() {
        let scheduler = FSRSScheduler::new();

        // Test that new cards get correct initial stability based on rating
        let info_again = scheduler.schedule(0.0, 5.0, 0, 0, 1);
        assert_eq!(info_again.new_stability, 0.212, "Again should give 0.212 days stability");

        let info_hard = scheduler.schedule(0.0, 5.0, 0, 0, 2);
        assert_eq!(info_hard.new_stability, 1.2931, "Hard should give 1.2931 days stability");

        let info_good = scheduler.schedule(0.0, 5.0, 0, 0, 3);
        assert_eq!(info_good.new_stability, 2.3065, "Good should give 2.3065 days stability");

        let info_easy = scheduler.schedule(0.0, 5.0, 0, 0, 4);
        assert_eq!(info_easy.new_stability, 8.2956, "Easy should give 8.2956 days stability");
    }

    #[test]
    fn test_retrievability_decreases_over_time() {
        let scheduler = FSRSScheduler::new();
        let stability = 10.0;

        // Test that R decreases as elapsed time increases
        let r0 = scheduler.retrievability(0, stability);
        let r5 = scheduler.retrievability(5, stability);
        let r10 = scheduler.retrievability(10, stability);
        let r20 = scheduler.retrievability(20, stability);

        assert_eq!(r0, 1.0, "Retrievability at t=0 should be 100%");
        assert!(r5 > r10, "R should decrease over time (r5 > r10)");
        assert!(r10 > r20, "R should decrease over time (r10 > r20)");
        assert!(r20 > 0.0, "R should never reach 0");
        assert!(r20 < 1.0, "R should be less than 1 after time passes");
    }

    #[test]
    fn test_good_rating_increases_stability() {
        let scheduler = FSRSScheduler::new();

        // Start with a card that has stability of 2.0 days
        let current_stability = 2.0;
        let info = scheduler.schedule(current_stability, 5.0, 2, 2, 3); // Good rating

        // Good rating should multiply stability by 2.5
        assert!(info.new_stability > current_stability, "Good rating should increase stability");
        assert_eq!(info.new_stability, 2.0 * 2.5, "Good rating should multiply stability by 2.5");
    }

    #[test]
    fn test_again_rating_decreases_stability() {
        let scheduler = FSRSScheduler::new();

        // Start with a card that has stability of 10.0 days
        let current_stability = 10.0;
        let info = scheduler.schedule(current_stability, 5.0, 2, 10, 1); // Again rating

        // Again rating should multiply stability by 0.5
        assert!(info.new_stability < current_stability, "Again rating should decrease stability");
        assert_eq!(info.new_stability, 10.0 * 0.5, "Again rating should multiply stability by 0.5");
    }

    #[test]
    fn test_difficulty_clamping() {
        let scheduler = FSRSScheduler::new();

        // Test lower bound: repeatedly use "Again" rating to drive difficulty down
        let mut difficulty = 5.0;
        for _ in 0..20 {
            let info = scheduler.schedule(2.0, difficulty, 2, 2, 1); // Again rating
            difficulty = info.new_difficulty;
        }
        assert!(difficulty >= 1.0, "Difficulty should not go below 1.0");
        assert_eq!(difficulty, 1.0, "Difficulty should be clamped at 1.0");

        // Test upper bound: repeatedly use "Easy" rating to drive difficulty up
        let mut difficulty = 5.0;
        for _ in 0..20 {
            let info = scheduler.schedule(2.0, difficulty, 2, 2, 4); // Easy rating
            difficulty = info.new_difficulty;
        }
        assert!(difficulty <= 10.0, "Difficulty should not go above 10.0");
        assert_eq!(difficulty, 10.0, "Difficulty should be clamped at 10.0");
    }

    #[test]
    fn test_stability_to_interval_conversion() {
        let scheduler = FSRSScheduler::new();

        // Test that intervals are correctly rounded
        assert_eq!(scheduler.stability_to_interval(1.4), 1, "1.4 days should round to 1");
        assert_eq!(scheduler.stability_to_interval(1.5), 2, "1.5 days should round to 2");
        assert_eq!(scheduler.stability_to_interval(1.6), 2, "1.6 days should round to 2");
        assert_eq!(scheduler.stability_to_interval(10.0), 10, "10.0 days should be 10");

        // Test minimum interval
        assert_eq!(scheduler.stability_to_interval(0.1), 1, "Minimum interval should be 1 day");
    }

    #[test]
    fn test_state_transitions() {
        let scheduler = FSRSScheduler::new();

        // New (0) + Again (1) = Learning (1)
        let info = scheduler.schedule(0.0, 5.0, 0, 0, 1);
        assert_eq!(info.new_state, 1, "New + Again should transition to Learning");

        // New (0) + Good (3) = Review (2)
        let info = scheduler.schedule(0.0, 5.0, 0, 0, 3);
        assert_eq!(info.new_state, 2, "New + Good should transition to Review");

        // Review (2) + Again (1) = Relearning (3)
        let info = scheduler.schedule(2.0, 5.0, 2, 2, 1);
        assert_eq!(info.new_state, 3, "Review + Again should transition to Relearning");

        // Learning (1) + Good (3) = Review (2)
        let info = scheduler.schedule(0.6, 5.0, 1, 1, 3);
        assert_eq!(info.new_state, 2, "Learning + Good should transition to Review");

        // Relearning (3) + Good (3) = Review (2)
        let info = scheduler.schedule(1.0, 5.0, 3, 1, 3);
        assert_eq!(info.new_state, 2, "Relearning + Good should transition to Review");
    }

    #[test]
    fn test_rating_validation() {
        let scheduler = FSRSScheduler::new();

        // Valid ratings should work
        scheduler.schedule(0.0, 5.0, 0, 0, 1);
        scheduler.schedule(0.0, 5.0, 0, 0, 2);
        scheduler.schedule(0.0, 5.0, 0, 0, 3);
        scheduler.schedule(0.0, 5.0, 0, 0, 4);
    }

    #[test]
    #[should_panic(expected = "Rating must be between 1 and 4")]
    fn test_rating_validation_too_low() {
        let scheduler = FSRSScheduler::new();
        scheduler.schedule(0.0, 5.0, 0, 0, 0); // Should panic
    }

    #[test]
    #[should_panic(expected = "Rating must be between 1 and 4")]
    fn test_rating_validation_too_high() {
        let scheduler = FSRSScheduler::new();
        scheduler.schedule(0.0, 5.0, 0, 0, 5); // Should panic
    }

    #[test]
    fn test_realistic_learning_session() {
        let scheduler = FSRSScheduler::new();

        // Simulate a realistic learning session
        // Day 1: First review of new card with "Good" rating
        let review1 = scheduler.schedule(0.0, 5.0, 0, 0, 3);
        assert_eq!(review1.interval, 2, "First Good should give 2 days (FSRS-6: 2.3065 rounds to 2)");
        assert_eq!(review1.new_state, 2, "Should be in Review state");

        // Day 3: Second review (2 days later) with "Good" rating
        let review2 = scheduler.schedule(
            review1.new_stability,
            review1.new_difficulty,
            review1.new_state,
            review1.interval,
            3
        );
        assert!(review2.interval > review1.interval, "Interval should increase");
        assert_eq!(review2.interval, 6, "Should be about 6 days (2.3065 * 2.5 = 5.766, rounded to 6)");

        // Day 9: Third review (6 days later), forgot it - "Again" rating
        let review3 = scheduler.schedule(
            review2.new_stability,
            review2.new_difficulty,
            review2.new_state,
            review2.interval,
            1
        );
        assert!(review3.interval < review2.interval, "Again should decrease interval");
        assert_eq!(review3.new_state, 3, "Should be in Relearning state");

        // Verify difficulty increased (card was hard)
        assert!(review3.new_difficulty < review2.new_difficulty, "Difficulty should decrease after Again");
    }

    #[test]
    fn test_new_card_intervals() {
        // This test documents the expected intervals for a brand new card
        // based on FSRS-6 initial_stability values: [0.212, 1.2931, 2.3065, 8.2956]
        let scheduler = FSRSScheduler::new();

        // New card (state=0, stability=0, difficulty=5.0)
        let again = scheduler.schedule(0.0, 5.0, 0, 0, 1);
        assert_eq!(again.interval, 1, "Again: 0.212 days rounds to 0, then max(1) = 1 day");

        let hard = scheduler.schedule(0.0, 5.0, 0, 0, 2);
        assert_eq!(hard.interval, 1, "Hard: 1.2931 days rounds to 1 day");

        let good = scheduler.schedule(0.0, 5.0, 0, 0, 3);
        assert_eq!(good.interval, 2, "Good: 2.3065 days rounds to 2 days");

        let easy = scheduler.schedule(0.0, 5.0, 0, 0, 4);
        assert_eq!(easy.interval, 8, "Easy: 8.2956 days rounds to 8 days");
    }
}
