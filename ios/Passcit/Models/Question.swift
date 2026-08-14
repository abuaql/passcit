import Foundation

// Matches questionListSelect() in src/lib/questions.ts — GET /api/questions.
// `answers` is a single-item preview only (the server takes 1), not the
// full accepted-answer list; use QuestionDetail (GET /api/questions/:id)
// for that. `progress` is a to-many Prisma relation filtered to the
// current user, so it always decodes as an array of 0 or 1 items, never
// a bare nullable object.
struct QuestionSummary: Codable, Equatable, Identifiable {
    let id: String
    let number: Int
    let category: String
    let question: String
    let isSpecial65_20: Bool
    let isDynamicAnswer: Bool
    let variesByLocation: Bool
    let answers: [QuestionAnswerPreview]
    let progress: [QuestionProgressSummary]

    var isFavorite: Bool { progress.first?.isFavorite ?? false }
    var previewAnswer: String? { answers.first?.text }
}

struct QuestionAnswerPreview: Codable, Equatable {
    let text: String
}

struct QuestionProgressSummary: Codable, Equatable {
    let isFavorite: Bool
    let status: String
}

struct QuestionsListResponse: Codable, Equatable {
    let questions: [QuestionSummary]
}
