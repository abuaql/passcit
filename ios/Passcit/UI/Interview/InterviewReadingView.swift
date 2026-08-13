import SwiftUI

struct InterviewReadingView: View {
    let sentence: InterviewSentence
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
                Text("Read this sentence aloud")
                    .font(.title3.bold())

                Text(sentence.text)
                    .font(.title2)
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
                    .accessibilityElement(children: .combine)
                    .accessibilityLabel("Sentence to read")
                    .accessibilityValue(sentence.text)

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
                .id(sentence.id)
            }
            .padding()
        }
        .navigationTitle("Reading")
    }
}
