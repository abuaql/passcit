import SwiftUI

/// Identity is rehearsal only — nothing here is ever submitted or graded.
/// The optional recording control is purely for the learner's own
/// confidence; permission being denied never blocks the manual Continue
/// action below.
struct InterviewIdentityView: View {
    let allowsRecording: Bool
    let isRecording: Bool
    let liveTranscript: String
    let recordingErrorMessage: String?
    let isSubmitting: Bool
    var onStartRecording: () -> Void
    var onStopRecording: () -> Void
    var onContinue: () -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Image(systemName: "person.text.rectangle")
                    .font(.system(size: 48))
                    .foregroundStyle(.tint)
                Text("Identity Rehearsal")
                    .font(.title2.bold())
                Text("Before the civics test, a USCIS officer confirms your name, address, and other biographic details. Practice speaking clearly and confidently — nothing you say here is recorded or graded.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                if allowsRecording {
                    Button {
                        if isRecording {
                            onStopRecording()
                        } else {
                            onStartRecording()
                        }
                    } label: {
                        Label(
                            isRecording ? "Stop" : "Practice Speaking",
                            systemImage: isRecording ? "stop.circle.fill" : "mic.circle.fill"
                        )
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(isRecording ? .red : .accentColor)
                    .accessibilityHint("Local rehearsal only — nothing is sent or graded")

                    if isRecording {
                        Text(liveTranscript.isEmpty ? "Listening…" : liveTranscript)
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .accessibilityLabel("Live transcript")
                            .accessibilityValue(liveTranscript.isEmpty ? "Listening" : liveTranscript)
                    }
                    if let recordingErrorMessage {
                        Text(recordingErrorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }

                Button {
                    onContinue()
                } label: {
                    if isSubmitting {
                        ProgressView()
                    } else {
                        Text("Continue")
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(isSubmitting)
            }
            .padding(32)
        }
        .navigationTitle("Identity")
    }
}
