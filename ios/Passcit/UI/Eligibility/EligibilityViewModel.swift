import Foundation
import Observation

/// Drives the naturalization-eligibility form and its result. Unlike
/// Interview/Practice, this isn't a section-by-section state machine —
/// it's a single form submitted once, so the phase enum stays simple.
/// The server (`src/lib/eligibility.ts`) is the sole source of truth for
/// every calculated value; `validationErrors` below only catches
/// malformed input before a wasted round trip (mirroring the backend's
/// own Zod `.refine()` rules) — it never computes eligibility itself.
@Observable
final class EligibilityViewModel {
    enum Phase: Equatable {
        case form
        case submitting
        case result
        case error
    }

    private(set) var phase: Phase = .form
    private(set) var errorMessage: String?
    private(set) var result: EligibilityResult?

    // MARK: Form fields (plain `var`s — this screen is genuinely a data
    // entry form, bound two-way from SwiftUI via @Bindable, unlike the
    // action-driven ViewModels elsewhere in the app).
    var basis: EligibilityBasis = .general
    var greenCardDate = Date()
    var state = ""
    var birthDate: Date?
    var marriedToUSCitizen = false
    var spouseIsUSCitizen = false
    var trips: [EligibilityTrip] = []
    /// nil until the user picks one — required by the server, so this
    /// (unlike the tri-state fields below) must be resolved before submit.
    var isMale: Bool?
    /// True tri-state answers — null is a meaningful, submittable value
    /// ("not sure"/"prefer not to say"), not just "not yet answered".
    var selectiveServiceRegisteredAnswer: Bool?
    var goodMoralCharacterConcern: Bool?
    var livedInStateThreeMonths: Bool?
    var militaryCountryServed = ""
    var militaryServiceType: MilitaryServiceType?
    var militaryServiceStart: Date?
    var militaryServiceEnd: Date?
    var militaryCurrentlyServing: Bool?
    var militaryUSArmedForces: Bool?

    private let eligibilityService: EligibilityServicing

    init(eligibilityService: EligibilityServicing) {
        self.eligibilityService = eligibilityService
    }

    func addTrip() {
        trips.append(EligibilityTrip(departDate: Date(), returnDate: Date()))
    }

    func removeTrip(_ trip: EligibilityTrip) {
        trips.removeAll { $0.id == trip.id }
    }

    func removeTrips(at offsets: IndexSet) {
        trips.remove(atOffsets: offsets)
    }

    /// Mirrors the backend's Zod `.refine()` checks exactly — never
    /// stricter or looser — so a validation-clean submission is never
    /// rejected server-side for a reason this screen didn't already
    /// surface, and nothing is validated here that the server wouldn't
    /// also enforce.
    var validationErrors: [String] {
        var errors: [String] = []
        if state.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors.append("Enter the state you live in.")
        }
        if greenCardDate > Date() {
            errors.append("Green card date cannot be in the future.")
        }
        if trips.contains(where: { $0.returnDate < $0.departDate }) {
            errors.append("A trip cannot return before it departs.")
        }
        if basis == .marriedToCitizen, !(marriedToUSCitizen && spouseIsUSCitizen) {
            errors.append("The 3-year rule requires confirming both that you're married to a U.S. citizen and that your spouse is a citizen.")
        }
        return errors
    }

    var canSubmit: Bool {
        validationErrors.isEmpty && isMale != nil && phase != .submitting
    }

    func submit() async {
        guard canSubmit, let isMale else { return }
        phase = .submitting
        errorMessage = nil

        let isMilitary = basis == .military
        let body = EligibilityRequestBody(
            basis: basis,
            greenCardDate: greenCardDate,
            state: state,
            birthDate: birthDate,
            marriedToUSCitizen: marriedToUSCitizen,
            spouseIsUSCitizen: spouseIsUSCitizen,
            trips: trips,
            isMale: isMale,
            selectiveServiceRegisteredAnswer: selectiveServiceRegisteredAnswer,
            goodMoralCharacterConcern: goodMoralCharacterConcern,
            livedInStateThreeMonths: livedInStateThreeMonths,
            militaryCountryServed: isMilitary && !militaryCountryServed.isEmpty ? militaryCountryServed : nil,
            militaryServiceType: isMilitary ? militaryServiceType : nil,
            militaryServiceStart: isMilitary ? militaryServiceStart : nil,
            militaryServiceEnd: isMilitary ? militaryServiceEnd : nil,
            militaryCurrentlyServing: isMilitary ? militaryCurrentlyServing : nil,
            militaryUSArmedForces: isMilitary ? militaryUSArmedForces : nil
        )

        do {
            let response = try await eligibilityService.submitCalculation(body)
            result = response.result
            phase = .result
        } catch let error as APIClientError {
            errorMessage = error.userMessage
            phase = .error
        } catch {
            errorMessage = "Something went wrong. Please try again."
            phase = .error
        }
    }

    /// Returns to the form with all prior answers intact so the user can
    /// fix input rather than start over.
    func dismissError() {
        errorMessage = nil
        phase = .form
    }

    /// Resets the entire form for a fresh calculation.
    func startNewCalculation() {
        basis = .general
        greenCardDate = Date()
        state = ""
        birthDate = nil
        marriedToUSCitizen = false
        spouseIsUSCitizen = false
        trips = []
        isMale = nil
        selectiveServiceRegisteredAnswer = nil
        goodMoralCharacterConcern = nil
        livedInStateThreeMonths = nil
        militaryCountryServed = ""
        militaryServiceType = nil
        militaryServiceStart = nil
        militaryServiceEnd = nil
        militaryCurrentlyServing = nil
        militaryUSArmedForces = nil
        result = nil
        errorMessage = nil
        phase = .form
    }
}
