import Foundation

// Shared by Reading/Writing/Civics section state.
enum InterviewSectionResult: String, Codable, Equatable {
    case passed = "PASSED"
    case failed = "FAILED"
    case notReached = "NOT_REACHED"
}

// POST /api/interview
struct StartInterviewResponse: Codable, Equatable {
    let interviewId: String
    let testVersion: InterviewTestVersionInfo
    let readingSentences: [InterviewSentence]
    let writingSentences: [InterviewSentence]
    let civicsQuestions: [InterviewCivicsQuestion]
}

struct InterviewTestVersionInfo: Codable, Equatable {
    let id: String
    let name: String
    let questionsAsked: Int
    let passThreshold: Int
}

// Reading sentences are shown as text (read aloud by the learner);
// Writing sentences are spoken via TTS, never shown as text — see
// InterviewWritingView (Stage 13D). Same wire shape either way.
struct InterviewSentence: Codable, Equatable, Identifiable {
    let id: String
    let text: String
}

// A civics question as returned by POST /api/interview — deliberately
// does NOT declare an `answers` property. The server's JSON includes
// full accepted-answer text (see the Phase 13 audit), but Codable only
// decodes fields a type actually declares, so accepted answers are
// structurally unreachable from this type — not just withheld by view
// discipline. Grading is entirely server-side (POST .../civics only
// needs questionId + answerText); this type has nothing to grade with
// even if a view wanted to.
struct InterviewCivicsQuestion: Codable, Equatable, Identifiable {
    let id: String
    let number: Int
    let category: String
    let question: String
    let explanation: String?
    let requiredAnswerCount: Int
}
