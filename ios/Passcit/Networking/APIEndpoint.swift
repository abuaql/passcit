import Foundation

// A plain struct rather than a growing enum — adding an endpoint in a
// later phase never requires touching APIClient itself.
struct APIEndpoint {
    let path: String
    let method: HTTPMethod
    var body: Encodable?
    var requiresAuth: Bool = true
    // Query items, e.g. ?testVersionId=... — kept separate from `path`
    // because URL.appendingPathComponent percent-encodes "?", so a query
    // string can't just be concatenated onto path.
    var queryItems: [URLQueryItem] = []
}
