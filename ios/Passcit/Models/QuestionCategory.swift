import Foundation

// Matches the backend's QuestionCategory Prisma enum exactly. Display
// labels mirror src/lib/categories.ts's CATEGORY_LABELS verbatim, since
// there's no localization system in this app yet — English strings live
// inline, matching the convention already established by
// EligibilityResultView's warning/recommendation text.
enum QuestionCategory: String, Codable, Equatable, CaseIterable {
    case americanGovernment = "AMERICAN_GOVERNMENT"
    case americanHistory = "AMERICAN_HISTORY"
    case integratedCivics = "INTEGRATED_CIVICS"
    case symbolsAndHolidays = "SYMBOLS_AND_HOLIDAYS"

    var displayName: String {
        switch self {
        case .americanGovernment: return "American Government"
        case .americanHistory: return "American History"
        case .integratedCivics: return "Integrated Civics"
        case .symbolsAndHolidays: return "Symbols and Holidays"
        }
    }
}
