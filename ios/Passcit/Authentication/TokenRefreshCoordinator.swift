import Foundation

// Actor-isolated so concurrent 401s from multiple in-flight requests all
// await the SAME refresh call rather than each firing their own — the
// refresh token is single-use (server-side rotation), so two concurrent
// raw refresh calls would mean the second one always fails.
actor TokenRefreshCoordinator {
    private var inFlightRefresh: Task<TokenPair, Error>?
    private let sessionStore: SessionStore
    private let performRawRefresh: (String) async throws -> TokenPair

    // Set once from the composition root after AuthManager exists (this
    // coordinator must be constructed before AuthManager so APIClient's
    // refreshHandler can reference it). Only ever assigned once at
    // startup, before any concurrent use begins.
    nonisolated(unsafe) var onSessionExpired: (() -> Void)?

    init(sessionStore: SessionStore, performRawRefresh: @escaping (String) async throws -> TokenPair) {
        self.sessionStore = sessionStore
        self.performRawRefresh = performRawRefresh
    }

    @discardableResult
    func refreshIfNeeded() async throws -> TokenPair {
        if let existing = inFlightRefresh {
            return try await existing.value
        }

        let task = Task<TokenPair, Error> { try await self.performRefresh() }
        inFlightRefresh = task
        defer { inFlightRefresh = nil }

        do {
            return try await task.value
        } catch {
            onSessionExpired?()
            throw error
        }
    }

    private func performRefresh() async throws -> TokenPair {
        guard let refreshToken = sessionStore.refreshToken else {
            throw APIClientError.sessionExpired
        }
        let pair = try await performRawRefresh(refreshToken)
        sessionStore.saveTokens(pair)
        return pair
    }
}
