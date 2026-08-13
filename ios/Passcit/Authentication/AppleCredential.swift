import AuthenticationServices

struct AppleCredential {
    let identityToken: String
    let authorizationCode: String?
    let firstName: String?
    let lastName: String?
}

enum AppleCredentialError: Error {
    case invalid
}

extension AppleCredential {
    // Apple only populates fullName on the FIRST authorization for a given
    // Apple ID + app pair — nil on every subsequent sign-in, which is fine
    // since the `name` field in the /apple request body is optional.
    init(authorization: ASAuthorization) throws {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let identityToken = String(data: tokenData, encoding: .utf8) else {
            throw AppleCredentialError.invalid
        }
        self.identityToken = identityToken
        self.authorizationCode = credential.authorizationCode.flatMap { String(data: $0, encoding: .utf8) }
        self.firstName = credential.fullName?.givenName
        self.lastName = credential.fullName?.familyName
    }
}
