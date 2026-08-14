import Testing
import Foundation
@testable import Passcit

@Suite("Model decoding matches the backend contract")
struct ModelDecodingTests {

    @Test func decodesUser() throws {
        let json = """
        {"id":"u_1","name":"Jane Doe","email":"jane@example.com","image":null,"role":"USER"}
        """
        let user = try JSONDecoder().decode(User.self, from: Data(json.utf8))
        #expect(user.id == "u_1")
        #expect(user.name == "Jane Doe")
        #expect(user.email == "jane@example.com")
        #expect(user.image == nil)
        #expect(user.role == .user)
        #expect(user.studyLanguage == nil, "native login/register/apple/google responses never include this")
    }

    @Test func decodesUserMeResponseWithStudyLanguage() throws {
        let json = """
        {"user":{"id":"u_1","name":"Jane Doe","email":"jane@example.com","image":null,"role":"USER","studyLanguage":"KO"}}
        """
        let response = try JSONDecoder().decode(UserMeResponse.self, from: Data(json.utf8))
        #expect(response.user.studyLanguage == .ko)
    }

    @Test func decodesAuthResponse() throws {
        let json = """
        {"accessToken":"at","refreshToken":"rt","expiresIn":900,"tokenType":"Bearer",
         "user":{"id":"u_1","name":"Jane","email":"jane@example.com","image":null,"role":"ADMIN"}}
        """
        let response = try JSONDecoder().decode(AuthResponse.self, from: Data(json.utf8))
        #expect(response.tokenPair == TokenPair(accessToken: "at", refreshToken: "rt", expiresIn: 900, tokenType: "Bearer"))
        #expect(response.user.role == .admin)
    }

    @Test func decodesOAuthAuthResponse() throws {
        let json = """
        {"accessToken":"at","refreshToken":"rt","expiresIn":900,"tokenType":"Bearer",
         "user":{"id":"u_1","name":null,"email":"jane@example.com","image":null,"role":"USER"},
         "isNewUser":true}
        """
        let response = try JSONDecoder().decode(OAuthAuthResponse.self, from: Data(json.utf8))
        #expect(response.isNewUser == true)
        #expect(response.user.name == nil)
    }

    @Test func decodesRefreshResponseAsTokenPair() throws {
        let json = """
        {"accessToken":"at2","refreshToken":"rt2","expiresIn":900,"tokenType":"Bearer"}
        """
        let pair = try JSONDecoder().decode(TokenPair.self, from: Data(json.utf8))
        #expect(pair.refreshToken == "rt2")
    }

    @Test func decodesContentVersionAndAPIError() throws {
        let version = try JSONDecoder().decode(ContentVersionResponse.self, from: Data(#"{"version":"abc123"}"#.utf8))
        #expect(version.version == "abc123")

        let error = try JSONDecoder().decode(APIError.self, from: Data(#"{"error":"Invalid credentials."}"#.utf8))
        #expect(error.error == "Invalid credentials.")
    }

    @Test func decodesDashboardWithLessonResume() throws {
        let json = """
        {"dashboard":{
          "stats":{"questionsCompleted":5,"totalQuestions":100,"accuracyPercent":80,
                    "currentStreak":3,"longestStreak":7,"favoritesCount":2,
                    "lastActivity":"2026-08-11T00:00:00.000Z"},
          "xp":{"totalXP":150},
          "dailyGoal":{"target":10,"progress":4,"met":false},
          "resume":{"type":"LESSON","unitId":"unit_1","lessonId":"lesson_1"}
        }}
        """
        // Prisma serializes DateTime with fractional seconds (".000Z"), which
        // plain .iso8601 can't parse — the real APIClient decoder (Stage 2)
        // will need this same custom strategy.
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
        let response = try decoder.decode(DashboardResponse.self, from: Data(json.utf8))

        #expect(response.dashboard.stats.accuracyPercent == 80)
        #expect(response.dashboard.xp.totalXP == 150)
        #expect(response.dashboard.dailyGoal.met == false)
        #expect(response.dashboard.resume == .lesson(unitId: "unit_1", lessonId: "lesson_1"))
    }

    @Test func decodesDashboardWithUnitExamResumeAndNullAccuracy() throws {
        let json = """
        {"dashboard":{
          "stats":{"questionsCompleted":0,"totalQuestions":100,"accuracyPercent":null,
                    "currentStreak":0,"longestStreak":0,"favoritesCount":0,"lastActivity":null},
          "xp":{"totalXP":0},
          "dailyGoal":{"target":10,"progress":0,"met":false},
          "resume":{"type":"UNIT_EXAM","unitId":"unit_1"}
        }}
        """
        let response = try JSONDecoder().decode(DashboardResponse.self, from: Data(json.utf8))
        #expect(response.dashboard.stats.accuracyPercent == nil)
        #expect(response.dashboard.stats.lastActivity == nil)
        #expect(response.dashboard.resume == .unitExam(unitId: "unit_1"))
    }

    @Test func decodesDashboardWithNilResume() throws {
        let json = """
        {"dashboard":{
          "stats":{"questionsCompleted":0,"totalQuestions":100,"accuracyPercent":null,
                    "currentStreak":0,"longestStreak":0,"favoritesCount":0,"lastActivity":null},
          "xp":{"totalXP":0},
          "dailyGoal":{"target":10,"progress":0,"met":false},
          "resume":null
        }}
        """
        let response = try JSONDecoder().decode(DashboardResponse.self, from: Data(json.utf8))
        #expect(response.dashboard.resume == nil)
    }

    @Test func resumeTargetRoundTripsThroughEncodeDecode() throws {
        for target: ResumeTarget in [.lesson(unitId: "u1", lessonId: "l1"), .unitExam(unitId: "u2")] {
            let data = try JSONEncoder().encode(target)
            let decoded = try JSONDecoder().decode(ResumeTarget.self, from: data)
            #expect(decoded == target)
        }
    }
}
