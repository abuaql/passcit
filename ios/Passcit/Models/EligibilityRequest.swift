import Foundation

// A UI-facing trip entry (Identifiable for SwiftUI ForEach/list editing).
// Never Codable itself — EligibilityRequestBody encodes trips onto the
// wire in its own custom encode(to:), so this type carries no wire
// format concerns.
struct EligibilityTrip: Identifiable, Equatable {
    let id = UUID()
    var departDate: Date
    var returnDate: Date
}

// POST /api/eligibility — mirrors the backend's Zod body schema
// (src/app/api/eligibility/route.ts) field-for-field. Custom Encodable
// conformance is required for two reasons neither JSONEncoder's default
// Date handling nor a plain synthesized `Encodable` can express:
//   1. APIClient's shared JSONEncoder has no custom date strategy (it
//      would encode Date as a raw timeIntervalSinceReferenceDate
//      Double, which the server's z.coerce.date() cannot parse
//      correctly) — dates are formatted as ISO8601 strings here
//      instead, matching what APIClient's decoder already expects
//      coming back.
//   2. The Zod schema distinguishes `.nullable()` fields (the key must
//      be present, value may be `null`) from `.optional()` fields (the
//      key may be omitted entirely) — a plain `encodeIfPresent` would
//      omit nullable fields instead of sending explicit `null`, which
//      Zod's `.nullable()` (without `.optional()`) rejects as a missing
//      required key.
struct EligibilityRequestBody: Encodable {
    let basis: EligibilityBasis
    let greenCardDate: Date
    let state: String
    let birthDate: Date? // nullable
    let marriedToUSCitizen: Bool
    let spouseIsUSCitizen: Bool
    let trips: [EligibilityTrip]
    let isMale: Bool
    let selectiveServiceRegisteredAnswer: Bool? // nullable
    let goodMoralCharacterConcern: Bool? // nullable
    let livedInStateThreeMonths: Bool? // nullable
    let militaryCountryServed: String? // optional
    let militaryServiceType: MilitaryServiceType? // optional
    let militaryServiceStart: Date? // optional
    let militaryServiceEnd: Date? // optional
    let militaryCurrentlyServing: Bool? // optional
    let militaryUSArmedForces: Bool? // optional

    private enum CodingKeys: String, CodingKey {
        case basis, greenCardDate, state, birthDate, marriedToUSCitizen, spouseIsUSCitizen, trips, isMale,
             selectiveServiceRegisteredAnswer, goodMoralCharacterConcern, livedInStateThreeMonths,
             militaryCountryServed, militaryServiceType, militaryServiceStart, militaryServiceEnd,
             militaryCurrentlyServing, militaryUSArmedForces
    }

    private enum TripCodingKeys: String, CodingKey {
        case departDate, returnDate
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        try container.encode(basis, forKey: .basis)
        try container.encode(Self.dateString(greenCardDate), forKey: .greenCardDate)
        try container.encode(state, forKey: .state)
        try Self.encodeNullable(birthDate.map(Self.dateString), forKey: .birthDate, in: &container)
        try container.encode(marriedToUSCitizen, forKey: .marriedToUSCitizen)
        try container.encode(spouseIsUSCitizen, forKey: .spouseIsUSCitizen)

        var tripsContainer = container.nestedUnkeyedContainer(forKey: .trips)
        for trip in trips {
            var tripContainer = tripsContainer.nestedContainer(keyedBy: TripCodingKeys.self)
            try tripContainer.encode(Self.dateString(trip.departDate), forKey: .departDate)
            try tripContainer.encode(Self.dateString(trip.returnDate), forKey: .returnDate)
        }

        try container.encode(isMale, forKey: .isMale)
        try Self.encodeNullable(selectiveServiceRegisteredAnswer, forKey: .selectiveServiceRegisteredAnswer, in: &container)
        try Self.encodeNullable(goodMoralCharacterConcern, forKey: .goodMoralCharacterConcern, in: &container)
        try Self.encodeNullable(livedInStateThreeMonths, forKey: .livedInStateThreeMonths, in: &container)

        try container.encodeIfPresent(militaryCountryServed, forKey: .militaryCountryServed)
        try container.encodeIfPresent(militaryServiceType, forKey: .militaryServiceType)
        try container.encodeIfPresent(militaryServiceStart.map(Self.dateString), forKey: .militaryServiceStart)
        try container.encodeIfPresent(militaryServiceEnd.map(Self.dateString), forKey: .militaryServiceEnd)
        try container.encodeIfPresent(militaryCurrentlyServing, forKey: .militaryCurrentlyServing)
        try container.encodeIfPresent(militaryUSArmedForces, forKey: .militaryUSArmedForces)
    }

    /// Sends an explicit JSON `null` for a nil value rather than omitting
    /// the key — required for the Zod `.nullable()` (not `.optional()`)
    /// fields, which reject a missing key as an invalid `undefined`.
    private static func encodeNullable<T: Encodable>(_ value: T?, forKey key: CodingKeys, in container: inout KeyedEncodingContainer<CodingKeys>) throws {
        if let value {
            try container.encode(value, forKey: key)
        } else {
            try container.encodeNil(forKey: key)
        }
    }

    private static let isoFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static func dateString(_ date: Date) -> String {
        isoFormatter.string(from: date)
    }
}
