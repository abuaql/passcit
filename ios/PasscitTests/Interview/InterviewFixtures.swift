import Foundation
@testable import Passcit

/// Small builders for Interview model fixtures. Not a @Test/@Suite itself.
enum InterviewFixtures {
    static func sentence(id: String, text: String = "I want to be a citizen.") -> InterviewSentence {
        InterviewSentence(id: id, text: text)
    }

    static func civicsQuestion(
        id: String,
        number: Int = 1,
        question: String = "What is the supreme law of the land?",
        requiredAnswerCount: Int = 1,
        explanation: String? = nil
    ) -> InterviewCivicsQuestion {
        InterviewCivicsQuestion(
            id: id, number: number, category: "AMERICAN_GOVERNMENT",
            question: question, explanation: explanation, requiredAnswerCount: requiredAnswerCount
        )
    }

    static func testVersionInfo(
        id: String = "tv_2025",
        name: String = "2025 Civics Test",
        questionsAsked: Int = 20,
        passThreshold: Int = 12
    ) -> InterviewTestVersionInfo {
        InterviewTestVersionInfo(id: id, name: name, questionsAsked: questionsAsked, passThreshold: passThreshold)
    }

    static func startResponse(
        interviewId: String = "interview_1",
        readingSentences: [InterviewSentence]? = nil,
        writingSentences: [InterviewSentence]? = nil,
        civicsQuestions: [InterviewCivicsQuestion]? = nil,
        testVersion: InterviewTestVersionInfo? = nil
    ) -> StartInterviewResponse {
        StartInterviewResponse(
            interviewId: interviewId,
            testVersion: testVersion ?? testVersionInfo(),
            readingSentences: readingSentences ?? [sentence(id: "r1"), sentence(id: "r2"), sentence(id: "r3")],
            writingSentences: writingSentences ?? [sentence(id: "w1"), sentence(id: "w2"), sentence(id: "w3")],
            civicsQuestions: civicsQuestions ?? (1...20).map { civicsQuestion(id: "c\($0)", number: $0) }
        )
    }

    static func historyEntry(
        id: String = "interview_1",
        passed: Bool? = true,
        testVersionName: String = "2025 Civics Test"
    ) -> InterviewHistoryEntry {
        InterviewHistoryEntry(
            id: id,
            startedAt: Date(timeIntervalSince1970: 0),
            completedAt: Date(timeIntervalSince1970: 300),
            durationSec: 300,
            passed: passed,
            readingResult: .passed,
            writingResult: .passed,
            civicsResult: passed == true ? .passed : .failed,
            civicsCorrectCount: 12,
            civicsIncorrectCount: 2,
            testVersion: InterviewHistoryTestVersionInfo(name: testVersionName)
        )
    }

    static func detail(
        id: String = "interview_1",
        passed: Bool? = true,
        categoryPerformance: [CategoryPerformance] = []
    ) -> InterviewDetail {
        InterviewDetail(
            id: id,
            startedAt: Date(timeIntervalSince1970: 0),
            completedAt: Date(timeIntervalSince1970: 300),
            durationSec: 300,
            identityQuestionsCompleted: true,
            readingResult: .passed,
            writingResult: .passed,
            civicsResult: passed == true ? .passed : .failed,
            civicsCorrectCount: 12,
            civicsIncorrectCount: 2,
            passed: passed,
            testVersion: InterviewDetailTestVersionInfo(name: "2025 Civics Test", passThreshold: 12, questionsAsked: 20),
            civicsAnswers: [],
            categoryPerformance: categoryPerformance
        )
    }
}
