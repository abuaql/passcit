import Testing
import Foundation
@testable import Passcit

@Suite("InterviewViewModel state machine")
struct InterviewViewModelTests {

    // MARK: Helpers

    struct Harness {
        let viewModel: InterviewViewModel
        let interviewService: MockInterviewService
        let permissionCoordinator: MockAudioPermissionCoordinator
        let transcriptionService: MockSpeechTranscriptionService
        let synthesizer: MockSpeechSynthesizer
        let audioSessionCoordinator: MockAudioSessionCoordinator
    }

    func makeHarness(permission: AudioPermissionStatus = .granted) -> Harness {
        let interviewService = MockInterviewService()
        let permissionCoordinator = MockAudioPermissionCoordinator()
        permissionCoordinator.currentStatus = permission
        permissionCoordinator.requestPermissionResult = permission
        let transcriptionService = MockSpeechTranscriptionService()
        let synthesizer = MockSpeechSynthesizer()
        let audioSessionCoordinator = MockAudioSessionCoordinator()
        let viewModel = InterviewViewModel(
            interviewService: interviewService,
            permissionCoordinator: permissionCoordinator,
            transcriptionService: transcriptionService,
            synthesizer: synthesizer,
            audioSessionCoordinator: audioSessionCoordinator
        )
        return Harness(
            viewModel: viewModel, interviewService: interviewService, permissionCoordinator: permissionCoordinator,
            transcriptionService: transcriptionService, synthesizer: synthesizer, audioSessionCoordinator: audioSessionCoordinator
        )
    }

    /// Starts the interview and completes Identity, landing on Reading —
    /// the shared starting point for most section-level tests.
    @discardableResult
    func reachReading(_ harness: Harness, response: StartInterviewResponse = InterviewFixtures.startResponse()) async -> Harness {
        harness.interviewService.startResult = .success(response)
        await harness.viewModel.startInterview()
        await harness.viewModel.completeIdentity()
        return harness
    }

    func reachWriting(_ harness: Harness, response: StartInterviewResponse = InterviewFixtures.startResponse()) async -> Harness {
        await reachReading(harness, response: response)
        harness.interviewService.readingResult = .success(SectionAttemptResult(isCorrect: true, sectionResult: .passed, attemptsSoFar: 1))
        await harness.viewModel.submitTypedAnswer("reading answer")
        return harness
    }

    func reachCivics(_ harness: Harness, response: StartInterviewResponse = InterviewFixtures.startResponse()) async -> Harness {
        await reachWriting(harness, response: response)
        harness.interviewService.writingResult = .success(SectionAttemptResult(isCorrect: true, sectionResult: .passed, attemptsSoFar: 1))
        await harness.viewModel.submitTypedAnswer("writing answer")
        return harness
    }

    // MARK: 1. 2025 targeting

    @Test func startInterviewResolvesAndCachesThe2025TestVersionId() async {
        let h = makeHarness()
        h.interviewService.testVersionIdResult = .success("tv_2025_id")
        h.interviewService.startResult = .success(InterviewFixtures.startResponse())

        await h.viewModel.startInterview()
        #expect(h.interviewService.lastStartTestVersionId == "tv_2025_id")
        #expect(h.interviewService.resolveCallCount == 1)

        // Second start reuses the cached id rather than resolving again.
        await h.viewModel.startInterview()
        #expect(h.interviewService.resolveCallCount == 1)
        #expect(h.interviewService.startCallCount == 2)
    }

    // MARK: 2. Initial state and interview start

    @Test func initialStateIsIdleWithNoInterviewLoaded() {
        let h = makeHarness()
        #expect(h.viewModel.phase == .idle)
        #expect(h.viewModel.interviewId == nil)
        #expect(h.viewModel.currentSection == .identity)
    }

    @Test func successfulStartPopulatesSectionDataAndEntersInProgress() async {
        let h = makeHarness()
        let response = InterviewFixtures.startResponse(interviewId: "interview_42")
        h.interviewService.startResult = .success(response)

        await h.viewModel.startInterview()

        #expect(h.viewModel.phase == .inProgress)
        #expect(h.viewModel.interviewId == "interview_42")
        #expect(h.viewModel.testVersion == response.testVersion)
        #expect(h.viewModel.readingSentences == response.readingSentences)
        #expect(h.viewModel.writingSentences == response.writingSentences)
        #expect(h.viewModel.civicsQuestions == response.civicsQuestions)
        #expect(h.viewModel.currentSection == .identity)
    }

    // MARK: 3. Identity completion

    @Test func completingIdentityAdvancesToReadingWithoutSubmittingAnswerContent() async {
        let h = makeHarness()
        h.interviewService.startResult = .success(InterviewFixtures.startResponse())
        await h.viewModel.startInterview()

        await h.viewModel.completeIdentity()

        #expect(h.interviewService.completeIdentityCallCount == 1)
        #expect(h.viewModel.currentSection == .reading)
        #expect(h.viewModel.phase == .inProgress)
    }

    // MARK: 4-5. Reading pass (server already collapses CORRECT/ALMOST_CORRECT into sectionResult == .passed)

    @Test func readingPassAdvancesToWriting() async {
        let h = await reachReading(makeHarness())
        h.interviewService.readingResult = .success(SectionAttemptResult(isCorrect: true, sectionResult: .passed, attemptsSoFar: 1))

        await h.viewModel.submitTypedAnswer("I want to be a citizen.")

        #expect(h.viewModel.readingResult == .passed)
        #expect(h.viewModel.currentSection == .writing)
        #expect(h.synthesizer.spokenTexts.count == 1, "entering Writing should speak the first sentence")
    }

    @Test func readingPassOnLenientAlmostCorrectVerdictStillAdvances() async {
        // ALMOST_CORRECT is a passing verdict server-side (src/lib/interview.ts)
        // — by the time it reaches the client it's already folded into
        // sectionResult == .passed, same wire shape as an exact match.
        let h = await reachReading(makeHarness())
        h.interviewService.readingResult = .success(SectionAttemptResult(isCorrect: true, sectionResult: .passed, attemptsSoFar: 2))

        await h.viewModel.submitTypedAnswer("I want to be a citizen")

        #expect(h.viewModel.readingResult == .passed)
        #expect(h.viewModel.currentSection == .writing)
    }

    // MARK: 6. Reading retry after NOT_REACHED

    @Test func readingNotReachedAdvancesToNextSentenceWithinTheSameSection() async {
        let h = await reachReading(makeHarness())
        h.interviewService.readingResult = .success(SectionAttemptResult(isCorrect: false, sectionResult: .notReached, attemptsSoFar: 1))

        await h.viewModel.submitTypedAnswer("wrong attempt")

        #expect(h.viewModel.currentSection == .reading)
        #expect(h.viewModel.readingIndex == 1)
        #expect(h.viewModel.readingAttemptsSoFar == 1)
        #expect(h.viewModel.phase == .inProgress)
    }

    // MARK: 7-8. Reading failure after 3 attempts -> Writing

    @Test func readingFailedAfterAttemptExhaustionAdvancesToWritingAnyway() async {
        let h = await reachReading(makeHarness())
        h.interviewService.readingResult = .success(SectionAttemptResult(isCorrect: false, sectionResult: .failed, attemptsSoFar: 3))

        await h.viewModel.submitTypedAnswer("still wrong")

        #expect(h.viewModel.readingResult == .failed)
        #expect(h.viewModel.currentSection == .writing)
        #expect(h.synthesizer.spokenTexts.count == 1)
    }

    // MARK: 9. Writing pass/retry/failure

    @Test func writingPassAdvancesToCivics() async {
        let h = await reachWriting(makeHarness())
        h.interviewService.writingResult = .success(SectionAttemptResult(isCorrect: true, sectionResult: .passed, attemptsSoFar: 1))

        await h.viewModel.submitTypedAnswer("Citizens can vote.")

        #expect(h.viewModel.writingResult == .passed)
        #expect(h.viewModel.currentSection == .civics)
    }

    @Test func writingNotReachedRetriesWithNextSentenceAndSpeaksItAgain() async {
        let h = await reachWriting(makeHarness())
        h.interviewService.writingResult = .success(SectionAttemptResult(isCorrect: false, sectionResult: .notReached, attemptsSoFar: 1))

        await h.viewModel.submitTypedAnswer("wrong")

        #expect(h.viewModel.currentSection == .writing)
        #expect(h.viewModel.writingIndex == 1)
        // One speak() from entering Writing (reachWriting) + one for the retry.
        #expect(h.synthesizer.spokenTexts.count == 2)
    }

    @Test func writingFailedAfterExhaustionAdvancesToCivicsAnyway() async {
        let h = await reachWriting(makeHarness())
        h.interviewService.writingResult = .success(SectionAttemptResult(isCorrect: false, sectionResult: .failed, attemptsSoFar: 3))

        await h.viewModel.submitTypedAnswer("wrong again")

        #expect(h.viewModel.writingResult == .failed)
        #expect(h.viewModel.currentSection == .civics)
    }

    // MARK: 10. Transition Writing -> Civics

    @Test func enteringCivicsResetsQuestionIndexToZero() async {
        let h = await reachCivics(makeHarness())
        #expect(h.viewModel.currentSection == .civics)
        #expect(h.viewModel.civicsIndex == 0)
    }

    // MARK: 11. Civics strict server result handling + local display counters

    @Test func civicsSubmissionSendsOnlyQuestionIdAnswerTextAndCachedThresholds() async {
        let response = InterviewFixtures.startResponse(testVersion: InterviewFixtures.testVersionInfo(questionsAsked: 20, passThreshold: 12))
        let h = await reachCivics(makeHarness(), response: response)
        h.interviewService.civicsResult = .success(CivicsAnswerResult(isCorrect: true, verdict: .correct, done: false, passed: nil))

        await h.viewModel.submitTypedAnswer("the constitution")

        let submission = h.interviewService.lastCivicsSubmission
        #expect(submission?.questionId == h.viewModel.civicsQuestions[0].id)
        #expect(submission?.answerText == "the constitution")
        #expect(submission?.passThreshold == 12)
        #expect(submission?.questionsAsked == 20)
        #expect(h.viewModel.civicsCorrectCount == 1)
        #expect(h.viewModel.lastCivicsVerdict == .correct)
    }

    // MARK: 12. Civics early-stop when server says done

    @Test func civicsContinuesWhileDoneIsFalse() async {
        let h = await reachCivics(makeHarness())
        h.interviewService.civicsResult = .success(CivicsAnswerResult(isCorrect: false, verdict: .incorrect, done: false, passed: nil))

        await h.viewModel.submitTypedAnswer("wrong")

        #expect(h.viewModel.civicsIndex == 1)
        #expect(h.viewModel.currentSection == .civics)
        #expect(h.interviewService.completeInterviewCallCount == 0)
    }

    @Test func civicsStopsImmediatelyWhenServerReportsDone() async {
        let h = await reachCivics(makeHarness())
        h.interviewService.civicsResult = .success(CivicsAnswerResult(isCorrect: true, verdict: .correct, done: true, passed: true))
        h.interviewService.completeInterviewResult = .success(
            InterviewCompletionResult(passed: true, readingResult: .passed, writingResult: .passed, civicsResult: .passed, civicsCorrectCount: 12, civicsIncorrectCount: 2, durationSec: 300)
        )

        await h.viewModel.submitTypedAnswer("correct answer")

        #expect(h.viewModel.civicsIndex == 0, "should not advance to a next question once done")
        #expect(h.interviewService.completeInterviewCallCount == 1)
    }

    // MARK: 13-14. Civics server pass / fail recorded verbatim

    @Test func civicsServerPassIsRecordedExactlyAsReturned() async {
        let h = await reachCivics(makeHarness())
        h.interviewService.civicsResult = .success(CivicsAnswerResult(isCorrect: true, verdict: .correct, done: true, passed: true))
        h.interviewService.completeInterviewResult = .success(
            InterviewCompletionResult(passed: true, readingResult: .passed, writingResult: .passed, civicsResult: .passed, civicsCorrectCount: 12, civicsIncorrectCount: 0, durationSec: 200)
        )

        await h.viewModel.submitTypedAnswer("correct")

        #expect(h.viewModel.civicsResult == .passed)
        #expect(h.viewModel.phase == .finished)
        #expect(h.viewModel.completionResult?.passed == true)
    }

    @Test func civicsServerFailIsRecordedExactlyAsReturned() async {
        let h = await reachCivics(makeHarness())
        h.interviewService.civicsResult = .success(CivicsAnswerResult(isCorrect: false, verdict: .incorrect, done: true, passed: false))
        h.interviewService.completeInterviewResult = .success(
            InterviewCompletionResult(passed: false, readingResult: .passed, writingResult: .passed, civicsResult: .failed, civicsCorrectCount: 5, civicsIncorrectCount: 9, durationSec: 200)
        )

        await h.viewModel.submitTypedAnswer("wrong")

        #expect(h.viewModel.civicsResult == .failed)
        #expect(h.viewModel.completionResult?.passed == false)
    }

    // MARK: 15. No client-side civics scoring

    @Test func localCorrectCountReachingPassThresholdDoesNotStopTheInterviewOnItsOwn() async {
        // Feed enough server-marked-correct answers to exceed a plausible
        // passThreshold locally, but keep telling the client done == false
        // — proving the ViewModel never runs its own mockInterviewStatus
        // equivalent and only stops when the server says so.
        let response = InterviewFixtures.startResponse(testVersion: InterviewFixtures.testVersionInfo(questionsAsked: 20, passThreshold: 2))
        let h = await reachCivics(makeHarness(), response: response)

        h.interviewService.civicsResult = .success(CivicsAnswerResult(isCorrect: true, verdict: .correct, done: false, passed: nil))
        await h.viewModel.submitTypedAnswer("answer 1")
        h.interviewService.civicsResult = .success(CivicsAnswerResult(isCorrect: true, verdict: .correct, done: false, passed: nil))
        await h.viewModel.submitTypedAnswer("answer 2")

        #expect(h.viewModel.civicsCorrectCount == 2, "local counter exceeds passThreshold=2")
        #expect(h.viewModel.currentSection == .civics, "but the interview keeps going — only the server's done flag can stop it")
        #expect(h.interviewService.completeInterviewCallCount == 0)
    }

    // MARK: 16. Accepted-answer data never exposed by the ViewModel

    @Test func civicsQuestionsHeldByTheViewModelCannotCarryAcceptedAnswerText() async {
        // InterviewCivicsQuestion structurally omits `answers` (Stage 13A),
        // so decoding a payload that includes accepted-answer text can
        // never surface it here even if the server sent it. Mirror-reflect
        // every stored question to make that guarantee concrete, not just
        // asserted by type inspection.
        let question = InterviewFixtures.civicsQuestion(id: "c1", question: "What is the supreme law of the land?")
        let response = InterviewFixtures.startResponse(civicsQuestions: [question])
        let h = await reachCivics(makeHarness(), response: response)

        for civicsQuestion in h.viewModel.civicsQuestions {
            let mirror = Mirror(reflecting: civicsQuestion)
            for child in mirror.children {
                #expect(child.label != "answers")
                #expect(child.label != "acceptedAnswers")
            }
        }
    }

    // MARK: 17. Permission denied -> typed fallback

    @Test func permissionDeniedStillAllowsFullProgressionViaTypedAnswers() async {
        let h = makeHarness(permission: .notDetermined)
        h.permissionCoordinator.requestPermissionResult = .denied
        h.interviewService.startResult = .success(InterviewFixtures.startResponse())

        await h.viewModel.startInterview()

        #expect(h.viewModel.permissionStatus == .denied)
        #expect(h.viewModel.shouldUseTypedFallback == true)
        #expect(h.viewModel.phase == .inProgress, "denied permission must never block progression")

        await h.viewModel.completeIdentity()
        h.interviewService.readingResult = .success(SectionAttemptResult(isCorrect: true, sectionResult: .passed, attemptsSoFar: 1))
        await h.viewModel.submitTypedAnswer("typed reading answer")

        #expect(h.interviewService.readingCallCount == 1)
        #expect(h.viewModel.currentSection == .writing)
    }

    @Test func startRecordingWithoutGrantedPermissionSetsARecordingErrorAndDoesNotCaptureAudio() async {
        let h = await reachReading(makeHarness(permission: .denied))
        h.viewModel.startRecording()
        #expect(h.viewModel.isRecording == false)
        #expect(h.viewModel.recordingErrorMessage != nil)
        #expect(h.transcriptionService.startCallCount == 0)
    }

    // MARK: 18. Speech cancellation/error

    @Test func startRecordingSurfacesATranscriptionStartFailureWithoutCrashing() async {
        enum DummyError: Error { case boom }
        let h = await reachReading(makeHarness())
        h.transcriptionService.startError = DummyError.boom

        h.viewModel.startRecording()
        try? await Task.sleep(nanoseconds: 100_000_000)

        #expect(h.viewModel.isRecording == false)
        #expect(h.viewModel.recordingErrorMessage != nil)
    }

    @Test func cancelRecordingStopsCaptureAndClearsLiveTranscript() async {
        let h = await reachReading(makeHarness())
        h.viewModel.startRecording()
        try? await Task.sleep(nanoseconds: 50_000_000)

        h.viewModel.cancelRecording()

        #expect(h.viewModel.isRecording == false)
        #expect(h.viewModel.liveTranscript.isEmpty)
        #expect(h.transcriptionService.cancelCallCount == 1)
    }

    // MARK: 19. Audio interruption handling

    @Test func audioInterruptionCancelsAnActiveRecordingAutomatically() async {
        let h = await reachReading(makeHarness())
        h.viewModel.startRecording()
        try? await Task.sleep(nanoseconds: 50_000_000)
        #expect(h.viewModel.isRecording == true)

        h.audioSessionCoordinator.emit(.interrupted)
        try? await Task.sleep(nanoseconds: 100_000_000)

        #expect(h.viewModel.isRecording == false)
        #expect(h.transcriptionService.cancelCallCount >= 1)
    }

    // MARK: 20. Session expiration / API errors

    @Test func sessionExpirationDuringStartSurfacesAnErrorPhase() async {
        let h = makeHarness()
        h.interviewService.startResult = .failure(APIClientError.sessionExpired)

        await h.viewModel.startInterview()

        #expect(h.viewModel.phase == .error)
        #expect(h.viewModel.errorMessage == APIClientError.sessionExpired.userMessage)
    }

    @Test func serverErrorDuringReadingSubmissionSurfacesAndIsRecoverableViaDismiss() async {
        let h = await reachReading(makeHarness())
        h.interviewService.readingResult = .failure(APIClientError.server(status: 500, message: "Something broke."))

        await h.viewModel.submitTypedAnswer("an answer")
        #expect(h.viewModel.phase == .error)
        #expect(h.viewModel.errorMessage == "Something broke.")

        h.viewModel.dismissError()
        #expect(h.viewModel.phase == .inProgress)
        #expect(h.viewModel.errorMessage == nil)
        #expect(h.viewModel.currentSection == .reading, "failed submission must not have silently advanced the section")
    }

    // MARK: 21. Completion request only after the flow actually reaches completion

    @Test func completeInterviewIsOnlyCalledOnceCivicsReportsDone() async {
        let h = await reachCivics(makeHarness())
        #expect(h.interviewService.completeInterviewCallCount == 0)

        h.interviewService.civicsResult = .success(CivicsAnswerResult(isCorrect: true, verdict: .correct, done: false, passed: nil))
        await h.viewModel.submitTypedAnswer("answer 1")
        #expect(h.interviewService.completeInterviewCallCount == 0)

        h.interviewService.civicsResult = .success(CivicsAnswerResult(isCorrect: true, verdict: .correct, done: true, passed: true))
        h.interviewService.completeInterviewResult = .success(
            InterviewCompletionResult(passed: true, readingResult: .passed, writingResult: .passed, civicsResult: .passed, civicsCorrectCount: 2, civicsIncorrectCount: 0, durationSec: 100)
        )
        await h.viewModel.submitTypedAnswer("answer 2")
        #expect(h.interviewService.completeInterviewCallCount == 1)
    }

    // MARK: 22. No force-quit resume behavior

    @Test func constructingAFreshViewModelNeverAttemptsToResumeAPastInterview() {
        let h = makeHarness()
        h.interviewService.historyResult = .success([])
        h.interviewService.detailResult = .failure(MockInterviewService.TestSetupError.notConfigured)

        // Nothing in init() should have reached for history/detail — a
        // fresh ViewModel always starts idle, never auto-restoring a
        // prior in-progress interview.
        #expect(h.viewModel.phase == .idle)
        #expect(h.viewModel.interviewId == nil)
    }

    // MARK: 23. Reset/start-new-interview clears all previous state

    @Test func startingANewInterviewResetsAllPriorSectionState() async {
        let h = await reachReading(makeHarness())
        h.interviewService.readingResult = .success(SectionAttemptResult(isCorrect: false, sectionResult: .notReached, attemptsSoFar: 1))
        await h.viewModel.submitTypedAnswer("wrong")
        #expect(h.viewModel.readingIndex == 1)
        #expect(h.viewModel.interviewId != nil)

        let freshResponse = InterviewFixtures.startResponse(interviewId: "interview_fresh")
        h.interviewService.startResult = .success(freshResponse)
        await h.viewModel.startInterview()

        #expect(h.viewModel.interviewId == "interview_fresh")
        #expect(h.viewModel.currentSection == .identity)
        #expect(h.viewModel.readingIndex == 0)
        #expect(h.viewModel.readingAttemptsSoFar == 0)
        #expect(h.viewModel.readingResult == .notReached)
        #expect(h.viewModel.writingResult == .notReached)
        #expect(h.viewModel.civicsResult == .notReached)
        #expect(h.viewModel.civicsCorrectCount == 0)
        #expect(h.viewModel.civicsIncorrectCount == 0)
        #expect(h.viewModel.completionResult == nil)
    }
}
