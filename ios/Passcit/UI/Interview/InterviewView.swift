import SwiftUI

struct InterviewView: View {
    @Environment(AuthManager.self) private var authManager
    @State private var viewModel: InterviewViewModel
    let apiClient: APIClient
    var onSignInTapped: () -> Void

    init(apiClient: APIClient, onSignInTapped: @escaping () -> Void) {
        self.apiClient = apiClient
        _viewModel = State(initialValue: InterviewViewModel(
            interviewService: InterviewService(apiClient: apiClient),
            permissionCoordinator: AudioPermissionCoordinator(),
            transcriptionService: SpeechTranscriptionService(),
            synthesizer: SpeechSynthesizer(),
            audioSessionCoordinator: AudioSessionCoordinator()
        ))
        self.onSignInTapped = onSignInTapped
    }

    var body: some View {
        NavigationStack {
            content
                .navigationTitle(viewModel.phase == .idle ? "Interview" : "")
                .navigationBarTitleDisplayMode(viewModel.phase == .idle ? .automatic : .inline)
                .toolbar {
                    if case .signedIn = authManager.state {
                        ToolbarItem(placement: .navigationBarTrailing) {
                            NavigationLink {
                                InterviewHistoryView(apiClient: apiClient)
                            } label: {
                                Image(systemName: "clock.arrow.circlepath")
                            }
                            .accessibilityLabel("Interview History")
                        }
                    }
                }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch authManager.state {
        case .bootstrapping:
            LoadingView()
        case .signedOut:
            signedOutPrompt
        case .signedIn:
            interviewContent
        }
    }

    private var signedOutPrompt: some View {
        VStack(spacing: 16) {
            Image(systemName: "mic.fill")
                .font(.system(size: 48))
                .foregroundStyle(.tint)
            Text("Sign in to rehearse")
                .font(.title3.bold())
            Text("Practice the real naturalization interview — Identity, Reading, Writing, and Civics — once you're signed in.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Sign In / Register", action: onSignInTapped)
                .buttonStyle(.borderedProminent)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private var interviewContent: some View {
        switch viewModel.phase {
        case .idle:
            startScreen
        case .permissionNeeded:
            VStack(spacing: 16) {
                ProgressView()
                Text("Setting up your interview…")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        case .inProgress, .submitting:
            sectionView
        case .finished:
            if let result = viewModel.completionResult {
                InterviewResultView(result: result) {
                    Task { await viewModel.startInterview() }
                }
            }
        case .error:
            ErrorStateView(message: viewModel.errorMessage ?? "Something went wrong. Please try again.") {
                viewModel.dismissError()
            }
        }
    }

    @ViewBuilder
    private var startScreen: some View {
        VStack(spacing: 20) {
            Image(systemName: "mic.fill")
                .font(.system(size: 48))
                .foregroundStyle(.tint)
            Text("Interview Simulation")
                .font(.title2.bold())
            Text("Rehearse Identity, Reading, Writing, and Civics — just like the real naturalization interview.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Start Interview") {
                Task { await viewModel.startInterview() }
            }
            .buttonStyle(.borderedProminent)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private var sectionView: some View {
        switch viewModel.currentSection {
        case .identity:
            InterviewIdentityView(
                allowsRecording: !viewModel.shouldUseTypedFallback,
                isRecording: viewModel.isRecording,
                liveTranscript: viewModel.liveTranscript,
                recordingErrorMessage: viewModel.recordingErrorMessage,
                isSubmitting: viewModel.phase == .submitting,
                onStartRecording: { viewModel.startRecording() },
                onStopRecording: { Task { await viewModel.stopRecordingAndSubmit() } },
                onContinue: { Task { await viewModel.completeIdentity() } }
            )
        case .reading:
            if let sentence = viewModel.currentReadingSentence {
                InterviewReadingView(
                    sentence: sentence,
                    progressText: viewModel.readingProgressText,
                    allowsRecording: !viewModel.shouldUseTypedFallback,
                    isRecording: viewModel.isRecording,
                    liveTranscript: viewModel.liveTranscript,
                    recordingErrorMessage: viewModel.recordingErrorMessage,
                    isSubmitting: viewModel.phase == .submitting,
                    onStartRecording: { viewModel.startRecording() },
                    onStopRecordingAndSubmit: { Task { await viewModel.stopRecordingAndSubmit() } },
                    onSubmitTyped: { text in Task { await viewModel.submitTypedAnswer(text) } }
                )
            } else {
                LoadingView()
            }
        case .writing:
            InterviewWritingView(
                progressText: viewModel.writingProgressText,
                isSubmitting: viewModel.phase == .submitting,
                onReplaySentence: { Task { await viewModel.speakCurrentWritingSentence() } },
                onSubmitTyped: { text in Task { await viewModel.submitTypedAnswer(text) } }
            )
        case .civics:
            if let question = viewModel.currentCivicsQuestion {
                InterviewCivicsView(
                    question: question,
                    progressText: viewModel.civicsProgressText,
                    allowsRecording: !viewModel.shouldUseTypedFallback,
                    isRecording: viewModel.isRecording,
                    liveTranscript: viewModel.liveTranscript,
                    recordingErrorMessage: viewModel.recordingErrorMessage,
                    isSubmitting: viewModel.phase == .submitting,
                    onStartRecording: { viewModel.startRecording() },
                    onStopRecordingAndSubmit: { Task { await viewModel.stopRecordingAndSubmit() } },
                    onSubmitTyped: { text in Task { await viewModel.submitTypedAnswer(text) } }
                )
            } else {
                LoadingView()
            }
        }
    }
}
