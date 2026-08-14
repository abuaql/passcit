import Foundation
import Observation

@Observable
final class FlashcardDeckViewModel {
    enum Phase: Equatable {
        case loading
        case loaded
        case empty
        case error(String)
    }

    enum StatusFilter: String, CaseIterable, Identifiable {
        case all = "All"
        case favorites = "Favorites"
        case needsPractice = "Needs Practice"
        var id: String { rawValue }
    }

    private(set) var phase: Phase = .loading
    private(set) var cards: [QuestionSummary] = []
    private(set) var currentIndex = 0
    private(set) var isFlipped = false
    private(set) var detail: QuestionDetail?
    // Optimistic favorite state, keyed by question id — overrides
    // whatever the last fetch said until the server confirms or the
    // request fails, matching the old web app's optimistic-then-confirmed
    // favorite toggle.
    private(set) var favoriteOverrides: [String: Bool] = [:]

    var categoryFilter: QuestionCategory?
    private(set) var statusFilter: StatusFilter = .all

    private let questionsService: QuestionsServicing
    // Detail is fetched lazily per-card (the list response only carries a
    // one-answer preview) and cached here so flipping back to an
    // already-seen card never re-fetches.
    private var detailCache: [String: QuestionDetail] = [:]

    init(questionsService: QuestionsServicing) {
        self.questionsService = questionsService
    }

    var visibleCards: [QuestionSummary] {
        cards.filter(matchesStatusFilter)
    }

    private func matchesStatusFilter(_ card: QuestionSummary) -> Bool {
        switch statusFilter {
        case .all: return true
        case .favorites: return isFavorite(card)
        case .needsPractice: return card.progress.first?.status == StudyStatus.needsPractice.rawValue
        }
    }

    var currentCard: QuestionSummary? {
        let visible = visibleCards
        return visible.indices.contains(currentIndex) ? visible[currentIndex] : nil
    }

    var progressText: String {
        let count = visibleCards.count
        guard count > 0 else { return "" }
        return "Card \(currentIndex + 1) of \(count)"
    }

    var canGoNext: Bool { currentIndex < visibleCards.count - 1 }
    var canGoPrevious: Bool { currentIndex > 0 }
    var canShuffle: Bool { visibleCards.count > 1 }

    func isFavorite(_ card: QuestionSummary) -> Bool {
        favoriteOverrides[card.id] ?? card.isFavorite
    }

    func loadDeck() async {
        phase = .loading
        currentIndex = 0
        isFlipped = false
        detail = nil
        do {
            cards = try await questionsService.listQuestions(category: categoryFilter, favoritesOnly: false)
            phase = visibleCards.isEmpty ? .empty : .loaded
            await loadDetailForCurrentCard()
        } catch let error as APIClientError {
            phase = .error(error.userMessage)
        } catch {
            phase = .error("Something went wrong. Please try again.")
        }
    }

    // Async rather than fire-and-forget: the index change and its detail
    // fetch complete together from the caller's point of view, so tests
    // (and the view's own state) never have to race a detached Task.
    func setStatusFilter(_ filter: StatusFilter) async {
        guard filter != statusFilter else { return }
        statusFilter = filter
        currentIndex = 0
        isFlipped = false
        detail = nil
        phase = visibleCards.isEmpty ? .empty : .loaded
        await loadDetailForCurrentCard()
    }

    func flip() {
        guard currentCard != nil else { return }
        isFlipped.toggle()
    }

    func next() async {
        guard canGoNext else { return }
        currentIndex += 1
        isFlipped = false
        await loadDetailForCurrentCard()
    }

    func previous() async {
        guard canGoPrevious else { return }
        currentIndex -= 1
        isFlipped = false
        await loadDetailForCurrentCard()
    }

    func jumpToRandomCard() async {
        let visible = visibleCards
        guard visible.count > 1 else { return }
        var newIndex = currentIndex
        while newIndex == currentIndex {
            newIndex = Int.random(in: 0..<visible.count)
        }
        currentIndex = newIndex
        isFlipped = false
        await loadDetailForCurrentCard()
    }

    func toggleFavorite() async {
        guard let card = currentCard else { return }
        let optimistic = !isFavorite(card)
        favoriteOverrides[card.id] = optimistic
        do {
            favoriteOverrides[card.id] = try await questionsService.toggleFavorite(questionId: card.id)
        } catch {
            favoriteOverrides[card.id] = !optimistic
        }
    }

    /// Marks Known/Needs Practice for the current card, then auto-advances
    /// — matches the old web app's flashcard behavior exactly. A failure
    /// to save is silent (best-effort, like the old app's status picker);
    /// the deck still advances so a network hiccup never blocks studying.
    func markStatus(_ status: StudyStatus) async {
        guard let card = currentCard else { return }
        try? await questionsService.setStudyStatus(questionId: card.id, status: status)
        await next()
    }

    private func loadDetailForCurrentCard() async {
        guard let card = currentCard else { return }
        if let cached = detailCache[card.id] {
            detail = cached
            return
        }
        do {
            let fetched = try await questionsService.getQuestion(id: card.id)
            detailCache[card.id] = fetched
            // Guard against a slow response landing after the learner has
            // already moved to a different card.
            if currentCard?.id == card.id {
                detail = fetched
            }
        } catch {
            detail = nil
        }
    }
}
