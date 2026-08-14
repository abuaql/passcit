import Testing
import Foundation
@testable import Passcit

@Suite("StudyPanelViewModel")
struct StudyPanelViewModelTests {

    @Test func togglingASectionOpensItAndFetchesContent() async throws {
        let mock = MockStudyContentService()
        mock.fetchResult = .success(StudyContentResponse(type: .explanation, cached: false, devMode: false, explanation: "Because it's the highest law.", memoryTip: nil, translation: nil))
        let viewModel = StudyPanelViewModel(questionId: "q1", service: mock, speechSynthesizer: MockStudySpeechSynthesizer())

        await viewModel.toggle(.explanation, language: .en)

        #expect(viewModel.expandedSection == .explanation)
        #expect(viewModel.status(for: .explanation) == .ready)
        #expect(viewModel.explanationText == "Because it's the highest law.")
        #expect(mock.fetchCallCount == 1)
        #expect(mock.lastFetchKind == .explanation)
        #expect(mock.lastFetchLanguage == .en)
    }

    @Test func togglingTheSameSectionAgainClosesItWithoutRefetching() async throws {
        let mock = MockStudyContentService()
        mock.fetchResult = .success(StudyContentResponse(type: .explanation, cached: false, devMode: false, explanation: "Text", memoryTip: nil, translation: nil))
        let viewModel = StudyPanelViewModel(questionId: "q1", service: mock, speechSynthesizer: MockStudySpeechSynthesizer())
        await viewModel.toggle(.explanation, language: .en)

        await viewModel.toggle(.explanation, language: .en)

        #expect(viewModel.expandedSection == nil)
        #expect(mock.fetchCallCount == 1, "closing must not trigger another fetch")
    }

    @Test func onlyOneSectionIsExpandedAtATime() async throws {
        let mock = MockStudyContentService()
        mock.fetchResult = .success(StudyContentResponse(type: .explanation, cached: false, devMode: false, explanation: "E", memoryTip: "M", translation: nil))
        let viewModel = StudyPanelViewModel(questionId: "q1", service: mock, speechSynthesizer: MockStudySpeechSynthesizer())
        await viewModel.toggle(.explanation, language: .en)

        await viewModel.toggle(.memoryTip, language: .en)

        #expect(viewModel.expandedSection == .memoryTip)
    }

    @Test func revisitingAnAlreadyLoadedSectionInTheSameLanguageServesFromCache() async throws {
        let mock = MockStudyContentService()
        mock.fetchResult = .success(StudyContentResponse(type: .memoryTip, cached: false, devMode: false, explanation: nil, memoryTip: "Tip", translation: nil))
        let viewModel = StudyPanelViewModel(questionId: "q1", service: mock, speechSynthesizer: MockStudySpeechSynthesizer())
        await viewModel.toggle(.memoryTip, language: .en)
        await viewModel.toggle(.memoryTip, language: .en) // close
        await viewModel.toggle(.memoryTip, language: .en) // reopen

        #expect(mock.fetchCallCount == 1, "reopening the same section+language must be served from cache")
        #expect(viewModel.memoryTipText == "Tip")
    }

    @Test func switchingLanguageRefetchesRatherThanReusingTheOtherLanguagesCache() async throws {
        let mock = MockStudyContentService()
        mock.fetchResult = .success(StudyContentResponse(type: .explanation, cached: false, devMode: false, explanation: "English text", memoryTip: nil, translation: nil))
        let viewModel = StudyPanelViewModel(questionId: "q1", service: mock, speechSynthesizer: MockStudySpeechSynthesizer())
        await viewModel.toggle(.explanation, language: .en)
        await viewModel.toggle(.explanation, language: .en) // close

        mock.fetchResult = .success(StudyContentResponse(type: .explanation, cached: false, devMode: false, explanation: "Texto en español", memoryTip: nil, translation: nil))
        await viewModel.toggle(.explanation, language: .es)

        #expect(mock.fetchCallCount == 2)
        #expect(viewModel.explanationText == "Texto en español")
    }

    @Test func recordsAStudyEventEveryTimeASectionIsOpened() async throws {
        let mock = MockStudyContentService()
        mock.fetchResult = .success(StudyContentResponse(type: .translation, cached: false, devMode: false, explanation: nil, memoryTip: nil, translation: TranslationContent(question: "¿Q?", answer: "A")))
        let viewModel = StudyPanelViewModel(questionId: "q1", service: mock, speechSynthesizer: MockStudySpeechSynthesizer())

        await viewModel.toggle(.translation, language: .es)

        #expect(mock.recordedActions.count == 1)
        #expect(mock.recordedActions.first?.action == .translation)
        #expect(mock.recordedActions.first?.language == .es)
        #expect(mock.recordedActions.first?.questionId == "q1")
    }

    @Test func fetchFailureSurfacesAnErrorStatusWithARetryPath() async throws {
        let mock = MockStudyContentService()
        mock.fetchResult = .failure(APIClientError.server(status: 503, message: "AI content is unavailable right now."))
        let viewModel = StudyPanelViewModel(questionId: "q1", service: mock, speechSynthesizer: MockStudySpeechSynthesizer())

        await viewModel.toggle(.explanation, language: .en)

        #expect(viewModel.status(for: .explanation) == .error("AI content is unavailable right now."))

        mock.fetchResult = .success(StudyContentResponse(type: .explanation, cached: false, devMode: false, explanation: "Recovered", memoryTip: nil, translation: nil))
        await viewModel.retry(language: .en)

        #expect(viewModel.status(for: .explanation) == .ready)
        #expect(viewModel.explanationText == "Recovered")
    }

    @Test func devModeFlagIsPickedUpFromTheResponse() async throws {
        let mock = MockStudyContentService()
        mock.fetchResult = .success(StudyContentResponse(type: .explanation, cached: false, devMode: true, explanation: "Placeholder", memoryTip: nil, translation: nil))
        let viewModel = StudyPanelViewModel(questionId: "q1", service: mock, speechSynthesizer: MockStudySpeechSynthesizer())

        await viewModel.toggle(.explanation, language: .en)

        #expect(viewModel.devMode == true)
    }

    // MARK: Listen

    @Test func listenWithNoSectionOpenReadsTheOfficialEnglishTextRegardlessOfLanguage() async throws {
        let synth = MockStudySpeechSynthesizer()
        let viewModel = StudyPanelViewModel(questionId: "q1", service: MockStudyContentService(), speechSynthesizer: synth)

        await viewModel.toggleListen(officialQuestion: "What is the supreme law?", officialAnswer: "The Constitution", language: .ar)

        #expect(synth.spokenText == ["What is the supreme law?. The Constitution"])
        #expect(synth.spokenLanguageCodes == ["en-US"], "official content is always read in English regardless of study language")
    }

    @Test func listenWithATranslationOpenReadsTheTranslatedTextInTheStudyLanguagesVoice() async throws {
        let mock = MockStudyContentService()
        mock.fetchResult = .success(StudyContentResponse(type: .translation, cached: false, devMode: false, explanation: nil, memoryTip: nil, translation: TranslationContent(question: "¿Cuál es la ley suprema?", answer: "La Constitución")))
        let synth = MockStudySpeechSynthesizer()
        let viewModel = StudyPanelViewModel(questionId: "q1", service: mock, speechSynthesizer: synth)
        await viewModel.toggle(.translation, language: .es)

        await viewModel.toggleListen(officialQuestion: "What is the supreme law?", officialAnswer: "The Constitution", language: .es)

        #expect(synth.spokenText == ["¿Cuál es la ley suprema?. La Constitución"])
        #expect(synth.spokenLanguageCodes == ["es-ES"])
    }

    @Test func listenRecordsAListenStudyEvent() async throws {
        let mock = MockStudyContentService()
        let viewModel = StudyPanelViewModel(questionId: "q1", service: mock, speechSynthesizer: MockStudySpeechSynthesizer())

        await viewModel.toggleListen(officialQuestion: "Q", officialAnswer: "A", language: .ko)

        #expect(mock.recordedActions.first?.action == .listen)
        #expect(mock.recordedActions.first?.language == .ko)
    }

    @Test func isSpeakingResetsOnceSpeakReturns() async throws {
        let synth = MockStudySpeechSynthesizer()
        let viewModel = StudyPanelViewModel(questionId: "q1", service: MockStudyContentService(), speechSynthesizer: synth)

        #expect(viewModel.isSpeaking == false)
        await viewModel.toggleListen(officialQuestion: "Q", officialAnswer: "A", language: .en)
        #expect(viewModel.isSpeaking == false, "resets once speak() returns")
        #expect(synth.spokenText.count == 1)
    }
}
