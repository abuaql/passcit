import Foundation

// A single question as embedded inline in GET /api/lessons/:id — the
// official USCIS question/answer text and metadata, verbatim from the
// backend. Never rewritten or supplemented on the client.
struct LessonQuestionContent: Codable, Equatable, Identifiable {
    let id: String
    let number: Int
    let category: String
    let subcategory: String
    let question: String
    let explanation: String?
    let answers: [String]
    let requiredAnswerCount: Int
    let isSpecial65_20: Bool
    let isDynamicAnswer: Bool
    let dynamicNote: String?
    let variesByLocation: Bool
}
