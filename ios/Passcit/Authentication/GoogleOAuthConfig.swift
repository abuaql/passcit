import Foundation

// The iOS-type OAuth client ID from Google Cloud Console (Bundle ID
// com.sudax.passcitapp). Public, non-secret identifier — safe to embed.
// Also drives the URL Type/redirect scheme registered in project.yml,
// which MUST exactly match Google's reversed-client-ID convention.
enum GoogleOAuthConfig {
    static let iOSClientID = "1017542455339-if94tsjtie7adujqrfc51cm766fflrq9.apps.googleusercontent.com"

    static var redirectURI: String {
        "\(reversedClientIDScheme):/oauth2redirect"
    }

    // "1234-abc.apps.googleusercontent.com" -> "com.googleusercontent.apps.1234-abc"
    static var reversedClientIDScheme: String {
        let firstSegment = iOSClientID.split(separator: ".").first.map(String.init) ?? ""
        return "com.googleusercontent.apps.\(firstSegment)"
    }
}
