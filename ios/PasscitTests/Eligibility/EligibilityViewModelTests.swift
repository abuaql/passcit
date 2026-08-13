import Testing
import Foundation
@testable import Passcit

@Suite("EligibilityViewModel")
struct EligibilityViewModelTests {

    func makeViewModel(service: MockEligibilityService = MockEligibilityService()) -> (EligibilityViewModel, MockEligibilityService) {
        (EligibilityViewModel(eligibilityService: service), service)
    }

    // MARK: Initial state

    @Test func initialStateIsFormWithNoResult() {
        let (viewModel, _) = makeViewModel()
        #expect(viewModel.phase == .form)
        #expect(viewModel.result == nil)
        #expect(viewModel.basis == .general)
        #expect(viewModel.trips.isEmpty)
    }

    // MARK: Validation

    @Test func emptyStateProducesAValidationError() {
        let (viewModel, _) = makeViewModel()
        viewModel.state = ""
        #expect(viewModel.validationErrors.contains(where: { $0.contains("state") }))
    }

    @Test func futureGreenCardDateProducesAValidationError() {
        let (viewModel, _) = makeViewModel()
        viewModel.state = "CA"
        viewModel.greenCardDate = Date().addingTimeInterval(86_400 * 30)
        #expect(viewModel.validationErrors.contains(where: { $0.contains("future") }))
    }

    @Test func tripReturningBeforeItDepartsProducesAValidationError() {
        let (viewModel, _) = makeViewModel()
        viewModel.state = "CA"
        viewModel.trips = [EligibilityTrip(departDate: Date(), returnDate: Date().addingTimeInterval(-86_400))]
        #expect(viewModel.validationErrors.contains(where: { $0.contains("cannot return") }))
    }

    @Test func marriedBasisWithoutBothConfirmationsProducesAValidationError() {
        let (viewModel, _) = makeViewModel()
        viewModel.state = "CA"
        viewModel.basis = .marriedToCitizen
        viewModel.marriedToUSCitizen = true
        viewModel.spouseIsUSCitizen = false
        #expect(viewModel.validationErrors.contains(where: { $0.contains("3-year rule") }))
    }

    @Test func marriedBasisWithBothConfirmationsHasNoValidationError() {
        let (viewModel, _) = makeViewModel()
        viewModel.state = "CA"
        viewModel.basis = .marriedToCitizen
        viewModel.marriedToUSCitizen = true
        viewModel.spouseIsUSCitizen = true
        #expect(!viewModel.validationErrors.contains(where: { $0.contains("3-year rule") }))
    }

    // MARK: canSubmit gating

    @Test func cannotSubmitWithoutChoosingIsMale() {
        let (viewModel, _) = makeViewModel()
        viewModel.state = "CA"
        viewModel.isMale = nil
        #expect(viewModel.canSubmit == false)
    }

    @Test func canSubmitOnceValidAndIsMaleIsChosen() {
        let (viewModel, _) = makeViewModel()
        viewModel.state = "CA"
        viewModel.isMale = true
        #expect(viewModel.canSubmit == true)
    }

    @Test func cannotSubmitWithValidationErrorsEvenIfIsMaleIsChosen() {
        let (viewModel, _) = makeViewModel()
        viewModel.state = ""
        viewModel.isMale = true
        #expect(viewModel.canSubmit == false)
    }

    // MARK: Trip management

    @Test func addTripAppendsANewEntry() {
        let (viewModel, _) = makeViewModel()
        viewModel.addTrip()
        #expect(viewModel.trips.count == 1)
    }

    @Test func removeTripRemovesTheMatchingEntry() {
        let (viewModel, _) = makeViewModel()
        viewModel.addTrip()
        let trip = viewModel.trips[0]
        viewModel.removeTrip(trip)
        #expect(viewModel.trips.isEmpty)
    }

    // MARK: Submission

    @Test func successfulSubmitStoresResultAndEntersResultPhase() async {
        let (viewModel, service) = makeViewModel()
        viewModel.state = "CA"
        viewModel.isMale = true
        service.submitResult = .success(EligibilityFixtures.submitResponse(result: EligibilityFixtures.result(readinessScore: 55)))

        await viewModel.submit()

        #expect(viewModel.phase == .result)
        #expect(viewModel.result?.readinessScore == 55)
        #expect(service.submitCallCount == 1)
    }

    @Test func submitSendsIsMaleAsTheChosenValueNotNil() async {
        let (viewModel, service) = makeViewModel()
        viewModel.state = "CA"
        viewModel.isMale = false
        service.submitResult = .success(EligibilityFixtures.submitResponse())

        await viewModel.submit()

        #expect(service.lastSubmittedRequest?.isMale == false)
    }

    @Test func submitOmitsMilitaryFieldsWhenBasisIsNotMilitary() async {
        let (viewModel, service) = makeViewModel()
        viewModel.state = "CA"
        viewModel.isMale = true
        viewModel.basis = .general
        viewModel.militaryCountryServed = "Should not be sent"
        service.submitResult = .success(EligibilityFixtures.submitResponse())

        await viewModel.submit()

        #expect(service.lastSubmittedRequest?.militaryCountryServed == nil)
    }

    @Test func submitIncludesMilitaryFieldsWhenBasisIsMilitary() async {
        let (viewModel, service) = makeViewModel()
        viewModel.state = "CA"
        viewModel.isMale = true
        viewModel.basis = .military
        viewModel.militaryCountryServed = "USA"
        viewModel.militaryServiceType = .voluntary
        service.submitResult = .success(EligibilityFixtures.submitResponse())

        await viewModel.submit()

        #expect(service.lastSubmittedRequest?.militaryCountryServed == "USA")
        #expect(service.lastSubmittedRequest?.militaryServiceType == .voluntary)
    }

    @Test func doesNotSubmitWhenCanSubmitIsFalse() async {
        let (viewModel, service) = makeViewModel()
        viewModel.state = ""
        viewModel.isMale = nil

        await viewModel.submit()

        #expect(service.submitCallCount == 0)
        #expect(viewModel.phase == .form)
    }

    // MARK: Errors

    @Test func sessionExpirationDuringSubmitSurfacesTheUserFacingMessage() async {
        let (viewModel, service) = makeViewModel()
        viewModel.state = "CA"
        viewModel.isMale = true
        service.submitResult = .failure(APIClientError.sessionExpired)

        await viewModel.submit()

        #expect(viewModel.phase == .error)
        #expect(viewModel.errorMessage == APIClientError.sessionExpired.userMessage)
    }

    @Test func serverErrorDuringSubmitSurfacesItsMessage() async {
        let (viewModel, service) = makeViewModel()
        viewModel.state = "CA"
        viewModel.isMale = true
        service.submitResult = .failure(APIClientError.server(status: 500, message: "Could not calculate eligibility."))

        await viewModel.submit()

        #expect(viewModel.errorMessage == "Could not calculate eligibility.")
    }

    @Test func dismissErrorReturnsToFormWithAnswersIntact() async {
        let (viewModel, service) = makeViewModel()
        viewModel.state = "CA"
        viewModel.isMale = true
        service.submitResult = .failure(APIClientError.server(status: 500, message: "boom"))
        await viewModel.submit()

        viewModel.dismissError()

        #expect(viewModel.phase == .form)
        #expect(viewModel.errorMessage == nil)
        #expect(viewModel.state == "CA", "dismissing an error must not clear the user's answers")
    }

    // MARK: Reset

    @Test func startNewCalculationResetsEveryFieldAndResult() async {
        let (viewModel, service) = makeViewModel()
        viewModel.state = "CA"
        viewModel.isMale = true
        viewModel.basis = .marriedToCitizen
        viewModel.marriedToUSCitizen = true
        viewModel.spouseIsUSCitizen = true
        viewModel.addTrip()
        service.submitResult = .success(EligibilityFixtures.submitResponse())
        await viewModel.submit()
        #expect(viewModel.phase == .result)

        viewModel.startNewCalculation()

        #expect(viewModel.phase == .form)
        #expect(viewModel.result == nil)
        #expect(viewModel.state == "")
        #expect(viewModel.basis == .general)
        #expect(viewModel.trips.isEmpty)
        #expect(viewModel.isMale == nil)
    }
}
