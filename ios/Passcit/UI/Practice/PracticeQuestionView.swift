import SwiftUI

// Adapts a PracticeQuestion onto the existing, unmodified LearnQuestionView
// (Phase 11) — its correctness-reveal mode is exactly what Practice needs,
// since the server already sends isCorrect unmasked on every option.
struct PracticeQuestionView: View {
    let question: PracticeQuestion
    let progressText: String
    let selectedOption: PracticeQuestionOption?
    let isLastQuestion: Bool
    let canGoBack: Bool
    let isSubmitting: Bool
    let submissionErrorMessage: String?
    var onSelect: (PracticeQuestionOption) -> Void
    var onBack: () -> Void
    var onNext: () -> Void
    var onSubmit: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                LearnQuestionView(
                    questionText: question.question,
                    progressText: progressText,
                    options: question.options.map(\.text),
                    selectedOption: selectedOption?.text,
                    correctOptions: Set(question.options.filter(\.isCorrect).map(\.text)),
                    onSelect: { text in
                        if let option = question.options.first(where: { $0.text == text }) {
                            onSelect(option)
                        }
                    }
                )

                if let explanation = question.explanation, selectedOption != nil {
                    Text(explanation)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                if isLastQuestion, let submissionErrorMessage {
                    Text(submissionErrorMessage)
                        .font(.subheadline)
                        .foregroundStyle(.red)
                }

                navigationButtons
            }
            .padding()
        }
    }

    @ViewBuilder
    private var navigationButtons: some View {
        HStack {
            if canGoBack {
                Button("Back", action: onBack)
                    .buttonStyle(.bordered)
            }
            Spacer()
            if isLastQuestion {
                Button(action: onSubmit) {
                    if isSubmitting {
                        ProgressView()
                    } else {
                        Text("Submit")
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(selectedOption == nil || isSubmitting)
            } else {
                Button("Next", action: onNext)
                    .buttonStyle(.borderedProminent)
                    .disabled(selectedOption == nil)
            }
        }
    }
}
