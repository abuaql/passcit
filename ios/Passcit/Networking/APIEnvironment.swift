import Foundation

enum APIEnvironment {
    static var baseURL: URL {
        #if DEBUG
        URL(string: "http://localhost:3000")!
        #else
        URL(string: "https://passcit.app")!
        #endif
    }
}
