import Testing
import Foundation
@testable import Passcit

@Suite("Learn model decoding matches the backend roadmap contract")
struct LearnModelDecodingTests {

    @Test func decodesRoadmapWithLessonResumeTarget() throws {
        let json = """
        {"roadmap":{
          "testVersionId":"tv_2025",
          "units":[
            {"id":"u1","slug":"american-government-2025","title":"American Government","description":"desc","order":1,"status":"AVAILABLE",
             "lessons":[{"id":"l1","slug":"lesson-1","title":"Lesson 1","order":1,"status":"AVAILABLE","questionCount":8}],
             "examAvailable":false,"examPassed":false}
          ],
          "resumeTarget":{"type":"lesson","unitId":"u1","lessonId":"l1"}
        }}
        """
        let response = try JSONDecoder().decode(RoadmapResponse.self, from: Data(json.utf8))
        #expect(response.roadmap.testVersionId == "tv_2025")
        #expect(response.roadmap.units.count == 1)
        #expect(response.roadmap.units[0].status == .available)
        #expect(response.roadmap.units[0].lessons[0].questionCount == 8)
        #expect(response.roadmap.resumeTarget == .lesson(unitId: "u1", lessonId: "l1"))
    }

    @Test func decodesRoadmapWithExamResumeTarget() throws {
        let json = """
        {"roadmap":{"testVersionId":"tv_2025","units":[],"resumeTarget":{"type":"exam","unitId":"u1"}}}
        """
        let response = try JSONDecoder().decode(RoadmapResponse.self, from: Data(json.utf8))
        #expect(response.roadmap.resumeTarget == .exam(unitId: "u1"))
    }

    @Test func decodesRoadmapWithNilResumeTarget() throws {
        let json = """
        {"roadmap":{"testVersionId":"tv_2025","units":[],"resumeTarget":null}}
        """
        let response = try JSONDecoder().decode(RoadmapResponse.self, from: Data(json.utf8))
        #expect(response.roadmap.resumeTarget == nil)
    }

    // The dashboard's own resume target uses uppercase "LESSON"/"UNIT_EXAM"
    // (see DashboardResponse.swift). The roadmap endpoint's raw, unrelabeled
    // value is lowercase "lesson"/"exam" — confirms these are genuinely
    // distinct types, not interchangeable.
    @Test func roadmapResumeTargetUsesLowercaseType() throws {
        let json = #"{"type":"lesson","unitId":"u1","lessonId":"l1"}"#
        let target = try JSONDecoder().decode(RoadmapResumeTarget.self, from: Data(json.utf8))
        #expect(target == .lesson(unitId: "u1", lessonId: "l1"))

        let uppercaseJSON = #"{"type":"LESSON","unitId":"u1","lessonId":"l1"}"#
        #expect(throws: (any Error).self) {
            try JSONDecoder().decode(RoadmapResumeTarget.self, from: Data(uppercaseJSON.utf8))
        }
    }

    @Test func decodesUnitDetailWithExamInfo() throws {
        let json = """
        {"unit":{"id":"u1","testVersionId":"tv_2025","slug":"american-government-2025","title":"American Government",
         "description":"desc","order":1,"status":"AVAILABLE","lessons":[],"examAvailable":true,"examPassed":false,
         "exam":{"questionCount":15,"passThreshold":9}}}
        """
        let response = try JSONDecoder().decode(UnitDetailResponse.self, from: Data(json.utf8))
        #expect(response.unit.exam?.questionCount == 15)
        #expect(response.unit.exam?.passThreshold == 9)
        #expect(response.unit.examAvailable == true)
    }

    @Test func decodesLessonWithAVariesByLocationQuestion() throws {
        let json = """
        {"lesson":{"id":"l1","unitId":"u1","slug":"lesson-1","title":"Lesson 1","summary":null,"order":1,"status":"AVAILABLE",
         "questions":[
           {"id":"q23","number":23,"category":"AMERICAN_GOVERNMENT","subcategory":"System of Government",
            "question":"Who is one of your state's U.S. Senators now?","explanation":"Answers will vary by state.",
            "answers":[],"requiredAnswerCount":1,"isSpecial65_20":false,"isDynamicAnswer":false,
            "dynamicNote":null,"variesByLocation":true}
         ]}}
        """
        let response = try JSONDecoder().decode(LessonResponse.self, from: Data(json.utf8))
        let question = response.lesson.questions[0]
        #expect(question.variesByLocation == true)
        #expect(question.answers.isEmpty)
        #expect(question.explanation == "Answers will vary by state.")
    }

    @Test func decodesLessonQuestionWithDynamicNote() throws {
        let json = """
        {"id":"q38","number":38,"category":"AMERICAN_GOVERNMENT","subcategory":"System of Government",
         "question":"What is the name of the President of the United States now?","explanation":null,
         "answers":["Donald J. Trump","Donald Trump","Trump"],"requiredAnswerCount":1,"isSpecial65_20":true,
         "isDynamicAnswer":true,"dynamicNote":"Answer current as of the date shown.","variesByLocation":false}
        """
        let question = try JSONDecoder().decode(LessonQuestionContent.self, from: Data(json.utf8))
        #expect(question.isDynamicAnswer == true)
        #expect(question.answers.first == "Donald J. Trump")
        #expect(question.dynamicNote == "Answer current as of the date shown.")
    }

    @Test func decodesTestVersionsAndFindsThe2025Slug() throws {
        let json = """
        {"testVersions":[
          {"id":"tv_2008","slug":"2008","name":"2008 Civics Test","description":null,"isActive":true,"isDefault":true},
          {"id":"tv_2025","slug":"2025","name":"2025 Civics Test","description":"desc","isActive":true,"isDefault":false}
        ]}
        """
        let response = try JSONDecoder().decode(TestVersionsResponse.self, from: Data(json.utf8))
        let match = response.testVersions.first(where: { $0.slug == "2025" })
        #expect(match?.id == "tv_2025")
        #expect(match?.isDefault == false)
    }

    @Test func decodesStartExamResponseWithNonRevealingOptions() throws {
        let json = """
        {"attemptId":"a1","passThreshold":9,"totalQuestions":15,"questions":[
          {"id":"q1","number":1,"category":"AMERICAN_GOVERNMENT","question":"What is the supreme law of the land?",
           "options":[{"id":"option-0","text":"the Constitution"},{"id":"option-1","text":"the Bill of Rights"}]}
        ]}
        """
        let response = try JSONDecoder().decode(StartExamResponse.self, from: Data(json.utf8))
        #expect(response.totalQuestions == 15)
        #expect(response.questions[0].options.count == 2)
        // The raw JSON must never carry a correctness flag or accepted-answer list.
        #expect(json.contains("isCorrect") == false)
        #expect(json.contains("acceptedAnswers") == false)
    }

    @Test func decodesCompleteExamResponsePassed() throws {
        let json = """
        {"alreadyCompleted":false,"attempt":{"id":"a1","result":"PASSED","score":10,"totalQuestions":15,
         "passThreshold":9,"completedAt":"2026-08-12T04:25:38.808Z"}}
        """
        let response = try makeDecoder().decode(CompleteExamResponse.self, from: Data(json.utf8))
        #expect(response.attempt.result == .passed)
        #expect(response.attempt.score == 10)
        #expect(response.attempt.completedAt != nil)
    }

    @Test func decodesCompleteExamResponseFailed() throws {
        let json = """
        {"alreadyCompleted":false,"attempt":{"id":"a1","result":"FAILED","score":3,"totalQuestions":15,
         "passThreshold":9,"completedAt":"2026-08-12T04:25:38.808Z"}}
        """
        let response = try makeDecoder().decode(CompleteExamResponse.self, from: Data(json.utf8))
        #expect(response.attempt.result == .failed)
        #expect(response.attempt.score == 3)
    }

    @Test func decodesCompleteLessonResponse() throws {
        let json = """
        {"alreadyCompleted":true,
         "lesson":{"id":"l1","unitId":"u1","slug":"lesson-1","title":"Lesson 1","summary":null,"order":1,"status":"COMPLETED","questions":[]},
         "unit":{"id":"u1","testVersionId":"tv_2025","slug":"american-government-2025","title":"American Government",
          "description":null,"order":1,"status":"IN_PROGRESS","lessons":[],"examAvailable":false,"examPassed":false,"exam":null}}
        """
        let response = try JSONDecoder().decode(CompleteLessonResponse.self, from: Data(json.utf8))
        #expect(response.alreadyCompleted == true)
        #expect(response.lesson.status == .completed)
        #expect(response.unit.status == .inProgress)
        #expect(response.unit.exam == nil)
    }

    // Prisma serializes DateTime with fractional seconds — same custom
    // strategy the real APIClient decoder uses (APIClient.swift).
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
}
