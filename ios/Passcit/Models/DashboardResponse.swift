import Foundation

struct DashboardResponse: Codable, Equatable {
    let dashboard: Dashboard
}

struct Dashboard: Codable, Equatable {
    let stats: DashboardStats
    let xp: DashboardXP
    let dailyGoal: DailyGoal
    let resume: ResumeTarget?
}

struct DashboardStats: Codable, Equatable {
    let questionsCompleted: Int
    let totalQuestions: Int
    let accuracyPercent: Int?
    let currentStreak: Int
    let longestStreak: Int
    let favoritesCount: Int
    let lastActivity: Date?
}

struct DashboardXP: Codable, Equatable {
    let totalXP: Int
}

struct DailyGoal: Codable, Equatable {
    let target: Int
    let progress: Int
    let met: Bool
}

// A discriminated union on `type`: "LESSON" carries unitId+lessonId,
// "UNIT_EXAM" carries only unitId. Custom Codable is required since
// Swift enums with associated values don't synthesize this shape.
enum ResumeTarget: Codable, Equatable {
    case lesson(unitId: String, lessonId: String)
    case unitExam(unitId: String)

    private enum CodingKeys: String, CodingKey {
        case type, unitId, lessonId
    }

    private enum Kind: String, Codable {
        case lesson = "LESSON"
        case unitExam = "UNIT_EXAM"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        switch try container.decode(Kind.self, forKey: .type) {
        case .lesson:
            self = .lesson(
                unitId: try container.decode(String.self, forKey: .unitId),
                lessonId: try container.decode(String.self, forKey: .lessonId)
            )
        case .unitExam:
            self = .unitExam(unitId: try container.decode(String.self, forKey: .unitId))
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .lesson(let unitId, let lessonId):
            try container.encode(Kind.lesson, forKey: .type)
            try container.encode(unitId, forKey: .unitId)
            try container.encode(lessonId, forKey: .lessonId)
        case .unitExam(let unitId):
            try container.encode(Kind.unitExam, forKey: .type)
            try container.encode(unitId, forKey: .unitId)
        }
    }
}
