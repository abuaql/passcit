import Foundation
import Observation

/// Drives one question's Study Panel (Explanation / Translation / Memory
/// Tip / Listen) — owned per-question via `.id(question.id)` in LessonView
/// so switching questions always starts from a clean panel, exactly like
/// InterviewAnswerInputView's per-sentence `.id(...)` reset.
@Observable
final class StudyPanelViewModel {
    enum SectionStatus: Equatable {
        case idle
        case loading
        case ready
        case error(String)
    }

    let questionId: String

    private(set) var expandedSection: StudyContentKind?
    private(set) var explanationStatus: SectionStatus = .idle
    private(set) var translationStatus: SectionStatus = .idle
    private(set) var memoryTipStatus: SectionStatus = .idle
    private(set) var explanationText: String?
    private(set) var translatedQuestion: String?
    private(set) var translatedAnswer: String?
    private(set) var memoryTipText: String?
    private(set) var devMode = false
    private(set) var isSpeaking = false

    private let service: StudyContentServicing
    private let speechSynthesizer: StudySpeechSynthesizing
    // Keyed "<language>:<kind>" — matches the old web app's cache key
    // exactly, so switching the study language never serves stale
    // content from a different language, and switching back doesn't
    // re-fetch what's already been seen this session.
    private var cache: [String: StudyContentResponse] = [:]

    init(questionId: String, service: StudyContentServicing, speechSynthesizer: StudySpeechSynthesizing = SpeechSynthesizer()) {
        self.questionId = questionId
        self.service = service
        self.speechSynthesizer = speechSynthesizer
    }

    func status(for section: StudyContentKind) -> SectionStatus {
        switch section {
        case .explanation: return explanationStatus
        case .translation: return translationStatus
        case .memoryTip: return memoryTipStatus
        }
    }

    /// Opens a section (fetching if needed) or closes it if already open —
    /// only one section is ever expanded at a time, matching the old
    /// web app's StudyPanel exactly.
    func toggle(_ section: StudyContentKind, language: StudyLanguage) async {
        if expandedSection == section {
            expandedSection = nil
            return
        }
        expandedSection = section
        await service.recordStudyAction(questionId: questionId, action: section.actionKind, language: language)
        await load(section, language: language)
    }

    func retry(language: StudyLanguage) async {
        guard let section = expandedSection else { return }
        await load(section, language: language)
    }

    /// Reads whichever section is currently open, in the study language;
    /// reads the official English question/answer if none is open —
    /// exactly the old web app's Listen behavior. A second tap while
    /// speaking stops playback instead of starting a new one.
    func toggleListen(officialQuestion: String, officialAnswer: String, language: StudyLanguage) async {
        if isSpeaking {
            speechSynthesizer.stopSpeaking()
            isSpeaking = false
            return
        }

        await service.recordStudyAction(questionId: questionId, action: .listen, language: language)

        let text: String
        let languageCode: String
        switch expandedSection {
        case .translation:
            text = [translatedQuestion, translatedAnswer].compactMap { $0 }.joined(separator: ". ")
            languageCode = language.speechTag
        case .explanation:
            text = explanationText ?? ""
            languageCode = language.speechTag
        case .memoryTip:
            text = memoryTipText ?? ""
            languageCode = language.speechTag
        case nil:
            text = "\(officialQuestion). \(officialAnswer)"
            languageCode = "en-US"
        }
        guard !text.isEmpty else { return }

        isSpeaking = true
        await speechSynthesizer.speak(text, languageCode: languageCode)
        isSpeaking = false
    }

    private func load(_ section: StudyContentKind, language: StudyLanguage) async {
        let cacheKey = "\(language.rawValue):\(section.rawValue)"
        if let cached = cache[cacheKey] {
            apply(cached, section: section)
            return
        }
        setStatus(.loading, for: section)
        do {
            let response = try await service.fetchStudyContent(questionId: questionId, kind: section, language: language)
            cache[cacheKey] = response
            apply(response, section: section)
        } catch let error as APIClientError {
            setStatus(.error(error.userMessage), for: section)
        } catch {
            setStatus(.error("Something went wrong. Please try again."), for: section)
        }
    }

    private func apply(_ response: StudyContentResponse, section: StudyContentKind) {
        devMode = response.devMode ?? false
        switch section {
        case .explanation: explanationText = response.explanation
        case .memoryTip: memoryTipText = response.memoryTip
        case .translation:
            translatedQuestion = response.translation?.question
            translatedAnswer = response.translation?.answer
        }
        setStatus(.ready, for: section)
    }

    private func setStatus(_ status: SectionStatus, for section: StudyContentKind) {
        switch section {
        case .explanation: explanationStatus = status
        case .translation: translationStatus = status
        case .memoryTip: memoryTipStatus = status
        }
    }
}

private extension StudyContentKind {
    var actionKind: StudyActionKind {
        switch self {
        case .explanation: return .explanation
        case .translation: return .translation
        case .memoryTip: return .memoryTip
        }
    }
}
