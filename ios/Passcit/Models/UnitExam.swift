import Foundation

// Embedded in UnitDetail.
struct UnitExamInfo: Codable, Equatable {
    let questionCount: Int
    let passThreshold: Int
}

// POST /api/units/:id/exam/start
struct StartExamResponse: Codable, Equatable {
    let attemptId: String
    let passThreshold: Int
    let totalQuestions: Int
    let questions: [ExamQuestion]
}

// Deliberately carries no correctness/accepted-answer info — the server
// never exposes which option is right until the whole exam is graded.
struct ExamQuestion: Codable, Equatable, Identifiable {
    let id: String
    let number: Int
    let category: String
    let question: String
    let options: [ExamQuestionOption]
}

struct ExamQuestionOption: Codable, Equatable, Identifiable {
    let id: String
    let text: String
}

struct SubmittedAnswer: Encodable, Equatable {
    let questionId: String
    let selectedAnswer: String
}

struct CompleteExamRequestBody: Encodable {
    let answers: [SubmittedAnswer]
}

// POST /api/units/:id/exam/:attemptId/complete
struct CompleteExamResponse: Codable, Equatable {
    let alreadyCompleted: Bool
    let attempt: UnitExamAttempt
}

enum ExamResult: String, Codable, Equatable {
    case inProgress = "IN_PROGRESS"
    case passed = "PASSED"
    case failed = "FAILED"
}

struct UnitExamAttempt: Codable, Equatable, Identifiable {
    let id: String
    let result: ExamResult
    let score: Int?
    let totalQuestions: Int
    let passThreshold: Int
    let completedAt: Date?
}
