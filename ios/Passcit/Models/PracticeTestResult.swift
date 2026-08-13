import Foundation

// POST /api/practice-tests/:id/complete's response — the server's
// authoritative score/pass state. Rendered directly; never recomputed.
struct PracticeTestResult: Codable, Equatable {
    let score: Int
    let totalQuestions: Int
    let passed: Bool
    let stoppedEarly: Bool
}
