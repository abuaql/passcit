import Testing
import Foundation
@testable import Passcit

@Suite("FlashcardDeckViewModel")
struct FlashcardDeckViewModelTests {

    @Test func loadDeckPopulatesCardsAndSetsLoadedPhase() async throws {
        let mock = MockQuestionsService()
        mock.listResult = .success([QuestionFixtures.summary(id: "q1"), QuestionFixtures.summary(id: "q2")])
        mock.detailResult = .success(QuestionFixtures.detail(id: "q1"))
        let viewModel = FlashcardDeckViewModel(questionsService: mock)

        await viewModel.loadDeck()

        #expect(viewModel.phase == .loaded)
        #expect(viewModel.visibleCards.count == 2)
        #expect(viewModel.currentCard?.id == "q1")
        #expect(viewModel.progressText == "Card 1 of 2")
    }

    @Test func loadDeckWithNoResultsSetsEmptyPhase() async throws {
        let mock = MockQuestionsService()
        mock.listResult = .success([])
        let viewModel = FlashcardDeckViewModel(questionsService: mock)

        await viewModel.loadDeck()

        #expect(viewModel.phase == .empty)
    }

    @Test func loadDeckFailureSurfacesAnErrorMessage() async throws {
        let mock = MockQuestionsService()
        mock.listResult = .failure(APIClientError.sessionExpired)
        let viewModel = FlashcardDeckViewModel(questionsService: mock)

        await viewModel.loadDeck()

        #expect(viewModel.phase == .error("Your session expired. Please sign in again."))
    }

    @Test func loadDeckPassesTheSelectedCategoryToTheService() async throws {
        let mock = MockQuestionsService()
        mock.listResult = .success([QuestionFixtures.summary(id: "q1")])
        let viewModel = FlashcardDeckViewModel(questionsService: mock)
        viewModel.categoryFilter = .americanHistory

        await viewModel.loadDeck()

        #expect(mock.lastListCategory == .americanHistory)
    }

    @Test func nextAndPreviousNavigateAndClampAtTheBounds() async throws {
        let mock = MockQuestionsService()
        mock.listResult = .success([
            QuestionFixtures.summary(id: "q1"), QuestionFixtures.summary(id: "q2"), QuestionFixtures.summary(id: "q3"),
        ])
        let viewModel = FlashcardDeckViewModel(questionsService: mock)
        await viewModel.loadDeck()

        #expect(viewModel.canGoPrevious == false)
        await viewModel.next()
        #expect(viewModel.currentCard?.id == "q2")
        await viewModel.next()
        #expect(viewModel.currentCard?.id == "q3")
        #expect(viewModel.canGoNext == false)
        await viewModel.next() // already last — no-op
        #expect(viewModel.currentCard?.id == "q3")
        await viewModel.previous()
        #expect(viewModel.currentCard?.id == "q2")
    }

    @Test func flippingTogglesAndNavigatingResetsIt() async throws {
        let mock = MockQuestionsService()
        mock.listResult = .success([QuestionFixtures.summary(id: "q1"), QuestionFixtures.summary(id: "q2")])
        let viewModel = FlashcardDeckViewModel(questionsService: mock)
        await viewModel.loadDeck()

        #expect(viewModel.isFlipped == false)
        viewModel.flip()
        #expect(viewModel.isFlipped == true)
        await viewModel.next()
        #expect(viewModel.isFlipped == false, "moving to a new card must always show its question side first")
    }

    @Test func favoritesFilterShowsOnlyFavoritedCards() async throws {
        let mock = MockQuestionsService()
        mock.listResult = .success([
            QuestionFixtures.summary(id: "q1", isFavorite: true),
            QuestionFixtures.summary(id: "q2", isFavorite: false),
        ])
        let viewModel = FlashcardDeckViewModel(questionsService: mock)
        await viewModel.loadDeck()

        await viewModel.setStatusFilter(.favorites)

        #expect(viewModel.visibleCards.map(\.id) == ["q1"])
        #expect(viewModel.currentCard?.id == "q1")
    }

    @Test func needsPracticeFilterShowsOnlyThoseMarked() async throws {
        let mock = MockQuestionsService()
        mock.listResult = .success([
            QuestionFixtures.summary(id: "q1", status: "NEEDS_PRACTICE"),
            QuestionFixtures.summary(id: "q2", status: "KNOWN"),
        ])
        let viewModel = FlashcardDeckViewModel(questionsService: mock)
        await viewModel.loadDeck()

        await viewModel.setStatusFilter(.needsPractice)

        #expect(viewModel.visibleCards.map(\.id) == ["q1"])
    }

    @Test func settingTheSameFilterTwiceDoesNotResetTheCurrentCard() async throws {
        let mock = MockQuestionsService()
        mock.listResult = .success([QuestionFixtures.summary(id: "q1"), QuestionFixtures.summary(id: "q2")])
        let viewModel = FlashcardDeckViewModel(questionsService: mock)
        await viewModel.loadDeck()
        await viewModel.next()

        await viewModel.setStatusFilter(.all) // already .all — should be a no-op

        #expect(viewModel.currentCard?.id == "q2")
    }

    @Test func toggleFavoriteIsOptimisticThenConfirmedByTheServer() async throws {
        let mock = MockQuestionsService()
        mock.listResult = .success([QuestionFixtures.summary(id: "q1", isFavorite: false)])
        mock.toggleFavoriteResult = .success(true)
        let viewModel = FlashcardDeckViewModel(questionsService: mock)
        await viewModel.loadDeck()

        await viewModel.toggleFavorite()

        #expect(mock.toggleFavoriteCallCount == 1)
        #expect(mock.lastToggleFavoriteId == "q1")
        #expect(viewModel.isFavorite(viewModel.currentCard!) == true)
    }

    @Test func toggleFavoriteRevertsOnFailure() async throws {
        let mock = MockQuestionsService()
        mock.listResult = .success([QuestionFixtures.summary(id: "q1", isFavorite: false)])
        mock.toggleFavoriteResult = .failure(APIClientError.unknown)
        let viewModel = FlashcardDeckViewModel(questionsService: mock)
        await viewModel.loadDeck()

        await viewModel.toggleFavorite()

        #expect(viewModel.isFavorite(viewModel.currentCard!) == false, "a failed toggle must revert to the prior state")
    }

    @Test func markStatusSavesThenAdvancesToTheNextCard() async throws {
        let mock = MockQuestionsService()
        mock.listResult = .success([QuestionFixtures.summary(id: "q1"), QuestionFixtures.summary(id: "q2")])
        let viewModel = FlashcardDeckViewModel(questionsService: mock)
        await viewModel.loadDeck()

        await viewModel.markStatus(.known)

        #expect(mock.lastSetStatus == .known)
        #expect(mock.lastSetStatusQuestionId == "q1")
        #expect(viewModel.currentCard?.id == "q2", "marking a card must advance to the next one")
    }

    @Test func detailIsFetchedOnceThenCachedAcrossRevisits() async throws {
        let mock = MockQuestionsService()
        mock.listResult = .success([QuestionFixtures.summary(id: "q1"), QuestionFixtures.summary(id: "q2")])
        mock.detailResult = .success(QuestionFixtures.detail(id: "q1", answers: ["the Constitution"]))
        let viewModel = FlashcardDeckViewModel(questionsService: mock)
        await viewModel.loadDeck() // fetches detail for q1

        #expect(mock.getQuestionCallCount == 1)
        #expect(viewModel.detail?.id == "q1")

        await viewModel.next() // fetches detail for q2
        #expect(mock.getQuestionCallCount == 2)

        await viewModel.previous() // back to q1 — must come from cache, not a second fetch

        #expect(mock.getQuestionCallCount == 2, "revisiting q1 must not re-fetch it")
        #expect(viewModel.detail?.id == "q1")
    }

    @Test func jumpToRandomCardAlwaysLandsOnADifferentCardWhenMoreThanOneExists() async throws {
        let mock = MockQuestionsService()
        mock.listResult = .success((1...5).map { QuestionFixtures.summary(id: "q\($0)") })
        let viewModel = FlashcardDeckViewModel(questionsService: mock)
        await viewModel.loadDeck()
        let before = viewModel.currentCard?.id

        await viewModel.jumpToRandomCard()

        #expect(viewModel.currentCard?.id != before)
    }

    @Test func jumpToRandomCardIsANoOpWithOnlyOneCard() async throws {
        let mock = MockQuestionsService()
        mock.listResult = .success([QuestionFixtures.summary(id: "q1")])
        let viewModel = FlashcardDeckViewModel(questionsService: mock)
        await viewModel.loadDeck()

        await viewModel.jumpToRandomCard()

        #expect(viewModel.currentCard?.id == "q1")
        #expect(viewModel.canShuffle == false)
    }
}
