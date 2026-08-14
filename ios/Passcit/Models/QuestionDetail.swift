import Foundation

// GET /api/questions/:id — getQuestionById() returns the full Question row
// via Prisma `include` (every scalar column, not just a `select`ed
// subset), plus its full answers/progress. Only the fields this app
// actually renders are decoded below; Codable silently ignores the rest
// (testVersionId, createdAt, tags, etc.).
struct QuestionDetail: Codable, Equatable, Identifiable {
    let id: String
    let number: Int
    let category: String
    let question: String
    let explanation: String?
    let isDynamicAnswer: Bool
    let dynamicNote: String?
    let variesByLocation: Bool
    let answers: [QuestionAnswerDetail]
    let progress: [QuestionProgressSummary]

    var isFavorite: Bool { progress.first?.isFavorite ?? false }
    var acceptedAnswers: [String] { answers.map(\.text) }
}

struct QuestionAnswerDetail: Codable, Equatable, Identifiable {
    let id: String
    let text: String
}

struct QuestionDetailResponse: Codable, Equatable {
    let question: QuestionDetail
}
