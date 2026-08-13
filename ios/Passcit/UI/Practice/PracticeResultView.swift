import SwiftUI

// Renders the server's result directly — score, totalQuestions, and
// passed all come from PracticeTestResult (the real completion
// response), never recomputed on the client.
struct PracticeResultView: View {
    let result: PracticeTestResult
    var onStartAnother: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: result.passed ? "checkmark.seal.fill" : "xmark.seal.fill")
                .font(.system(size: 56))
                .foregroundStyle(result.passed ? .green : .red)
            Text(result.passed ? "You passed!" : "Not quite")
                .font(.title.bold())
            Text("\(result.score) out of \(result.totalQuestions) correct.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            if !result.passed {
                Text("Review the questions you missed, then try another test.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            Button("Start Another Test", action: onStartAnother)
                .buttonStyle(.borderedProminent)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .combine)
    }
}
