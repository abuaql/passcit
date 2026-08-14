import SwiftUI

struct PracticeView: View {
    @Environment(AuthManager.self) private var authManager
    @State private var viewModel: PracticeViewModel
    @State private var showExitConfirmation = false
    let apiClient: APIClient
    var onSignInTapped: () -> Void

    init(apiClient: APIClient, onSignInTapped: @escaping () -> Void) {
        _viewModel = State(initialValue: PracticeViewModel(practiceService: PracticeService(apiClient: apiClient)))
        self.apiClient = apiClient
        self.onSignInTapped = onSignInTapped
    }

    var body: some View {
        NavigationStack {
            content
                .navigationTitle(navigationTitle)
                .navigationBarTitleDisplayMode(viewModel.phase == .idle ? .automatic : .inline)
                .toolbar { exitToolbarItem }
                .confirmationDialog(
                    "Exit this practice session?",
                    isPresented: $showExitConfirmation,
                    titleVisibility: .visible
                ) {
                    Button("Exit Practice", role: .destructive) { viewModel.returnToModeSelection() }
                    Button("Keep Practicing", role: .cancel) {}
                } message: {
                    Text("Your answers on this test won't be saved.")
                }
        }
    }

    // Only shown while a session is actually running — every mode
    // (Random/Category/Missed/Mock Interview) shares this one view/view
    // model, so a single toolbar item covers all four per the product
    // requirement that leaving mid-session must always be possible.
    @ToolbarContentBuilder
    private var exitToolbarItem: some ToolbarContent {
        if viewModel.phase == .inProgress || viewModel.phase == .submitting {
            ToolbarItem(placement: .topBarLeading) {
                Button("Exit") { showExitConfirmation = true }
            }
        }
    }

    private var navigationTitle: String {
        guard viewModel.phase != .idle, let activeMode = viewModel.activeMode else { return "Practice" }
        return Self.title(for: activeMode)
    }

    @ViewBuilder
    private var content: some View {
        switch authManager.state {
        case .bootstrapping:
            LoadingView()
        case .signedOut:
            signedOutPrompt
        case .signedIn:
            practiceContent
        }
    }

    private var signedOutPrompt: some View {
        VStack(spacing: 16) {
            Image(systemName: "pencil.and.list.clipboard")
                .font(.system(size: 48))
                .foregroundStyle(.tint)
            Text("Sign in to practice")
                .font(.title3.bold())
            Text("Test yourself with real USCIS civics questions once you're signed in.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Sign In / Register", action: onSignInTapped)
                .buttonStyle(.borderedProminent)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private var practiceContent: some View {
        switch viewModel.phase {
        case .idle:
            startScreen
        case .inProgress, .submitting:
            if let question = viewModel.currentQuestion {
                PracticeQuestionView(
                    question: question,
                    progressText: viewModel.progressText,
                    selectedOption: viewModel.selectedOptions[question.id],
                    isLastQuestion: viewModel.isLastQuestion,
                    canGoBack: viewModel.currentIndex > 0,
                    isSubmitting: viewModel.phase == .submitting,
                    submissionErrorMessage: viewModel.errorMessage,
                    onSelect: { option in viewModel.select(option, for: question.id) },
                    onBack: { viewModel.goToPreviousQuestion() },
                    onNext: { viewModel.goToNextQuestion() },
                    onSubmit: { Task { await viewModel.submit() } }
                )
            } else {
                LoadingView()
            }
        case .finished:
            if let result = viewModel.result {
                PracticeResultView(result: result) {
                    viewModel.returnToModeSelection()
                }
            }
        }
    }

    @ViewBuilder
    private var startScreen: some View {
        if let errorMessage = viewModel.errorMessage {
            ErrorStateView(message: errorMessage) {
                Task { await viewModel.startNewTest() }
            }
        } else {
            modeSelectionScreen
        }
    }

    private var modeSelectionScreen: some View {
        ScrollView {
            VStack(spacing: 24) {
                Image(systemName: "pencil.and.list.clipboard")
                    .font(.system(size: 48))
                    .foregroundStyle(.tint)
                Text("Practice")
                    .font(.title2.bold())
                Text("Choose how you'd like to practice.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                VStack(spacing: 12) {
                    ForEach(PracticeMode.allCases, id: \.self) { mode in
                        modeCard(mode)
                    }
                }

                if viewModel.selectedMode == .category {
                    categoryPicker
                }

                Button {
                    Task { await viewModel.startNewTest() }
                } label: {
                    if viewModel.isStarting {
                        ProgressView()
                    } else {
                        Text("Start Practice Test")
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(viewModel.isStarting || !viewModel.canStart)

                flashcardsEntryPoint
            }
            .padding()
        }
    }

    // Flashcards is deliberately not a PracticeMode — it's un-scored,
    // self-paced review with its own flip-card UI, not a 10/20-question
    // test. Surfaced here as its own entry point rather than a 5th mode
    // card, so it isn't confused with the scored modes above it.
    private var flashcardsEntryPoint: some View {
        NavigationLink {
            FlashcardDeckView(apiClient: apiClient)
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "rectangle.on.rectangle")
                    .font(.title3)
                    .frame(width: 28)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Study with Flashcards")
                        .font(.subheadline.bold())
                    Text("Flip through questions at your own pace. Not scored.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.tertiarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(Color(.separator), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .foregroundStyle(.primary)
    }

    private func modeCard(_ mode: PracticeMode) -> some View {
        let isSelected = viewModel.selectedMode == mode
        return Button {
            viewModel.selectedMode = mode
        } label: {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: Self.icon(for: mode))
                    .font(.title3)
                    .frame(width: 28)
                VStack(alignment: .leading, spacing: 4) {
                    Text(Self.title(for: mode))
                        .font(.subheadline.bold())
                    Text(Self.subtitle(for: mode))
                        .font(.caption)
                        .foregroundStyle(isSelected ? .white.opacity(0.85) : .secondary)
                }
                Spacer(minLength: 0)
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(isSelected ? Color.accentColor : Color(.secondarySystemBackground))
            .foregroundStyle(isSelected ? .white : .primary)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    private var categoryPicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Category")
                .font(.subheadline.bold())
                .frame(maxWidth: .infinity, alignment: .leading)
            ForEach(QuestionCategory.allCases, id: \.self) { category in
                let isSelected = viewModel.selectedCategory == category
                Button {
                    viewModel.selectedCategory = category
                } label: {
                    HStack {
                        Text(category.displayName)
                        Spacer()
                        if isSelected {
                            Image(systemName: "checkmark")
                        }
                    }
                    .padding(.vertical, 10)
                    .padding(.horizontal, 12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(isSelected ? Color.accentColor.opacity(0.15) : Color(.tertiarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
                .foregroundStyle(.primary)
                .accessibilityAddTraits(isSelected ? [.isSelected] : [])
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: Mode display text — kept out of the model layer (matches
    // EligibilityResultView's warning/recommendation-code precedent):
    // the server only ever sees/sends raw mode strings, display copy is
    // a pure view concern.

    static func title(for mode: PracticeMode) -> String {
        switch mode {
        case .random10: return "Random Practice"
        case .category: return "Practice by Category"
        case .missedOnly: return "Review Missed Questions"
        case .mockInterview: return "Mock Civics Interview"
        }
    }

    private static func subtitle(for mode: PracticeMode) -> String {
        switch mode {
        case .random10: return "10 random questions from the current USCIS civics test."
        case .category: return "Focus on one topic area."
        case .missedOnly: return "Questions you've gotten wrong before."
        case .mockInterview: return "Multiple-choice civics questions at the real interview's length. Not the spoken Interview — see the Interview tab for that."
        }
    }

    private static func icon(for mode: PracticeMode) -> String {
        switch mode {
        case .random10: return "shuffle"
        case .category: return "square.grid.2x2"
        case .missedOnly: return "arrow.counterclockwise"
        case .mockInterview: return "checklist"
        }
    }
}
