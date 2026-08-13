import SwiftUI

/// Shared spoken/typed answer control for Reading and Civics — both need
/// an identical "record or type your answer" shape. Never holds the
/// InterviewViewModel itself; the parent view supplies plain state and
/// closures, matching the rest of the codebase's view/view-model split.
struct InterviewAnswerInputView: View {
    let allowsRecording: Bool
    let isRecording: Bool
    let liveTranscript: String
    let recordingErrorMessage: String?
    let isSubmitting: Bool
    var onStartRecording: () -> Void
    var onStopRecordingAndSubmit: () -> Void
    var onSubmitTyped: (String) -> Void

    @State private var typedAnswer = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if allowsRecording {
                recordingControl
                if isRecording {
                    Text(liveTranscript.isEmpty ? "Listening…" : liveTranscript)
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .accessibilityLabel("Live transcript")
                        .accessibilityValue(liveTranscript.isEmpty ? "Listening" : liveTranscript)
                }
                if let recordingErrorMessage {
                    Text(recordingErrorMessage)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
                Text("or type your answer instead")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack(alignment: .bottom) {
                TextField("Type your answer", text: $typedAnswer, axis: .vertical)
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
        }
        .disabled(isSubmitting)
    }

    @ViewBuilder
    private var recordingControl: some View {
        Button {
            if isRecording {
                onStopRecordingAndSubmit()
            } else {
                onStartRecording()
            }
        } label: {
            Label(
                isRecording ? "Stop and Submit" : "Record Answer",
                systemImage: isRecording ? "stop.circle.fill" : "mic.circle.fill"
            )
        }
        .buttonStyle(.borderedProminent)
        .tint(isRecording ? .red : .accentColor)
        .accessibilityLabel(isRecording ? "Stop recording and submit answer" : "Record your answer")
        .accessibilityHint(isRecording ? "" : "Starts capturing your spoken answer")
    }
}
