// SRS (Spaced Repetition System) service
//
// Business logic for spaced repetition scheduling using the FSRS algorithm.
//
// Responsibilities:
// - Initialize FSRS algorithm with optimal parameters
// - Calculate review intervals based on user ratings
// - Update card state (stability, difficulty) after reviews
// - Determine next review date for flashcards
//
// FSRS provides superior scheduling compared to traditional algorithms like SM-2,
// reducing review load by 20-30% while maintaining the same retention rate.
