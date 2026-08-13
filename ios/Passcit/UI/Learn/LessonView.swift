import SwiftUI

struct LessonView: View {
    @State private var viewModel: LessonViewModel
    var onCompleted: () -> Void

    init(apiClient: APIClient, lessonId: String, onCompleted: @escaping () -> Void) {
        _viewModel = State(initialValue: LessonViewModel(lessonId: lessonId, learnService: LearnService(apiClient: apiClient)))
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

                if let explanation = question.explanation, viewModel.selectedOptions[question.id] != nil || question.variesByLocation {
                    Text(explanation)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
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

    @ViewBuilder
    private var navigationButtons: some View {
        HStack {
            if viewModel.currentIndex > 0 {
                Button("Back") { viewModel.goToPreviousQuestion() }
                    .buttonStyle(.bordered)
            }
            Spacer()
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
                        Text("Complete Lesson")
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(viewModel.isCompleting)
            } else {
                Button("Next") { viewModel.goToNextQuestion() }
                    .buttonStyle(.borderedProminent)
            }
        }
    }
}
