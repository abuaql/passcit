import SwiftUI

/// `InterviewCivicsQuestion` structurally has no `answers`/accepted-answer
/// property (Stage 13A) — there is nothing this view could show even by
/// mistake. Grading and early-stop are entirely server-authoritative.
struct InterviewCivicsView: View {
    let question: InterviewCivicsQuestion
    let progressText: String
    let allowsRecording: Bool
    let isRecording: Bool
    let liveTranscript: String
    let recordingErrorMessage: String?
    let isSubmitting: Bool
    var onStartRecording: () -> Void
    var onStopRecordingAndSubmit: () -> Void
    var onSubmitTyped: (String) -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text(progressText)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Text(question.question)
                    .font(.title2.bold())
                    .accessibilityLabel("Civics question")
                    .accessibilityValue(question.question)

                InterviewAnswerInputView(
                    allowsRecording: allowsRecording,
                    isRecording: isRecording,
                    liveTranscript: liveTranscript,
                    recordingErrorMessage: recordingErrorMessage,
                    isSubmitting: isSubmitting,
                    onStartRecording: onStartRecording,
                    onStopRecordingAndSubmit: onStopRecordingAndSubmit,
                    onSubmitTyped: onSubmitTyped
                )
                .id(question.id)
            }
            .padding()
        }
        .navigationTitle("Civics")
    }
}
