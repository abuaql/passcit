import Foundation
@testable import Passcit

/// Small builders for Question model fixtures. Not a @Test/@Suite itself.
enum QuestionFixtures {
    static func summary(
        id: String,
        number: Int = 1,
        category: String = "AMERICAN_GOVERNMENT",
        question: String = "What is the supreme law of the land?",
        previewAnswer: String = "the Constitution",
        variesByLocation: Bool = false,
        isDynamicAnswer: Bool = false,
        isFavorite: Bool = false,
        status: String = "NEW"
    ) -> QuestionSummary {
        QuestionSummary(
            id: id,
            number: number,
            category: category,
            question: question,
            isSpecial65_20: false,
            isDynamicAnswer: isDynamicAnswer,
            variesByLocation: variesByLocation,
            answers: [QuestionAnswerPreview(text: previewAnswer)],
            progress: [QuestionProgressSummary(isFavorite: isFavorite, status: status)]
        )
    }

    static func detail(
        id: String,
        question: String = "What is the supreme law of the land?",
        answers: [String] = ["the Constitution"],
        explanation: String? = nil,
        variesByLocation: Bool = false,
        isDynamicAnswer: Bool = false,
        dynamicNote: String? = nil,
        isFavorite: Bool = false
    ) -> QuestionDetail {
        QuestionDetail(
            id: id,
            number: 1,
            category: "AMERICAN_GOVERNMENT",
            question: question,
            explanation: explanation,
            isDynamicAnswer: isDynamicAnswer,
            dynamicNote: dynamicNote,
            variesByLocation: variesByLocation,
            answers: answers.enumerated().map { QuestionAnswerDetail(id: "a\($0.offset)", text: $0.element) },
            progress: [QuestionProgressSummary(isFavorite: isFavorite, status: "NEW")]
        )
    }
}
