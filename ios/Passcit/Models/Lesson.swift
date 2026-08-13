import Foundation

// GET /api/roadmap's per-lesson entry within a unit.
struct RoadmapLesson: Codable, Equatable, Identifiable {
    let id: String
    let slug: String
    let title: String
    let order: Int
    let status: ProgressStatus
    let questionCount: Int
}

struct LessonResponse: Codable, Equatable {
    let lesson: LessonDetail
}

// GET /api/lessons/:id
struct LessonDetail: Codable, Equatable, Identifiable {
    let id: String
    let unitId: String
    let slug: String
    let title: String
    let summary: String?
    let order: Int
    let status: ProgressStatus
    let questions: [LessonQuestionContent]
}

// POST /api/lessons/:id/complete
struct CompleteLessonResponse: Codable, Equatable {
    let alreadyCompleted: Bool
    let lesson: LessonDetail
    let unit: UnitDetail
}
