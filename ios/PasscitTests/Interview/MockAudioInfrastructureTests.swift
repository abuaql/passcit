import Testing
import Foundation
@testable import Passcit

@Suite("Audio/speech mocks behave as real Stage 13C consumers will expect")
struct MockAudioInfrastructureTests {

    @Test func permissionCoordinatorTracksRequestsAndReturnsConfiguredResult() async {
        let mock = MockAudioPermissionCoordinator()
        mock.requestPermissionResult = .denied

        let result = await mock.requestPermission()

        #expect(result == .denied)
        #expect(mock.currentStatus == .denied, "currentStatus should reflect the just-granted/denied outcome")
        #expect(mock.requestPermissionCallCount == 1)
    }

    @Test func sessionCoordinatorDeliversEmittedEventsThroughItsStream() async {
        let mock = MockAudioSessionCoordinator()
        try? mock.activate()

        var received: [AudioSessionEvent] = []
        let collectTask = Task {
            for await event in mock.events {
                received.append(event)
                if received.count == 2 { break }
            }
        }

        // Give the stream's for-await a moment to attach before emitting —
        // AsyncStream buffers by default, so this is a belt-and-suspenders
        // yield rather than a strict requirement, but keeps the test fast.
        mock.emit(.interrupted)
        mock.emit(.resumed)
        await collectTask.value

        #expect(received == [.interrupted, .resumed])
        #expect(mock.activateCallCount == 1)
    }

    @Test func sessionCoordinatorActivateSurfacesAConfiguredError() {
        struct SessionError: Error {}
        let mock = MockAudioSessionCoordinator()
        mock.activateError = SessionError()

        #expect(throws: SessionError.self) {
            try mock.activate()
        }
    }

    @Test func transcriptionServiceYieldsConfiguredUpdatesThenFinishes() async throws {
        let mock = MockSpeechTranscriptionService()
        mock.transcriptUpdates = ["I", "I want", "I want to be a citizen"]

        var received: [String] = []
        for try await update in try mock.startTranscribing() {
            received.append(update)
        }

        #expect(received == ["I", "I want", "I want to be a citizen"])
        #expect(mock.startCallCount == 1)
    }

    @Test func transcriptionServiceStartThrowsWhenConfigured() {
        enum DummyError: Error { case boom }
        let mock = MockSpeechTranscriptionService()
        mock.startError = DummyError.boom

        #expect(throws: DummyError.self) {
            _ = try mock.startTranscribing()
        }
    }

    @Test func transcriptionServiceTracksStopAndCancel() {
        let mock = MockSpeechTranscriptionService()
        mock.stopTranscriptResult = "the final answer"

        #expect(mock.stopTranscribing() == "the final answer")
        mock.cancel()

        #expect(mock.stopCallCount == 1)
        #expect(mock.cancelCallCount == 1)
    }

    @Test func synthesizerRecordsSpokenText() async {
        let mock = MockSpeechSynthesizer()
        await mock.speak("Citizens can vote.")
        mock.stopSpeaking()

        #expect(mock.spokenTexts == ["Citizens can vote."])
        #expect(mock.stopCallCount == 1)
    }
}
