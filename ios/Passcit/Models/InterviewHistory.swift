import Foundation

// GET /api/interview
struct InterviewHistoryResponse: Codable, Equatable {
    let history: [InterviewHistoryEntry]
}

struct InterviewHistoryEntry: Codable, Equatable, Identifiable {
    let id: String
    let startedAt: Date
    let completedAt: Date?
    let durationSec: Int?
    let passed: Bool?
    let readingResult: InterviewSectionResult
    let writingResult: InterviewSectionResult
    let civicsResult: InterviewSectionResult
    let civicsCorrectCount: Int
    let civicsIncorrectCount: Int
    let testVersion: InterviewHistoryTestVersionInfo
}

struct InterviewHistoryTestVersionInfo: Codable, Equatable {
    let name: String
}

// GET /api/interview/:id
struct InterviewDetailResponse: Codable, Equatable {
    let interview: InterviewDetail
}

struct InterviewDetail: Codable, Equatable, Identifiable {
    let id: String
    let startedAt: Date
    let completedAt: Date?
    let durationSec: Int?
    let identityQuestionsCompleted: Bool
    let readingResult: InterviewSectionResult
    let writingResult: InterviewSectionResult
    let civicsResult: InterviewSectionResult
    let civicsCorrectCount: Int
    let civicsIncorrectCount: Int
    let passed: Bool?
    let testVersion: InterviewDetailTestVersionInfo
    let civicsAnswers: [InterviewCivicsAnswerDetail]
    let categoryPerformance: [CategoryPerformance]
}

struct InterviewDetailTestVersionInfo: Codable, Equatable {
    let name: String
    let passThreshold: Int
    let questionsAsked: Int
}

// Post-hoc review of one asked-and-graded civics question. Same
// withholding rule as InterviewCivicsQuestion applies here: the nested
// question's accepted-answer text is never decoded, even for reviewing
// a past interview — "never displayed" is treated as an absolute, not
// scoped to the live interview only.
struct InterviewCivicsAnswerDetail: Codable, Equatable, Identifiable {
    let id: String
    let isCorrect: Bool
    let spokenAnswer: String
    let answeredAt: Date
    let question: InterviewAnswerQuestionInfo
}

struct InterviewAnswerQuestionInfo: Codable, Equatable {
    let number: Int
    let question: String
    let category: String
}

struct CategoryPerformance: Codable, Equatable {
    let category: String
    let correct: Int
    let total: Int
    let accuracyPercent: Int
}
