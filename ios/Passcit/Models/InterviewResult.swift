import Foundation

// POST .../complete — the server's authoritative final result. Rendered
// directly; nothing here is recomputed client-side.
struct InterviewCompletionResult: Codable, Equatable {
    let passed: Bool
    let readingResult: InterviewSectionResult
    let writingResult: InterviewSectionResult
    let civicsResult: InterviewSectionResult
    let civicsCorrectCount: Int
    let civicsIncorrectCount: Int
    let durationSec: Int
}
