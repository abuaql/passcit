import Foundation

// Sent to POST /api/practice-tests/:id/complete. `isCorrect` must always
// be copied verbatim from the PracticeQuestionOption the user selected
// (itself sent by the server in the start response) — never computed,
// inferred, or cross-checked against acceptedAnswers or question text.
// PracticeViewModel enforces this by construction: it builds this struct
// directly from the selected PracticeQuestionOption, never from a
// separate correctness check.
struct SubmittedPracticeAnswer: Encodable, Equatable {
    let questionId: String
    let selectedAnswer: String
    let isCorrect: Bool
}

struct CompletePracticeTestRequestBody: Encodable {
    let answers: [SubmittedPracticeAnswer]
    let stoppedEarly: Bool
}
