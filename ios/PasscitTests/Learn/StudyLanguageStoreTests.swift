import Testing
import Foundation
@testable import Passcit

@Suite("StudyLanguageStore")
struct StudyLanguageStoreTests {

    @Test func defaultsToEnglishBeforeAnyUserIsAdopted() {
        let store = StudyLanguageStore(studyContentService: MockStudyContentService())
        #expect(store.selectedLanguage == .en)
    }

    @Test func adoptsTheUsersServerKnownLanguage() {
        let store = StudyLanguageStore(studyContentService: MockStudyContentService())
        let user = User(id: "u1", name: "Jane", email: "jane@example.com", image: nil, role: .user, studyLanguage: .ko)

        store.adopt(from: user)

        #expect(store.selectedLanguage == .ko)
    }

    @Test func adoptDoesNothingWhenTheUsersLanguageIsUnknown() {
        let store = StudyLanguageStore(studyContentService: MockStudyContentService())
        // studyLanguage nil — e.g. a User decoded from a native login/
        // register response, which doesn't include it.
        let user = User(id: "u1", name: "Jane", email: "jane@example.com", image: nil, role: .user, studyLanguage: nil)

        store.adopt(from: user)

        #expect(store.selectedLanguage == .en)
    }

    @Test func selectingALanguagePersistsItToTheServer() async throws {
        let mock = MockStudyContentService()
        let store = StudyLanguageStore(studyContentService: mock)

        await store.select(.ar)

        #expect(store.selectedLanguage == .ar)
        #expect(mock.setLanguageCallCount == 1)
        #expect(mock.lastSetLanguage == .ar)
        #expect(store.syncFailed == false)
    }

    @Test func aLaterServerAdoptNeverOverwritesAManualSelection() async throws {
        let mock = MockStudyContentService()
        let store = StudyLanguageStore(studyContentService: mock)
        await store.select(.fr)

        // A slow background /me fetch resolving after the manual pick must not clobber it.
        let staleUser = User(id: "u1", name: "Jane", email: "jane@example.com", image: nil, role: .user, studyLanguage: .zh)
        store.adopt(from: staleUser)

        #expect(store.selectedLanguage == .fr)
    }

    @Test func aFailedSyncKeepsTheSelectionAppliedAndFlagsSyncFailed() async throws {
        let mock = MockStudyContentService()
        mock.setLanguageResult = .failure(APIClientError.unknown)
        let store = StudyLanguageStore(studyContentService: mock)

        await store.select(.vi)

        #expect(store.selectedLanguage == .vi, "the choice stays applied even though syncing failed")
        #expect(store.syncFailed == true)
    }

    @Test func selectingTheAlreadyActiveLanguageIsANoOp() async throws {
        let mock = MockStudyContentService()
        let store = StudyLanguageStore(studyContentService: mock)

        await store.select(.en) // already the default

        #expect(mock.setLanguageCallCount == 0)
    }
}
