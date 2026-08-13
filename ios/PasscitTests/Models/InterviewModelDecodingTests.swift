import Testing
import Foundation
@testable import Passcit

@Suite("Interview model decoding matches the backend contract")
struct InterviewModelDecodingTests {

    private func makeDecoder() -> JSONDecoder {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { fieldDecoder in
            let container = try fieldDecoder.singleValueContainer()
            let string = try container.decode(String.self)
            guard let date = formatter.date(from: string) else {
                throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid ISO8601 date: \(string)")
            }
            return date
        }
        return decoder
    }

    @Test func decodesStartInterviewResponse() throws {
        let json = """
        {"interviewId":"interview_1",
         "testVersion":{"id":"tv_2025","name":"2025 Civics Test","questionsAsked":20,"passThreshold":12},
         "readingSentences":[{"id":"r1","text":"I want to be a citizen."}],
         "writingSentences":[{"id":"w1","text":"Citizens can vote."}],
         "civicsQuestions":[
           {"id":"q1","number":1,"category":"AMERICAN_GOVERNMENT","subcategory":"Principles of American Government",
            "question":"What is the supreme law of the land?","explanation":null,"requiredAnswerCount":1,
            "isSpecial65_20":false,"isDynamicAnswer":false,"dynamicNote":null,"variesByLocation":false,
            "answers":[{"id":"a1","text":"the Constitution","sortOrder":0}]}
         ]}
        """
        let response = try JSONDecoder().decode(StartInterviewResponse.self, from: Data(json.utf8))
        #expect(response.interviewId == "interview_1")
        #expect(response.testVersion.questionsAsked == 20)
        #expect(response.testVersion.passThreshold == 12)
        #expect(response.readingSentences.first?.text == "I want to be a citizen.")
        #expect(response.writingSentences.first?.id == "w1")
        #expect(response.civicsQuestions.count == 1)
        #expect(response.civicsQuestions[0].question == "What is the supreme law of the land?")
    }

    // The core security-relevant proof: the backend's real JSON response
    // includes full accepted-answer text on every civics question (see
    // the Phase 13 audit), but InterviewCivicsQuestion declares no
    // `answers` property. Decoding must succeed anyway (Codable ignores
    // undeclared keys) and there must be no way to read the answer text
    // back out of the decoded value — proven structurally, not by
    // convention.
    @Test func civicsQuestionNeverDecodesAcceptedAnswerText() throws {
        let json = """
        {"id":"q1","number":38,"category":"AMERICAN_GOVERNMENT",
         "question":"What is the name of the President of the United States now?",
         "explanation":null,"requiredAnswerCount":1,
         "answers":[{"id":"a1","text":"SECRET_ACCEPTED_ANSWER","sortOrder":0},{"id":"a2","text":"Also Secret","sortOrder":1}]}
        """
        let question = try JSONDecoder().decode(InterviewCivicsQuestion.self, from: Data(json.utf8))
        #expect(question.number == 38)
        // Mirror-reflect every stored property and confirm none of them
        // carry the accepted-answer text — the type has no `answers`
        // field to begin with, so this can never find it, but asserting
        // it directly documents the guarantee under test.
        let mirror = Mirror(reflecting: question)
        let allValues = mirror.children.map { String(describing: $0.value) }
        #expect(!allValues.contains { $0.contains("SECRET_ACCEPTED_ANSWER") })
        #expect(mirror.children.contains { $0.label == "answers" } == false)
    }

    @Test func decodesSectionAttemptResult() throws {
        let json = #"{"isCorrect":true,"sectionResult":"PASSED","attemptsSoFar":1}"#
        let result = try JSONDecoder().decode(SectionAttemptResult.self, from: Data(json.utf8))
        #expect(result.isCorrect == true)
        #expect(result.sectionResult == .passed)
        #expect(result.attemptsSoFar == 1)
    }

    @Test func decodesSectionAttemptResultNotReachedAndFailed() throws {
        let notReached = try JSONDecoder().decode(SectionAttemptResult.self, from: Data(#"{"isCorrect":false,"sectionResult":"NOT_REACHED","attemptsSoFar":1}"#.utf8))
        #expect(notReached.sectionResult == .notReached)

        let failed = try JSONDecoder().decode(SectionAttemptResult.self, from: Data(#"{"isCorrect":false,"sectionResult":"FAILED","attemptsSoFar":3}"#.utf8))
        #expect(failed.sectionResult == .failed)
        #expect(failed.attemptsSoFar == 3)
    }

    @Test func decodesCivicsAnswerResultInProgress() throws {
        let json = #"{"isCorrect":true,"verdict":"CORRECT","done":false,"passed":null}"#
        let result = try JSONDecoder().decode(CivicsAnswerResult.self, from: Data(json.utf8))
        #expect(result.verdict == .correct)
        #expect(result.done == false)
        #expect(result.passed == nil)
    }

    @Test func decodesCivicsAnswerResultDonePassed() throws {
        let json = #"{"isCorrect":true,"verdict":"CORRECT","done":true,"passed":true}"#
        let result = try JSONDecoder().decode(CivicsAnswerResult.self, from: Data(json.utf8))
        #expect(result.done == true)
        #expect(result.passed == true)
    }

    @Test func decodesCivicsAnswerResultAlmostCorrectAndIncorrect() throws {
        let almost = try JSONDecoder().decode(CivicsAnswerResult.self, from: Data(#"{"isCorrect":false,"verdict":"ALMOST_CORRECT","done":false,"passed":null}"#.utf8))
        #expect(almost.verdict == .almostCorrect)
        #expect(almost.isCorrect == false) // civics only counts exact CORRECT — see recordCivicsAnswer

        let incorrect = try JSONDecoder().decode(CivicsAnswerResult.self, from: Data(#"{"isCorrect":false,"verdict":"INCORRECT","done":true,"passed":false}"#.utf8))
        #expect(incorrect.verdict == .incorrect)
        #expect(incorrect.passed == false)
    }

    @Test func decodesInterviewCompletionResult() throws {
        let json = """
        {"passed":true,"readingResult":"PASSED","writingResult":"PASSED","civicsResult":"PASSED",
         "civicsCorrectCount":12,"civicsIncorrectCount":3,"durationSec":247}
        """
        let result = try JSONDecoder().decode(InterviewCompletionResult.self, from: Data(json.utf8))
        #expect(result.passed == true)
        #expect(result.civicsCorrectCount == 12)
        #expect(result.durationSec == 247)
    }

    @Test func decodesInterviewCompletionResultWithAnAbandonedSection() throws {
        // Reading/Writing never reached, only Civics attempted and failed —
        // overall passed must still reflect only sections actually reached.
        let json = """
        {"passed":false,"readingResult":"NOT_REACHED","writingResult":"NOT_REACHED","civicsResult":"FAILED",
         "civicsCorrectCount":4,"civicsIncorrectCount":9,"durationSec":90}
        """
        let result = try JSONDecoder().decode(InterviewCompletionResult.self, from: Data(json.utf8))
        #expect(result.readingResult == .notReached)
        #expect(result.civicsResult == .failed)
        #expect(result.passed == false)
    }

    @Test func decodesInterviewHistoryResponse() throws {
        let json = """
        {"history":[
          {"id":"i1","startedAt":"2026-08-01T00:00:00.000Z","completedAt":"2026-08-01T00:05:00.000Z",
           "durationSec":300,"passed":true,"readingResult":"PASSED","writingResult":"PASSED","civicsResult":"PASSED",
           "civicsCorrectCount":15,"civicsIncorrectCount":2,"testVersion":{"name":"2025 Civics Test"}}
        ]}
        """
        let response = try makeDecoder().decode(InterviewHistoryResponse.self, from: Data(json.utf8))
        #expect(response.history.count == 1)
        #expect(response.history[0].passed == true)
        #expect(response.history[0].testVersion.name == "2025 Civics Test")
    }

    @Test func decodesInterviewHistoryWithAnIncompleteEntry() throws {
        let json = """
        {"history":[
          {"id":"i2","startedAt":"2026-08-01T00:00:00.000Z","completedAt":null,
           "durationSec":null,"passed":null,"readingResult":"NOT_REACHED","writingResult":"NOT_REACHED","civicsResult":"NOT_REACHED",
           "civicsCorrectCount":0,"civicsIncorrectCount":0,"testVersion":{"name":"2025 Civics Test"}}
        ]}
        """
        let response = try makeDecoder().decode(InterviewHistoryResponse.self, from: Data(json.utf8))
        #expect(response.history[0].completedAt == nil)
        #expect(response.history[0].passed == nil)
    }

    @Test func decodesInterviewDetailResponseAndWithholdsAnswerTextThroughout() throws {
        let json = """
        {"interview":{
          "id":"i1","startedAt":"2026-08-01T00:00:00.000Z","completedAt":"2026-08-01T00:05:00.000Z",
          "durationSec":300,"identityQuestionsCompleted":true,
          "readingResult":"PASSED","writingResult":"PASSED","civicsResult":"PASSED",
          "civicsCorrectCount":15,"civicsIncorrectCount":2,"passed":true,
          "testVersion":{"name":"2025 Civics Test","passThreshold":12,"questionsAsked":20},
          "civicsAnswers":[
            {"id":"ca1","isCorrect":true,"spokenAnswer":"the Constitution","answeredAt":"2026-08-01T00:01:00.000Z",
             "question":{"number":1,"question":"What is the supreme law of the land?","category":"AMERICAN_GOVERNMENT",
                         "answers":[{"id":"a1","text":"SECRET_ACCEPTED_ANSWER","sortOrder":0}]}}
          ],
          "categoryPerformance":[{"category":"AMERICAN_GOVERNMENT","correct":10,"total":12,"accuracyPercent":83}]
        }}
        """
        let response = try makeDecoder().decode(InterviewDetailResponse.self, from: Data(json.utf8))
        let detail = response.interview
        #expect(detail.identityQuestionsCompleted == true)
        #expect(detail.civicsAnswers.count == 1)
        #expect(detail.civicsAnswers[0].spokenAnswer == "the Constitution")
        #expect(detail.civicsAnswers[0].question.number == 1)
        #expect(detail.categoryPerformance[0].accuracyPercent == 83)

        // Same structural withholding guarantee as the start-response question type.
        let mirror = Mirror(reflecting: detail.civicsAnswers[0].question)
        #expect(mirror.children.contains { $0.label == "answers" } == false)
        let allValues = mirror.children.map { String(describing: $0.value) }
        #expect(!allValues.contains { $0.contains("SECRET_ACCEPTED_ANSWER") })
    }

    @Test func encodesStartInterviewRequestBodyWithExplicitTestVersionId() throws {
        let body = StartInterviewRequestBody(testVersionId: "tv_2025")
        let data = try JSONEncoder().encode(body)
        let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        #expect(object?["testVersionId"] as? String == "tv_2025")
    }

    @Test func encodesSubmitCivicsAnswerRequestBody() throws {
        let body = SubmitCivicsAnswerRequestBody(questionId: "q1", answerText: "the Constitution", passThreshold: 12, questionsAsked: 20)
        let data = try JSONEncoder().encode(body)
        let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        #expect(object?["questionId"] as? String == "q1")
        #expect(object?["answerText"] as? String == "the Constitution")
        #expect(object?["passThreshold"] as? Int == 12)
        #expect(object?["questionsAsked"] as? Int == 20)
        // Confirms the request body has no field capable of carrying an
        // accepted-answer list — grading is entirely server-side.
        #expect(object?.keys.sorted() == ["answerText", "passThreshold", "questionId", "questionsAsked"])
    }

    @Test func encodesSubmitReadingAndWritingAttemptRequestBodies() throws {
        let reading = SubmitReadingAttemptRequestBody(sentenceId: "r1", sentenceText: "I want to be a citizen.", transcript: "I want to be a citizen")
        let readingData = try JSONEncoder().encode(reading)
        let readingObject = try JSONSerialization.jsonObject(with: readingData) as? [String: Any]
        #expect(readingObject?["sentenceId"] as? String == "r1")
        #expect(readingObject?["transcript"] as? String == "I want to be a citizen")

        let writing = SubmitWritingAttemptRequestBody(sentenceId: "w1", sentenceText: "Citizens can vote.", typedAnswer: "Citizens can vote")
        let writingData = try JSONEncoder().encode(writing)
        let writingObject = try JSONSerialization.jsonObject(with: writingData) as? [String: Any]
        #expect(writingObject?["typedAnswer"] as? String == "Citizens can vote")
    }
}
