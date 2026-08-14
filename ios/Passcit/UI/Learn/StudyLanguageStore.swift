import Foundation
import Observation

/// The single source of truth for the learner's study-language selection
/// across the Learn tab — mirrors the old web app's StudyLanguageProvider
/// (a React Context wrapping the whole authenticated app) as one
/// `@Observable` store shared by LearnView, LessonView, and every
/// StudyPanelView they contain.
@Observable
final class StudyLanguageStore {
    private(set) var selectedLanguage: StudyLanguage = .en
    // True right after a PATCH to persist a language change has failed.
    // The selection stays applied locally regardless — silently reverting
    // a learner's choice would be worse than telling them syncing failed,
    // exactly the old web app's reasoning for the same tradeoff.
    private(set) var syncFailed = false

    private let studyContentService: StudyContentServicing
    private var hasBeenSetLocally = false

    init(studyContentService: StudyContentServicing) {
        self.studyContentService = studyContentService
    }

    /// Called whenever a fresh User (from AuthManager's cached or
    /// server-reconciled state) becomes available. A no-op once the
    /// learner has manually picked a language this session, so a
    /// slow-arriving background /me fetch can never clobber a choice
    /// they just made in the picker.
    func adopt(from user: User?) {
        guard !hasBeenSetLocally, let language = user?.studyLanguage else { return }
        selectedLanguage = language
    }

    func select(_ language: StudyLanguage) async {
        guard language != selectedLanguage else { return }
        selectedLanguage = language
        hasBeenSetLocally = true
        syncFailed = false
        do {
            try await studyContentService.setStudyLanguage(language)
        } catch {
            syncFailed = true
        }
    }
}
