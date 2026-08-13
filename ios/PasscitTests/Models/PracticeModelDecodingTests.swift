import Testing
import Foundation
@testable import Passcit

@Suite("Practice model decoding matches the backend contract")
struct PracticeModelDecodingTests {

    @Test func decodesStartPracticeTestResponseWithUnmaskedCorrectness() throws {
        let json = """
        {"testId":"t1","mode":"RANDOM_10","passThreshold":6,"questionsAsked":10,
         "questions":[
           {"id":"q1","number":1,"category":"AMERICAN_GOVERNMENT","question":"What is the supreme law of the land?",
            "explanation":null,"acceptedAnswers":["the Constitution"],
            "options":[
              {"id":"correct","text":"the Constitution","isCorrect":true},
              {"id":"distractor-0","text":"the Bill of Rights","isCorrect":false},
              {"id":"distractor-1","text":"the Declaration of Independence","isCorrect":false},
              {"id":"distractor-2","text":"the Federalist Papers","isCorrect":false}
            ]}
         ]}
        """
        let response = try JSONDecoder().decode(StartPracticeTestResponse.self, from: Data(json.utf8))
        #expect(response.testId == "t1")
        #expect(response.questions.count == 1)
        // Unlike Unit Exam, correctness is NOT masked for Practice — the
        // server sends isCorrect directly on the option.
        let correctOption = response.questions[0].options.first(where: { $0.isCorrect })
        #expect(correctOption?.text == "the Constitution")
    }

    @Test func decodesCompletionResult() throws {
        let json = #"{"score":7,"totalQuestions":10,"passed":true,"stoppedEarly":false}"#
        let result = try JSONDecoder().decode(PracticeTestResult.self, from: Data(json.utf8))
        #expect(result.score == 7)
        #expect(result.totalQuestions == 10)
        #expect(result.passed == true)
        #expect(result.stoppedEarly == false)
    }

    @Test func decodesFailedResult() throws {
        let json = #"{"score":3,"totalQuestions":10,"passed":false,"stoppedEarly":false}"#
        let result = try JSONDecoder().decode(PracticeTestResult.self, from: Data(json.utf8))
        #expect(result.passed == false)
    }

    @Test func decodesSetActiveTestVersionResponse() throws {
        let json = """
        {"testVersion":{"id":"tv_2025","slug":"2025","name":"2025 Civics Test","description":"desc","isActive":true,"isDefault":false}}
        """
        let response = try JSONDecoder().decode(SetActiveTestVersionResponse.self, from: Data(json.utf8))
        #expect(response.testVersion.slug == "2025")
        #expect(response.testVersion.isDefault == false)
    }

    @Test func submittedAnswerEncodesExactlyTheExpectedFields() throws {
        let answer = SubmittedPracticeAnswer(questionId: "q1", selectedAnswer: "the Constitution", isCorrect: true)
        let data = try JSONEncoder().encode(answer)
        let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        #expect(object?["questionId"] as? String == "q1")
        #expect(object?["selectedAnswer"] as? String == "the Constitution")
        #expect(object?["isCorrect"] as? Bool == true)
    }

    // MARK: StartPracticeTestRequestBody — mode/category wire encoding

    @Test func startRequestEncodesModeAsTheExactBackendString() throws {
        for mode in PracticeMode.allCases {
            let body = StartPracticeTestRequestBody(mode: mode.rawValue, category: nil)
            let data = try JSONEncoder().encode(body)
            let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            #expect(object?["mode"] as? String == mode.rawValue)
        }
    }

    @Test func startRequestOmitsCategoryEntirelyWhenNil() throws {
        let body = StartPracticeTestRequestBody(mode: PracticeMode.random10.rawValue, category: nil)
        let data = try JSONEncoder().encode(body)
        let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        #expect(object?.keys.contains("category") == false, "category is Zod .optional() (not .nullable()) — a missing key, not an explicit null")
    }

    @Test func startRequestIncludesCategoryWhenPresent() throws {
        let body = StartPracticeTestRequestBody(mode: PracticeMode.category.rawValue, category: QuestionCategory.americanHistory.rawValue)
        let data = try JSONEncoder().encode(body)
        let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        #expect(object?["category"] as? String == "AMERICAN_HISTORY")
    }

    // MARK: PracticeMode / QuestionCategory raw values match the backend exactly

    @Test func practiceModeRawValuesMatchTheBackendZodEnum() {
        #expect(PracticeMode.random10.rawValue == "RANDOM_10")
        #expect(PracticeMode.category.rawValue == "CATEGORY")
        #expect(PracticeMode.missedOnly.rawValue == "MISSED_ONLY")
        #expect(PracticeMode.mockInterview.rawValue == "MOCK_INTERVIEW")
    }

    @Test func questionCategoryRawValuesMatchThePrismaEnum() {
        #expect(QuestionCategory.americanGovernment.rawValue == "AMERICAN_GOVERNMENT")
        #expect(QuestionCategory.americanHistory.rawValue == "AMERICAN_HISTORY")
        #expect(QuestionCategory.integratedCivics.rawValue == "INTEGRATED_CIVICS")
        #expect(QuestionCategory.symbolsAndHolidays.rawValue == "SYMBOLS_AND_HOLIDAYS")
    }

    @Test func questionCategoryDisplayNamesMatchTheBackendLabelsVerbatim() {
        // Mirrors src/lib/categories.ts's CATEGORY_LABELS exactly.
        #expect(QuestionCategory.americanGovernment.displayName == "American Government")
        #expect(QuestionCategory.americanHistory.displayName == "American History")
        #expect(QuestionCategory.integratedCivics.displayName == "Integrated Civics")
        #expect(QuestionCategory.symbolsAndHolidays.displayName == "Symbols and Holidays")
    }
}
