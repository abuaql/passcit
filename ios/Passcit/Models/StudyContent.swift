import Foundation

// Matches the `type` field of POST /api/questions/:id/study's request
// body exactly (camelCase, unlike StudyActionKind below).
enum StudyContentKind: String, Codable, Equatable, CaseIterable {
    case explanation
    case translation
    case memoryTip
}

// Matches the `action` field of POST /api/study-events exactly
// (SCREAMING_SNAKE_CASE, the backend's StudyActionType Prisma enum).
enum StudyActionKind: String, Codable, Equatable {
    case explanation = "EXPLANATION"
    case translation = "TRANSLATION"
    case memoryTip = "MEMORY_TIP"
    case listen = "LISTEN"
}

// POST /api/questions/:id/study's response shape varies by requested
// `type` — only one of explanation/memoryTip/translation is ever present
// at once. All optional here rather than three separate response types,
// since Codable already treats an absent JSON key as nil for Optional.
struct StudyContentResponse: Codable, Equatable {
    let type: StudyContentKind
    let cached: Bool
    // Absent whenever the request was the English-translation no-op path.
    let devMode: Bool?
    let explanation: String?
    let memoryTip: String?
    let translation: TranslationContent?
}

struct TranslationContent: Codable, Equatable {
    let question: String?
    let answer: String?
}
