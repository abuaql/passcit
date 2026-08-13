import AuthenticationServices
import UIKit

enum GoogleSignInError: Error {
    case missingCallbackURL
    case missingAuthorizationCode
    case stateMismatch
    case tokenExchangeFailed
    case cancelled
    case other(Error)
}

// Drives Google's Authorization Code + PKCE flow via ASWebAuthenticationSession
// — no GoogleSignIn SDK dependency. Returns a Google id_token ready to POST
// to /api/native/auth/google.
@MainActor
final class GoogleSignInController: NSObject {
    private var continuation: CheckedContinuation<URL, Error>?
    private var session: ASWebAuthenticationSession?

    func signIn() async throws -> String {
        let codeVerifier = PKCE.generateCodeVerifier()
        let codeChallenge = PKCE.codeChallenge(for: codeVerifier)
        let state = PKCE.generateCodeVerifier()

        var components = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        components.queryItems = [
            URLQueryItem(name: "client_id", value: GoogleOAuthConfig.iOSClientID),
            URLQueryItem(name: "redirect_uri", value: GoogleOAuthConfig.redirectURI),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: "openid email profile"),
            URLQueryItem(name: "code_challenge", value: codeChallenge),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
            URLQueryItem(name: "state", value: state),
        ]

        let callbackURL = try await authenticate(url: components.url!)

        guard let callbackComponents = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false),
              let returnedState = callbackComponents.queryItems?.first(where: { $0.name == "state" })?.value,
              returnedState == state else {
            throw GoogleSignInError.stateMismatch
        }
        guard let code = callbackComponents.queryItems?.first(where: { $0.name == "code" })?.value else {
            throw GoogleSignInError.missingAuthorizationCode
        }

        return try await exchangeCodeForIDToken(code: code, codeVerifier: codeVerifier)
    }

    private func authenticate(url: URL) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: GoogleOAuthConfig.reversedClientIDScheme
            ) { [weak self] callbackURL, error in
                self?.finishAuthentication(callbackURL: callbackURL, error: error)
            }
            session.presentationContextProvider = self
            // Don't silently reuse an existing signed-in Safari Google
            // session — always show the picker explicitly.
            session.prefersEphemeralWebBrowserSession = true
            self.session = session
            session.start()
        }
    }

    private func finishAuthentication(callbackURL: URL?, error: Error?) {
        defer { continuation = nil }
        if let error {
            if let authError = error as? ASWebAuthenticationSessionError, authError.code == .canceledLogin {
                continuation?.resume(throwing: GoogleSignInError.cancelled)
            } else {
                continuation?.resume(throwing: GoogleSignInError.other(error))
            }
        } else if let callbackURL {
            continuation?.resume(returning: callbackURL)
        } else {
            continuation?.resume(throwing: GoogleSignInError.missingCallbackURL)
        }
    }

    private func exchangeCodeForIDToken(code: String, codeVerifier: String) async throws -> String {
        var request = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let bodyParams = [
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": GoogleOAuthConfig.redirectURI,
            "client_id": GoogleOAuthConfig.iOSClientID,
            "code_verifier": codeVerifier,
        ]
        request.httpBody = bodyParams
            .map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")" }
            .joined(separator: "&")
            .data(using: .utf8)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw GoogleSignInError.tokenExchangeFailed
        }

        return try JSONDecoder().decode(GoogleTokenResponse.self, from: data).idToken
    }
}

private struct GoogleTokenResponse: Decodable {
    let idToken: String

    enum CodingKeys: String, CodingKey {
        case idToken = "id_token"
    }
}

extension GoogleSignInController: ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}
