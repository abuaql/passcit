import SwiftUI

// Renders the server's result directly — score, totalQuestions, and
// passed all come from PracticeTestResult (the real completion
// response), never recomputed on the client.
struct PracticeResultView: View {
    let result: PracticeTestResult
    // Deliberately returns to the mode selector rather than immediately
    // re-launching the same mode — the learner should be able to pick a
    // different mode (or the same one) on the next screen, not be forced
    // straight back into another 10/20-question run.
    var onBackToPractice: () -> Void

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
            Button("Back to Practice", action: onBackToPractice)
                .buttonStyle(.borderedProminent)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .combine)
    }
}
