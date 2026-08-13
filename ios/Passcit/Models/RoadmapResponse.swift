import Foundation

struct RoadmapResponse: Codable, Equatable {
    let roadmap: Roadmap
}

// GET /api/roadmap?testVersionId=...
struct Roadmap: Codable, Equatable {
    let testVersionId: String
    let units: [RoadmapUnit]
    let resumeTarget: RoadmapResumeTarget?
}

// A discriminated union on `type`: "lesson" carries unitId+lessonId,
// "exam" carries only unitId. NOTE: this is deliberately a distinct type
// from DashboardResponse.swift's `ResumeTarget` — the dashboard endpoint
// relabels the same underlying value to uppercase "LESSON"/"UNIT_EXAM"
// for its own DTO (see src/lib/dashboard.ts's toDashboardResume), but
// GET /api/roadmap returns getRoadmap()'s raw, lowercase "lesson"/"exam"
// values unrelabeled. Reusing the dashboard's type here would silently
// fail to decode.
enum RoadmapResumeTarget: Codable, Equatable {
    case lesson(unitId: String, lessonId: String)
    case exam(unitId: String)

    private enum CodingKeys: String, CodingKey {
        case type, unitId, lessonId
    }

    private enum Kind: String, Codable {
        case lesson, exam
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        switch try container.decode(Kind.self, forKey: .type) {
        case .lesson:
            self = .lesson(
                unitId: try container.decode(String.self, forKey: .unitId),
                lessonId: try container.decode(String.self, forKey: .lessonId)
            )
        case .exam:
            self = .exam(unitId: try container.decode(String.self, forKey: .unitId))
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .lesson(let unitId, let lessonId):
            try container.encode(Kind.lesson, forKey: .type)
            try container.encode(unitId, forKey: .unitId)
            try container.encode(lessonId, forKey: .lessonId)
        case .exam(let unitId):
            try container.encode(Kind.exam, forKey: .type)
            try container.encode(unitId, forKey: .unitId)
        }
    }
}
