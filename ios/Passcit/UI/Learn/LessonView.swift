import SwiftUI

struct LessonView: View {
    @State private var viewModel: LessonViewModel
    @State private var showLanguagePicker = false
    let apiClient: APIClient
    let studyLanguageStore: StudyLanguageStore
    var onCompleted: () -> Void

    init(apiClient: APIClient, lessonId: String, studyLanguageStore: StudyLanguageStore, onCompleted: @escaping () -> Void) {
        _viewModel = State(initialValue: LessonViewModel(lessonId: lessonId, learnService: LearnService(apiClient: apiClient)))
        self.apiClient = apiClient
        self.studyLanguageStore = studyLanguageStore
        self.onCompleted = onCompleted
    }

    var body: some View {
        content
            .navigationTitle(viewModel.lesson?.title ?? "Lesson")
            .navigationBarTitleDisplayMode(.inline)
            .task { await viewModel.loadIfNeeded() }
    }

    @ViewBuilder
    private var content: some View {
        if let lesson = viewModel.lesson {
            if let question = viewModel.currentQuestion {
                questionScreen(lesson: lesson, question: question)
            } else {
                EmptyStateView(
                    icon: "checkmark.circle",
                    title: "Nothing to review",
                    subtitle: "This lesson has no questions yet."
                )
            }
        } else if let errorMessage = viewModel.errorMessage {
            ErrorStateView(message: errorMessage) {
                Task { await viewModel.loadIfNeeded() }
            }
        } else {
            LoadingView()
        }
    }

    private func questionScreen(lesson: LessonDetail, question: LessonQuestionContent) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                if question.variesByLocation {
                    variesByLocationCard(question)
                } else if let options = viewModel.currentOptions {
                    LearnQuestionView(
                        questionText: question.question,
                        progressText: viewModel.progressText ?? "",
                        options: options,
                        selectedOption: viewModel.selectedOptions[question.id],
                        correctOptions: Set(question.answers),
                        onSelect: { viewModel.select(option: $0, for: question.id) }
                    )
                }

                if let dynamicNote = question.dynamicNote {
                    Label(dynamicNote, systemImage: "clock.arrow.circlepath")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                let hasRevealed = viewModel.selectedOptions[question.id] != nil || question.variesByLocation

                if let explanation = question.explanation, hasRevealed {
                    Text(explanation)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                // Only offered once the learner has engaged with the
                // question (answered it, or it's a variesByLocation
                // question with no single answer to guess) — never
                // spoils the answer up front.
                if hasRevealed {
                    StudyPanelView(
                        questionId: question.id,
                        officialQuestion: question.question,
                        officialAnswer: question.answers.first ?? "",
                        language: studyLanguageStore.selectedLanguage,
                        apiClient: apiClient
                    )
                    .id(question.id)
                }

                navigationButtons
            }
            .padding()
        }
        .safeAreaInset(edge: .bottom) {
            if let completionError = viewModel.completionError {
                Text(completionError)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .padding(.horizontal)
            }
        }
    }

    private func variesByLocationCard(_ question: LessonQuestionContent) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(viewModel.progressText ?? "")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Text(question.question)
                .font(.title3.bold())
            Label("This answer depends on where you live.", systemImage: "location.fill")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .combine)
    }

    // A single centered row, always exactly 3 buttons — Back is disabled
    // rather than removed on the first question, so the row's width (and
    // therefore its centering) never shifts as the learner moves through
    // the lesson. Every button shares one control size, one .lineLimit(1),
    // and one minimumScaleFactor, which is what actually guarantees equal
    // height and no clipping/wrapping on a narrow screen: SwiftUI sizes a
    // Button to its label, so if the label were ever allowed to wrap to a
    // second line, that one button would grow taller than its neighbors.
    private static let navButtonControlSize: ControlSize = .regular
    private static let navButtonMinScale: CGFloat = 0.8

    @ViewBuilder
    private var navigationButtons: some View {
        HStack(spacing: 8) {
            Spacer(minLength: 0)
            backButton
            languageButton
            primaryActionButton
            Spacer(minLength: 0)
        }
        .sheet(isPresented: $showLanguagePicker) {
            LanguagePickerView(store: studyLanguageStore)
        }
    }

    private var backButton: some View {
        Button {
            viewModel.goToPreviousQuestion()
        } label: {
            Label("Back", systemImage: "chevron.left")
                .lineLimit(1)
                .minimumScaleFactor(Self.navButtonMinScale)
        }
        .buttonStyle(.bordered)
        .controlSize(Self.navButtonControlSize)
        .disabled(viewModel.currentIndex == 0)
    }

    private var languageButton: some View {
        Button {
            showLanguagePicker = true
        } label: {
            Label(studyLanguageStore.selectedLanguage.nativeName, systemImage: "globe")
                .lineLimit(1)
                .minimumScaleFactor(Self.navButtonMinScale)
        }
        .buttonStyle(.bordered)
        .tint(.accentColor)
        .controlSize(Self.navButtonControlSize)
        .accessibilityLabel("Study language: \(studyLanguageStore.selectedLanguage.englishName)")
    }

    @ViewBuilder
    private var primaryActionButton: some View {
        if viewModel.isLastQuestion {
            Button {
                Task {
                    if await viewModel.completeLesson() {
                        onCompleted()
                    }
                }
            } label: {
                if viewModel.isCompleting {
                    ProgressView()
                } else {
                    Text("Complete")
                        .lineLimit(1)
                        .minimumScaleFactor(Self.navButtonMinScale)
                }
            }
            .buttonStyle(.borderedProminent)
            .controlSize(Self.navButtonControlSize)
            .disabled(viewModel.isCompleting)
        } else {
            Button {
                viewModel.goToNextQuestion()
            } label: {
                Label("Next", systemImage: "chevron.right")
                    .lineLimit(1)
                    .minimumScaleFactor(Self.navButtonMinScale)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(Self.navButtonControlSize)
        }
    }
}
