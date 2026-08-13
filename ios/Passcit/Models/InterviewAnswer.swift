import Foundation

// The server's fuzzy-match grading verdict (src/lib/answer-matching.ts) —
// decoded, never computed client-side.
enum MatchVerdict: String, Codable, Equatable {
    case correct = "CORRECT"
    case almostCorrect = "ALMOST_CORRECT"
    case incorrect = "INCORRECT"
}

// POST .../reading and POST .../writing share this response shape.
struct SectionAttemptResult: Codable, Equatable {
    let isCorrect: Bool
    let sectionResult: InterviewSectionResult
    let attemptsSoFar: Int
}

// POST .../civics
struct CivicsAnswerResult: Codable, Equatable {
    let isCorrect: Bool
    let verdict: MatchVerdict
    let done: Bool
    let passed: Bool?
}

struct SubmitReadingAttemptRequestBody: Encodable {
    let sentenceId: String
    let sentenceText: String
    let transcript: String
}

struct SubmitWritingAttemptRequestBody: Encodable {
    let sentenceId: String
    let sentenceText: String
    let typedAnswer: String
}

// passThreshold/questionsAsked are cached client-side from the start
// response and echoed back here — the server uses them only for the
// early-stop calculation (mockInterviewStatus), not for grading this
// specific answer, which is graded against the real Question row it
// looks up server-side from questionId.
struct SubmitCivicsAnswerRequestBody: Encodable {
    let questionId: String
    let answerText: String
    let passThreshold: Int
    let questionsAsked: Int
}

struct StartInterviewRequestBody: Encodable {
    let testVersionId: String
}
