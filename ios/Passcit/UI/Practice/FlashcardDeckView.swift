import SwiftUI

/// Self-paced, un-scored review — flip through the question bank, mark
/// Known/Needs Practice, favorite as you go. Reached from Practice's mode
/// selector (see PracticeView.flashcardsEntryPoint), not a bottom tab.
struct FlashcardDeckView: View {
    @State private var viewModel: FlashcardDeckViewModel

    init(apiClient: APIClient) {
        _viewModel = State(initialValue: FlashcardDeckViewModel(questionsService: QuestionsService(apiClient: apiClient)))
    }

    var body: some View {
        VStack(spacing: 0) {
            filterBar
            content
        }
        .navigationTitle("Flashcards")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.loadDeck() }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.phase {
        case .loading:
            LoadingView()
        case .error(let message):
            ErrorStateView(message: message) { Task { await viewModel.loadDeck() } }
        case .empty:
            EmptyStateView(
                icon: "rectangle.on.rectangle.slash",
                title: "No cards match these filters",
                subtitle: "Try a different category, or turn off Favorites/Needs Practice."
            )
        case .loaded:
            deck
        }
    }

    private var deck: some View {
        ScrollView {
            VStack(spacing: 20) {
                Text(viewModel.progressText)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                if let card = viewModel.currentCard {
                    flashcard(for: card)
                        .id(card.id)
                }

                navigationControls
                statusButtons
            }
            .padding()
        }
    }

    private var filterBar: some View {
        VStack(spacing: 10) {
            Picker("Category", selection: categoryBinding) {
                Text("All Categories").tag(QuestionCategory?.none)
                ForEach(QuestionCategory.allCases, id: \.self) { category in
                    Text(category.displayName).tag(QuestionCategory?.some(category))
                }
            }
            .pickerStyle(.menu)
            .frame(maxWidth: .infinity, alignment: .leading)

            Picker("Filter", selection: statusFilterBinding) {
                ForEach(FlashcardDeckViewModel.StatusFilter.allCases) { filter in
                    Text(filter.rawValue).tag(filter)
                }
            }
            .pickerStyle(.segmented)
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
        .background(Color(.systemBackground))
    }

    private var categoryBinding: Binding<QuestionCategory?> {
        Binding(
            get: { viewModel.categoryFilter },
            set: { newValue in
                viewModel.categoryFilter = newValue
                Task { await viewModel.loadDeck() }
            }
        )
    }

    private var statusFilterBinding: Binding<FlashcardDeckViewModel.StatusFilter> {
        Binding(
            get: { viewModel.statusFilter },
            set: { newValue in Task { await viewModel.setStatusFilter(newValue) } }
        )
    }

    // Standard SwiftUI flip trick: the back face is pre-rotated 180° so
    // that once the whole ZStack rotates 180°, the back reads right-way-
    // round instead of mirrored.
    @ViewBuilder
    private func flashcard(for card: QuestionSummary) -> some View {
        ZStack {
            cardFace(card: card, front: true)
                .opacity(viewModel.isFlipped ? 0 : 1)
            cardFace(card: card, front: false)
                .rotation3DEffect(.degrees(180), axis: (x: 0, y: 1, z: 0))
                .opacity(viewModel.isFlipped ? 1 : 0)
        }
        .rotation3DEffect(.degrees(viewModel.isFlipped ? 180 : 0), axis: (x: 0, y: 1, z: 0))
        .animation(.easeInOut(duration: 0.35), value: viewModel.isFlipped)
        .frame(minHeight: 260)
        .frame(maxWidth: .infinity)
        .padding(24)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(alignment: .topTrailing) { favoriteButton(card: card) }
        .contentShape(Rectangle())
        .onTapGesture { viewModel.flip() }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(viewModel.isFlipped ? "Answer side" : "Question side")
        .accessibilityHint("Double tap to flip")
        .accessibilityAddTraits(.isButton)
    }

    @ViewBuilder
    private func cardFace(card: QuestionSummary, front: Bool) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(front ? "Question" : "Answer")
                .font(.caption.bold())
                .foregroundStyle(.secondary)
                .textCase(.uppercase)

            if front {
                Text(card.question)
                    .font(.title3.bold())
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                answerContent(card: card)
            }

            Spacer(minLength: 0)

            Text(front ? "Tap to reveal the answer" : "Tap to see the question again")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private func answerContent(card: QuestionSummary) -> some View {
        if card.variesByLocation {
            Label("The answer depends on where you live.", systemImage: "mappin.and.ellipse")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        } else if let detail = viewModel.detail, detail.id == card.id {
            VStack(alignment: .leading, spacing: 8) {
                ForEach(detail.acceptedAnswers, id: \.self) { answer in
                    Text("•\u{00A0}\(answer)")
                        .font(.body)
                        .fixedSize(horizontal: false, vertical: true)
                }
                if card.isDynamicAnswer, let note = detail.dynamicNote {
                    Label(note, systemImage: "sparkles")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        } else if let preview = card.previewAnswer {
            Text(preview)
                .font(.body)
        } else {
            ProgressView()
        }
    }

    private func favoriteButton(card: QuestionSummary) -> some View {
        Button {
            Task { await viewModel.toggleFavorite() }
        } label: {
            Image(systemName: viewModel.isFavorite(card) ? "heart.fill" : "heart")
                .foregroundStyle(viewModel.isFavorite(card) ? .red : .secondary)
                .padding(10)
        }
        .accessibilityLabel(viewModel.isFavorite(card) ? "Remove from favorites" : "Add to favorites")
    }

    private var navigationControls: some View {
        HStack(spacing: 20) {
            Button { Task { await viewModel.previous() } } label: {
                Image(systemName: "chevron.left.circle.fill")
                    .font(.system(size: 32))
            }
            .disabled(!viewModel.canGoPrevious)

            Button { Task { await viewModel.jumpToRandomCard() } } label: {
                Label("Shuffle", systemImage: "shuffle")
            }
            .buttonStyle(.bordered)
            .disabled(!viewModel.canShuffle)

            Button { Task { await viewModel.next() } } label: {
                Image(systemName: "chevron.right.circle.fill")
                    .font(.system(size: 32))
            }
            .disabled(!viewModel.canGoNext)
        }
        .foregroundStyle(.tint)
    }

    private var statusButtons: some View {
        HStack(spacing: 12) {
            Button {
                Task { await viewModel.markStatus(.needsPractice) }
            } label: {
                Label("Needs Practice", systemImage: "arrow.counterclockwise")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .tint(.orange)

            Button {
                Task { await viewModel.markStatus(.known) }
            } label: {
                Label("Known", systemImage: "checkmark")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(.green)
        }
    }
}
