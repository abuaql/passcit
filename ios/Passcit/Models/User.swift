import Foundation

struct User: Codable, Equatable, Identifiable {
    enum Role: String, Codable {
        case user = "USER"
        case admin = "ADMIN"
    }

    let id: String
    let name: String?
    let email: String
    let image: String?
    let role: Role
    // Only GET /api/user/me returns this — native login/register/apple/
    // google responses don't include it, so this decodes to nil there
    // (a missing JSON key is nil for an Optional, not a decode failure).
    // StudyLanguageStore treats a nil here as "not yet known" and falls
    // back to .en until the background /me reconciliation completes.
    let studyLanguage: StudyLanguage?
}
