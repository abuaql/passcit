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
}
