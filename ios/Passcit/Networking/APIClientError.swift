import Foundation

enum APIClientError: Error, Equatable {
    case network(URLError)
    case decoding
    case server(status: Int, message: String)
    case sessionExpired
    case unknown
}

extension APIClientError {
    var userMessage: String {
        switch self {
        case .server(_, let message): return message
        case .network: return "Check your connection and try again."
        case .decoding, .unknown: return "Something went wrong. Please try again."
        case .sessionExpired: return "Your session expired. Please sign in again."
        }
    }
}
