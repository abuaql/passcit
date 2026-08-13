import Foundation

// A single question as returned by POST /api/practice-tests — unlike the
// Unit Exam contract, this is NOT stripped of correctness info: each
// option already carries isCorrect, computed and sent by the server.
// The client must only ever read it, never recompute it (see
// PracticeAnswer.swift).
struct PracticeQuestion: Codable, Equatable, Identifiable {
    let id: String
    let number: Int
    let category: String
    let question: String
    let explanation: String?
    let acceptedAnswers: [String]
    let options: [PracticeQuestionOption]
}

struct PracticeQuestionOption: Codable, Equatable, Identifiable {
    let id: String
    let text: String
    let isCorrect: Bool
}
