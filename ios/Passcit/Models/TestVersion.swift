import Foundation

struct TestVersionsResponse: Codable, Equatable {
    let testVersions: [TestVersion]
}

struct TestVersion: Codable, Equatable, Identifiable {
    let id: String
    let slug: String
    let name: String
    let description: String?
    let isActive: Bool
    let isDefault: Bool
}

// POST /api/user/active-test-version — an existing, general per-user
// setting (not Practice-specific) that GET /api/practice-tests' start
// endpoint implicitly reads via the backend's own getActiveTestVersion().
struct SetActiveTestVersionResponse: Codable, Equatable {
    let testVersion: TestVersion
}
