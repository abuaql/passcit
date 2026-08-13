import SwiftUI

/// The sentence is spoken aloud, never shown as text — matching the real
/// USCIS writing test, where an officer reads a sentence and the
/// applicant writes what they heard. Never uses the microphone.
struct InterviewWritingView: View {
    let progressText: String
    let isSubmitting: Bool
    var onReplaySentence: () -> Void
    var onSubmitTyped: (String) -> Void

    @State private var typedAnswer = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text(progressText)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text("Write the sentence you hear")
                    .font(.title3.bold())

                Button(action: onReplaySentence) {
                    Label("Play Sentence", systemImage: "speaker.wave.2.fill")
                }
                .buttonStyle(.borderedProminent)
                .accessibilityHint("Plays the sentence aloud again")

                TextField("Type what you heard", text: $typedAnswer, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .accessibilityLabel("Typed answer")

                Button("Submit") {
                    let answer = typedAnswer
                    typedAnswer = ""
                    onSubmitTyped(answer)
                }
                .buttonStyle(.borderedProminent)
                .disabled(typedAnswer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSubmitting)
            }
            .padding()
        }
        .navigationTitle("Writing")
        .id(progressText)
    }
}
