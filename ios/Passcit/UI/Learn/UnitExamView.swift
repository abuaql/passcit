import SwiftUI

struct UnitExamView: View {
    @State private var viewModel: UnitExamViewModel
    var onFinished: () -> Void

    init(apiClient: APIClient, unitId: String, unitTitle: String, onFinished: @escaping () -> Void) {
        _viewModel = State(initialValue: UnitExamViewModel(unitId: unitId, unitTitle: unitTitle, learnService: LearnService(apiClient: apiClient)))
        self.onFinished = onFinished
    }

    var body: some View {
        content
            .navigationTitle("\(viewModel.unitTitle) Exam")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                if viewModel.phase == .notStarted {
                    await viewModel.loadIntroIfNeeded()
                }
            }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.phase {
        case .notStarted:
            introScreen
        case .inProgress, .submitting:
            examScreen
        case .finished:
            resultScreen
        }
    }

    @ViewBuilder
    private var introScreen: some View {
        if let errorMessage = viewModel.errorMessage {
            // Retry whichever call actually failed: the intro fetch
            // (unitDetail still nil) or starting the exam (unitDetail
            // already loaded — loadIntroIfNeeded() would no-op here and
            // leave the user stuck on this screen forever).
            ErrorStateView(message: errorMessage) {
                Task {
                    if viewModel.unitDetail == nil {
                        await viewModel.loadIntroIfNeeded()
                    } else {
                        await viewModel.start()
                    }
                }
            }
        } else if let exam = viewModel.unitDetail?.exam {
            VStack(spacing: 20) {
                Image(systemName: "doc.text.magnifyingglass")
                    .font(.system(size: 48))
                    .foregroundStyle(.tint)
                Text("\(viewModel.unitTitle) Exam")
                    .font(.title2.bold())
                Text("\(exam.questionCount) questions — answer at least \(exam.passThreshold) correctly to pass.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                Button {
                    Task { await viewModel.start() }
                } label: {
                    if viewModel.isStarting {
                        ProgressView()
                    } else {
                        Text("Start Exam")
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(viewModel.isStarting)
            }
            .padding(32)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            LoadingView()
        }
    }

    private var examScreen: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                if let question = viewModel.currentQuestion {
                    LearnQuestionView(
                        questionText: question.question,
                        progressText: viewModel.progressText,
                        options: question.options.map(\.text),
                        selectedOption: viewModel.selectedOptions[question.id],
                        correctOptions: nil,
                        onSelect: { viewModel.select(option: $0, for: question.id) }
                    )
                }

                if let errorMessage = viewModel.errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundStyle(.red)
                }

                HStack {
                    if viewModel.currentIndex > 0 {
                        Button("Back") { viewModel.goToPreviousQuestion() }
                            .buttonStyle(.bordered)
                    }
                    Spacer()
                    if viewModel.isLastQuestion {
                        Button {
                            Task { await viewModel.submit() }
                        } label: {
                            if viewModel.phase == .submitting {
                                ProgressView()
                            } else {
                                Text("Submit Exam")
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(!viewModel.allQuestionsAnswered || viewModel.phase == .submitting)
                    } else {
                        Button("Next") { viewModel.goToNextQuestion() }
                            .buttonStyle(.borderedProminent)
                    }
                }
            }
            .padding()
        }
    }

    @ViewBuilder
    private var resultScreen: some View {
        if let result = viewModel.result {
            let passed = result.result == .passed
            VStack(spacing: 20) {
                Image(systemName: passed ? "checkmark.seal.fill" : "xmark.seal.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(passed ? .green : .red)
                Text(passed ? "You passed!" : "Not quite")
                    .font(.title.bold())
                Text("\(result.score ?? 0) out of \(result.totalQuestions) correct — \(result.passThreshold) needed to pass.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                if !passed {
                    Text("Review the lessons in this unit, then try again.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                Button("Done", action: onFinished)
                    .buttonStyle(.borderedProminent)
            }
            .padding(32)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .accessibilityElement(children: .combine)
        }
    }
}
