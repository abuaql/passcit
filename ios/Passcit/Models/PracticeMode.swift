import Foundation

// Matches POST /api/practice-tests's `mode` enum exactly. RANDOM_10 is
// the original Phase 12 experience and remains the default; CATEGORY,
// MISSED_ONLY, and MOCK_INTERVIEW were explicitly deferred until this
// phase — the backend has supported all four from the start, so this
// is purely a client-side gap being closed.
enum PracticeMode: String, Equatable, CaseIterable {
    case random10 = "RANDOM_10"
    case category = "CATEGORY"
    case missedOnly = "MISSED_ONLY"
    case mockInterview = "MOCK_INTERVIEW"
}
