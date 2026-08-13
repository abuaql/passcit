import Foundation

// The single async/await networking entry point — no view or view model
// talks to URLSession directly.
actor APIClient {
    private let baseURL: URL
    private let session: URLSession
    private let sessionStore: SessionStore
    private let decoder: JSONDecoder

    // Set once from the composition root after TokenRefreshCoordinator
    // exists (APIClient must be constructed first, so this can't be an
    // init parameter without a circular dependency). Only ever assigned
    // once at startup, before any concurrent use begins.
    nonisolated(unsafe) var refreshHandler: (() async throws -> Void)?

    init(baseURL: URL = APIEnvironment.baseURL, session: URLSession = .shared, sessionStore: SessionStore) {
        self.baseURL = baseURL
        self.session = session
        self.sessionStore = sessionStore
        self.decoder = APIClient.makeDecoder()
    }

    // Prisma serializes DateTime with fractional seconds (".000Z"), which
    // plain .iso8601 can't parse.
    private static func makeDecoder() -> JSONDecoder {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { fieldDecoder in
            let container = try fieldDecoder.singleValueContainer()
            let string = try container.decode(String.self)
            guard let date = formatter.date(from: string) else {
                throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid ISO8601 date: \(string)")
            }
            return date
        }
        return decoder
    }

    func send<T: Decodable>(_ endpoint: APIEndpoint, as type: T.Type) async throws -> T {
        let (data, response) = try await executeWithRefresh(endpoint)
        try validate(response, data: data, requiresAuth: endpoint.requiresAuth)
        do {
            return try decoder.decode(type, from: data)
        } catch {
            throw APIClientError.decoding
        }
    }

    @discardableResult
    func send(_ endpoint: APIEndpoint) async throws -> Data {
        let (data, response) = try await executeWithRefresh(endpoint)
        try validate(response, data: data, requiresAuth: endpoint.requiresAuth)
        return data
    }

    // Executes the request; on a 401 from an auth-required endpoint, asks
    // the refresh handler to obtain a new access token and retries once.
    private func executeWithRefresh(_ endpoint: APIEndpoint, isRetry: Bool = false) async throws -> (Data, HTTPURLResponse) {
        let (data, response) = try await execute(endpoint)

        if response.statusCode == 401, endpoint.requiresAuth, !isRetry, let refreshHandler {
            try await refreshHandler()
            return try await executeWithRefresh(endpoint, isRetry: true)
        }

        return (data, response)
    }

    private func execute(_ endpoint: APIEndpoint) async throws -> (Data, HTTPURLResponse) {
        let request = try buildRequest(endpoint)
        do {
            let (data, response) = try await session.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIClientError.unknown
            }
            return (data, httpResponse)
        } catch let error as URLError {
            throw APIClientError.network(error)
        }
    }

    private func buildRequest(_ endpoint: APIEndpoint) throws -> URLRequest {
        let url = baseURL.appendingPathComponent(endpoint.path)
        guard !endpoint.queryItems.isEmpty else {
            var request = URLRequest(url: url)
            request.httpMethod = endpoint.method.rawValue
            return try applyBodyAndAuth(&request, endpoint: endpoint)
        }
        guard var components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            throw APIClientError.unknown
        }
        components.queryItems = endpoint.queryItems
        guard let queryURL = components.url else {
            throw APIClientError.unknown
        }
        var request = URLRequest(url: queryURL)
        request.httpMethod = endpoint.method.rawValue
        return try applyBodyAndAuth(&request, endpoint: endpoint)
    }

    private func applyBodyAndAuth(_ request: inout URLRequest, endpoint: APIEndpoint) throws -> URLRequest {
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let body = endpoint.body {
            request.httpBody = try JSONEncoder().encode(body)
        }
        if endpoint.requiresAuth, let accessToken = sessionStore.accessToken {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }
        return request
    }

    // A 401 on a requiresAuth endpoint always means "not authenticated"
    // (per the backend's uniform behavior) — surfaced as .sessionExpired
    // rather than a business-logic message. A 401 on a public endpoint
    // (e.g. wrong login password) is a normal server error with its own
    // message and must NOT be reinterpreted as a dead session.
    private func validate(_ response: HTTPURLResponse, data: Data, requiresAuth: Bool) throws {
        guard (200...299).contains(response.statusCode) else {
            if requiresAuth, response.statusCode == 401 {
                throw APIClientError.sessionExpired
            }
            let message = (try? JSONDecoder().decode(APIError.self, from: data))?.error
                ?? "Something went wrong. Please try again."
            throw APIClientError.server(status: response.statusCode, message: message)
        }
    }
}
