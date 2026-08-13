enum AuthState: Equatable {
    case bootstrapping
    case signedOut
    case signedIn(User)
}
