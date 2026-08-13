import Foundation

// Shared by both Unit and Lesson status — the backend computes this live
// on every read (never trust a cached client-side copy across requests).
enum ProgressStatus: String, Codable, Equatable {
    case locked = "LOCKED"
    case available = "AVAILABLE"
    case inProgress = "IN_PROGRESS"
    case completed = "COMPLETED"
}

// GET /api/roadmap's per-unit entry.
struct RoadmapUnit: Codable, Equatable, Identifiable {
    let id: String
    let slug: String
    let title: String
    let description: String?
    let order: Int
    let status: ProgressStatus
    let lessons: [RoadmapLesson]
    let examAvailable: Bool
    let examPassed: Bool
}

struct UnitDetailResponse: Codable, Equatable {
    let unit: UnitDetail
}

// GET /api/units/:id — same shape as RoadmapUnit plus testVersionId and
// the exam's own question count / pass threshold.
struct UnitDetail: Codable, Equatable, Identifiable {
    let id: String
    let testVersionId: String
    let slug: String
    let title: String
    let description: String?
    let order: Int
    let status: ProgressStatus
    let lessons: [RoadmapLesson]
    let examAvailable: Bool
    let examPassed: Bool
    let exam: UnitExamInfo?
}
