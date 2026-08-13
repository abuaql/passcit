import SwiftUI

/// Renders the server's completion result directly — passed and every
/// section result come from InterviewCompletionResult, never recomputed
/// on the client.
struct InterviewResultView: View {
    let result: InterviewCompletionResult
    var onStartAnother: () -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Image(systemName: result.passed ? "checkmark.seal.fill" : "xmark.seal.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(result.passed ? .green : .red)
                Text(result.passed ? "You passed!" : "Not quite")
                    .font(.title.bold())
                Text("\(result.civicsCorrectCount) of \(result.civicsCorrectCount + result.civicsIncorrectCount) civics questions correct.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                VStack(spacing: 12) {
                    sectionRow(title: "Reading", result: result.readingResult)
                    sectionRow(title: "Writing", result: result.writingResult)
                    sectionRow(title: "Civics", result: result.civicsResult)
                }
                .padding()
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))

                Button("Start Another Interview", action: onStartAnother)
                    .buttonStyle(.borderedProminent)
            }
            .padding(32)
        }
        .navigationTitle("Result")
    }

    private func sectionRow(title: String, result: InterviewSectionResult) -> some View {
        HStack {
            Text(title)
                .font(.body)
            Spacer()
            Text(label(for: result))
                .font(.subheadline.bold())
                .foregroundStyle(color(for: result))
        }
        .accessibilityElement(children: .combine)
    }

    private func label(for result: InterviewSectionResult) -> String {
        switch result {
        case .passed: return "Passed"
        case .failed: return "Failed"
        case .notReached: return "Not Reached"
        }
    }

    private func color(for result: InterviewSectionResult) -> Color {
        switch result {
        case .passed: return .green
        case .failed: return .red
        case .notReached: return .secondary
        }
    }
}
