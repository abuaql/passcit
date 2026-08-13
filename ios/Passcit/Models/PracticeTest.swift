import Foundation

// POST /api/practice-tests — category is only meaningful (and only
// sent) for CATEGORY mode; the synthesized Encodable conformance omits
// it entirely when nil, matching the backend's `.optional()` (not
// `.nullable()`) Zod schema for this field.
struct StartPracticeTestRequestBody: Encodable {
    let mode: String
    let category: String?
}

// POST /api/practice-tests
struct StartPracticeTestResponse: Codable, Equatable {
    let testId: String
    let mode: String
    let questions: [PracticeQuestion]
    let passThreshold: Int
    let questionsAsked: Int
}
