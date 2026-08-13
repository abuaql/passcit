import Foundation
@testable import Passcit

/// Small builders for Practice model fixtures. Not a @Test/@Suite itself.
enum PracticeFixtures {
    static func option(id: String, text: String, isCorrect: Bool) -> PracticeQuestionOption {
        PracticeQuestionOption(id: id, text: text, isCorrect: isCorrect)
    }

    static func question(
        id: String,
        number: Int = 1,
        question: String = "What is the supreme law of the land?",
        acceptedAnswers: [String] = ["the Constitution"],
        options: [PracticeQuestionOption]? = nil,
        explanation: String? = nil
    ) -> PracticeQuestion {
        PracticeQuestion(
            id: id,
            number: number,
            category: "AMERICAN_GOVERNMENT",
            question: question,
            explanation: explanation,
            acceptedAnswers: acceptedAnswers,
            options: options ?? [
                option(id: "correct", text: acceptedAnswers.first ?? "Correct", isCorrect: true),
                option(id: "d1", text: "Distractor A", isCorrect: false),
                option(id: "d2", text: "Distractor B", isCorrect: false),
                option(id: "d3", text: "Distractor C", isCorrect: false),
            ]
        )
    }

    static func startResponse(questions: [PracticeQuestion], passThreshold: Int = 6, questionsAsked: Int = 10) -> StartPracticeTestResponse {
        StartPracticeTestResponse(testId: "test_1", mode: "RANDOM_10", questions: questions, passThreshold: passThreshold, questionsAsked: questionsAsked)
    }
}
