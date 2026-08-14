import Foundation

// Matches the backend's StudyStatus Prisma enum exactly — POST /api/progress.
enum StudyStatus: String, Codable, Equatable {
    case new = "NEW"
    case learning = "LEARNING"
    case known = "KNOWN"
    case needsPractice = "NEEDS_PRACTICE"
}
