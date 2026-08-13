import Foundation
import Observation

/// Drives the full Identity → Reading → Writing → Civics → Completion
/// interview rehearsal. The server is authoritative for every grading
/// decision (Reading/Writing verdicts, Civics correctness, early-stop,
/// overall pass/fail) — this type never reimplements `evaluateAnswer` or
/// `mockInterviewStatus`; it only relays submissions and applies the
/// server's response. `InterviewCivicsQuestion` structurally cannot carry
/// accepted-answer text (see its declaration), so there is nothing for
/// this ViewModel to leak even by mistake.
///
/// Resume is intentionally in-memory only: backgrounding/foregrounding
/// within a live app session preserves all state for free (it's just
/// held in these properties); a force-quit starts a fresh interview via
/// `startInterview()`, since the server never persists the not-yet-shown
/// sentence/question pool anywhere fetchable after the initial start.
@Observable
final class InterviewViewModel {
    enum Phase: Equatable {
        case idle
        case permissionNeeded
        case inProgress
        case submitting
        case finished
        case error
    }

    enum Section: Equatable {
        case identity
        case reading
        case writing
        case civics
    }

    // MARK: State

    private(set) var phase: Phase = .idle
    private(set) var errorMessage: String?
    private(set) var permissionStatus: AudioPermissionStatus = .notDetermined

    private(set) var interviewId: String?
    private(set) var testVersion: InterviewTestVersionInfo?
    private(set) var currentSection: Section = .identity

    private(set) var readingSentences: [InterviewSentence] = []
    private(set) var readingIndex = 0
    private(set) var readingAttemptsSoFar = 0
    private(set) var readingResult: InterviewSectionResult = .notReached

    private(set) var writingSentences: [InterviewSentence] = []
    private(set) var writingIndex = 0
    private(set) var writingAttemptsSoFar = 0
    private(set) var writingResult: InterviewSectionResult = .notReached

    private(set) var civicsQuestions: [InterviewCivicsQuestion] = []
    private(set) var civicsIndex = 0
    private(set) var civicsCorrectCount = 0
    private(set) var civicsIncorrectCount = 0
    private(set) var civicsResult: InterviewSectionResult = .notReached
    private(set) var lastCivicsVerdict: MatchVerdict?

    private(set) var completionResult: InterviewCompletionResult?

    // Recording (Reading + Civics only — Writing never uses the mic).
    private(set) var isRecording = false
    private(set) var liveTranscript = ""
    private(set) var recordingErrorMessage: String?

    // MARK: Dependencies

    private let interviewService: InterviewServicing
    private let permissionCoordinator: AudioPermissionCoordinating
    private let transcriptionService: SpeechTranscriptionServicing
    private let synthesizer: SpeechSynthesizing
    private let audioSessionCoordinator: AudioSessionCoordinating

    private var cachedTestVersionId: String?
    private var recordingTask: Task<Void, Never>?
    private var audioEventTask: Task<Void, Never>?

    init(
        interviewService: InterviewServicing,
        permissionCoordinator: AudioPermissionCoordinating,
        transcriptionService: SpeechTranscriptionServicing,
        synthesizer: SpeechSynthesizing,
        audioSessionCoordinator: AudioSessionCoordinating
    ) {
        self.interviewService = interviewService
        self.permissionCoordinator = permissionCoordinator
        self.transcriptionService = transcriptionService
        self.synthesizer = synthesizer
        self.audioSessionCoordinator = audioSessionCoordinator
        observeAudioEvents()
    }

    deinit {
        audioEventTask?.cancel()
        recordingTask?.cancel()
    }

    // MARK: Derived state (for the future 13D UI)

    var shouldUseTypedFallback: Bool { permissionStatus != .granted }

    var currentReadingSentence: InterviewSentence? {
        readingSentences.indices.contains(readingIndex) ? readingSentences[readingIndex] : nil
    }

    var currentWritingSentence: InterviewSentence? {
        writingSentences.indices.contains(writingIndex) ? writingSentences[writingIndex] : nil
    }

    var currentCivicsQuestion: InterviewCivicsQuestion? {
        civicsQuestions.indices.contains(civicsIndex) ? civicsQuestions[civicsIndex] : nil
    }

    var readingProgressText: String { "Sentence \(min(readingIndex + 1, readingSentences.count)) of \(readingSentences.count)" }
    var writingProgressText: String { "Sentence \(min(writingIndex + 1, writingSentences.count)) of \(writingSentences.count)" }
    var civicsProgressText: String { "Question \(min(civicsIndex + 1, civicsQuestions.count)) of \(civicsQuestions.count)" }

    // MARK: Start / reset

    /// Starts a brand-new interview, explicitly targeting the 2025 test
    /// version. Also serves as "start another interview" — every call
    /// resets all section state, so nothing from a previous run leaks
    /// into the new one.
    func startInterview() async {
        phase = .permissionNeeded
        errorMessage = nil
        recordingErrorMessage = nil

        permissionStatus = permissionCoordinator.currentStatus
        if permissionStatus == .notDetermined {
            permissionStatus = await permissionCoordinator.requestPermission()
        }
        // Permission outcome never blocks progression — granted enables
        // mic capture, denied simply routes everything through the typed
        // fallback path further down.
        try? audioSessionCoordinator.activate()

        do {
            let resolvedTestVersionId: String
            if let cachedTestVersionId {
                resolvedTestVersionId = cachedTestVersionId
            } else {
                resolvedTestVersionId = try await interviewService.resolveTargetTestVersionId()
            }
            let response = try await interviewService.startInterview(testVersionId: resolvedTestVersionId)
            cachedTestVersionId = resolvedTestVersionId

            interviewId = response.interviewId
            testVersion = response.testVersion
            readingSentences = response.readingSentences
            writingSentences = response.writingSentences
            civicsQuestions = response.civicsQuestions

            currentSection = .identity
            readingIndex = 0; readingAttemptsSoFar = 0; readingResult = .notReached
            writingIndex = 0; writingAttemptsSoFar = 0; writingResult = .notReached
            civicsIndex = 0; civicsCorrectCount = 0; civicsIncorrectCount = 0; civicsResult = .notReached
            lastCivicsVerdict = nil
            completionResult = nil
            liveTranscript = ""

            phase = .inProgress
        } catch let error as APIClientError {
            errorMessage = error.userMessage
            phase = .error
        } catch let error as InterviewServiceError {
            errorMessage = error.message
            phase = .error
        } catch {
            errorMessage = "Something went wrong. Please try again."
            phase = .error
        }
    }

    /// Returns from `.error` to a usable state — `.idle` if nothing has
    /// ever started, `.inProgress` mid-interview so the same action can
    /// simply be retried without losing section progress.
    func dismissError() {
        errorMessage = nil
        phase = interviewId == nil ? .idle : .inProgress
    }

    // MARK: Identity

    /// Identity is rehearsal only — nothing is submitted or graded. This
    /// is the manual "continue" action; speech is never a prerequisite.
    func completeIdentity() async {
        guard let interviewId else { return }
        phase = .submitting
        errorMessage = nil
        do {
            try await interviewService.completeIdentityStep(interviewId: interviewId)
            currentSection = .reading
            phase = .inProgress
        } catch let error as APIClientError {
            errorMessage = error.userMessage
            phase = .error
        } catch {
            errorMessage = "Something went wrong. Please try again."
            phase = .error
        }
    }

    // MARK: Recording (Reading + Civics; Identity rehearsal is local-only)

    func startRecording() {
        guard currentSection == .reading || currentSection == .civics || currentSection == .identity else { return }
        guard permissionStatus == .granted else {
            recordingErrorMessage = "Microphone access isn't available — type your answer instead."
            return
        }
        recordingErrorMessage = nil
        liveTranscript = ""
        isRecording = true
        recordingTask = Task { [weak self] in
            guard let self else { return }
            do {
                let stream = try self.transcriptionService.startTranscribing()
                for try await update in stream {
                    self.liveTranscript = update
                }
            } catch {
                self.recordingErrorMessage = "Couldn't capture audio. You can type your answer instead."
                self.isRecording = false
            }
        }
    }

    /// Stops capture and, for Reading/Civics, submits the transcript. For
    /// Identity, the transcript is discarded locally — nothing is ever
    /// sent to the server for that section.
    func stopRecordingAndSubmit() async {
        isRecording = false
        recordingTask?.cancel()
        let transcript = transcriptionService.stopTranscribing()
        liveTranscript = ""
        switch currentSection {
        case .reading:
            await submitReading(transcript: transcript)
        case .civics:
            await submitCivics(answerText: transcript)
        case .identity, .writing:
            break
        }
    }

    func cancelRecording() {
        isRecording = false
        recordingTask?.cancel()
        transcriptionService.cancel()
        liveTranscript = ""
    }

    /// The accessible, hardware-independent path — works identically
    /// whether the user prefers typing or permission was denied.
    func submitTypedAnswer(_ text: String) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        switch currentSection {
        case .reading:
            await submitReading(transcript: trimmed)
        case .writing:
            await submitWriting(typedAnswer: trimmed)
        case .civics:
            await submitCivics(answerText: trimmed)
        case .identity:
            break
        }
    }

    // MARK: Reading

    private func submitReading(transcript: String) async {
        guard let interviewId, let sentence = currentReadingSentence else { return }
        phase = .submitting
        errorMessage = nil
        do {
            let result = try await interviewService.submitReadingAttempt(
                interviewId: interviewId, sentenceId: sentence.id, sentenceText: sentence.text, transcript: transcript
            )
            readingAttemptsSoFar = result.attemptsSoFar
            readingResult = result.sectionResult
            phase = .inProgress
            switch result.sectionResult {
            case .passed, .failed:
                await advanceToWriting()
            case .notReached:
                readingIndex += 1
            }
        } catch let error as APIClientError {
            errorMessage = error.userMessage
            phase = .error
        } catch {
            errorMessage = "Something went wrong. Please try again."
            phase = .error
        }
    }

    private func advanceToWriting() async {
        currentSection = .writing
        writingIndex = 0
        await speakCurrentWritingSentence()
    }

    // MARK: Writing

    /// Plays the current writing sentence aloud. Also exposed publicly so
    /// the future UI can offer a "replay" control.
    func speakCurrentWritingSentence() async {
        guard let sentence = currentWritingSentence else { return }
        await synthesizer.speak(sentence.text)
    }

    private func submitWriting(typedAnswer: String) async {
        guard let interviewId, let sentence = currentWritingSentence else { return }
        phase = .submitting
        errorMessage = nil
        do {
            let result = try await interviewService.submitWritingAttempt(
                interviewId: interviewId, sentenceId: sentence.id, sentenceText: sentence.text, typedAnswer: typedAnswer
            )
            writingAttemptsSoFar = result.attemptsSoFar
            writingResult = result.sectionResult
            phase = .inProgress
            switch result.sectionResult {
            case .passed, .failed:
                advanceToCivics()
            case .notReached:
                writingIndex += 1
                await speakCurrentWritingSentence()
            }
        } catch let error as APIClientError {
            errorMessage = error.userMessage
            phase = .error
        } catch {
            errorMessage = "Something went wrong. Please try again."
            phase = .error
        }
    }

    private func advanceToCivics() {
        currentSection = .civics
        civicsIndex = 0
    }

    // MARK: Civics

    private func submitCivics(answerText: String) async {
        guard let interviewId, let question = currentCivicsQuestion, let testVersion else { return }
        phase = .submitting
        errorMessage = nil
        do {
            let result = try await interviewService.submitCivicsAnswer(
                interviewId: interviewId,
                questionId: question.id,
                answerText: answerText,
                passThreshold: testVersion.passThreshold,
                questionsAsked: testVersion.questionsAsked
            )
            // Local counters are for display only — control flow below
            // depends exclusively on the server's `done`/`passed` fields,
            // never on these counts or any local reimplementation of
            // mockInterviewStatus.
            if result.isCorrect {
                civicsCorrectCount += 1
            } else {
                civicsIncorrectCount += 1
            }
            lastCivicsVerdict = result.verdict
            phase = .inProgress
            if result.done {
                civicsResult = (result.passed == true) ? .passed : .failed
                await finishInterview()
            } else {
                civicsIndex += 1
            }
        } catch let error as APIClientError {
            errorMessage = error.userMessage
            phase = .error
        } catch {
            errorMessage = "Something went wrong. Please try again."
            phase = .error
        }
    }

    // MARK: Completion

    private func finishInterview() async {
        guard let interviewId else { return }
        phase = .submitting
        errorMessage = nil
        do {
            let result = try await interviewService.completeInterview(interviewId: interviewId)
            completionResult = result
            phase = .finished
        } catch let error as APIClientError {
            errorMessage = error.userMessage
            phase = .error
        } catch {
            errorMessage = "Something went wrong. Please try again."
            phase = .error
        }
    }

    // MARK: Audio session events

    /// Listens for the whole ViewModel lifetime (not just while recording
    /// is active) so an interruption is never missed. A background/route
    /// change while a recording is in flight cancels it safely — the user
    /// simply starts again, never left in a stuck or crashed state.
    private func observeAudioEvents() {
        audioEventTask = Task { [weak self] in
            guard let self else { return }
            for await event in self.audioSessionCoordinator.events {
                switch event {
                case .interrupted:
                    if self.isRecording {
                        self.cancelRecording()
                    }
                case .resumed, .routeChanged:
                    break
                }
            }
        }
    }
}
