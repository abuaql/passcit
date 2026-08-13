import Foundation
@testable import Passcit

/// Small builders for Learn model fixtures, so tests don't repeat full
/// initializer boilerplate. Not a @Test/@Suite itself.
enum LearnFixtures {
    static func lesson(
        id: String,
        title: String = "Lesson",
        order: Int = 1,
        status: ProgressStatus = .available,
        questionCount: Int = 5
    ) -> RoadmapLesson {
        RoadmapLesson(id: id, slug: id, title: title, order: order, status: status, questionCount: questionCount)
    }

    static func unit(
        id: String,
        title: String = "Unit",
        order: Int = 1,
        status: ProgressStatus = .available,
        lessons: [RoadmapLesson] = [],
        examAvailable: Bool = false,
        examPassed: Bool = false
    ) -> RoadmapUnit {
        RoadmapUnit(
            id: id, slug: id, title: title, description: nil, order: order,
            status: status, lessons: lessons, examAvailable: examAvailable, examPassed: examPassed
        )
    }

    static func roadmap(units: [RoadmapUnit], resumeTarget: RoadmapResumeTarget? = nil) -> Roadmap {
        Roadmap(testVersionId: "tv_2025", units: units, resumeTarget: resumeTarget)
    }

    static func question(
        id: String,
        number: Int = 1,
        question: String = "What is the supreme law of the land?",
        answers: [String] = ["the Constitution"],
        variesByLocation: Bool = false,
        isDynamicAnswer: Bool = false,
        dynamicNote: String? = nil,
        explanation: String? = nil
    ) -> LessonQuestionContent {
        LessonQuestionContent(
            id: id, number: number, category: "AMERICAN_GOVERNMENT", subcategory: "Principles of American Government",
            question: question, explanation: explanation, answers: answers, requiredAnswerCount: 1,
            isSpecial65_20: false, isDynamicAnswer: isDynamicAnswer, dynamicNote: dynamicNote, variesByLocation: variesByLocation
        )
    }

    static func lessonDetail(
        id: String = "lesson_1",
        title: String = "Lesson",
        status: ProgressStatus = .available,
        questions: [LessonQuestionContent]
    ) -> LessonDetail {
        LessonDetail(id: id, unitId: "unit_1", slug: id, title: title, summary: nil, order: 1, status: status, questions: questions)
    }
}
