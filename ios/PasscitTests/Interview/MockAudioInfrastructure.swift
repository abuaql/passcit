import Foundation
@testable import Passcit

/// Test doubles for the Stage 13B audio/speech protocols — for Stage
/// 13C's future InterviewViewModel tests, so none of that logic will
/// need real microphone/speech hardware either. Not @Test/@Suite types.

final class MockAudioPermissionCoordinator: AudioPermissionCoordinating {
    var currentStatus: AudioPermissionStatus = .notDetermined
    var requestPermissionResult: AudioPermissionStatus = .granted
    private(set) var requestPermissionCallCount = 0

    func requestPermission() async -> AudioPermissionStatus {
        requestPermissionCallCount += 1
        currentStatus = requestPermissionResult
        return requestPermissionResult
    }
}

final class MockAudioSessionCoordinator: AudioSessionCoordinating {
    private let stream: AsyncStream<AudioSessionEvent>
    private let continuation: AsyncStream<AudioSessionEvent>.Continuation
    private(set) var activateCallCount = 0
    private(set) var deactivateCallCount = 0
    var activateError: Error?

    init() {
        (stream, continuation) = AsyncStream<AudioSessionEvent>.makeStream()
    }

    var events: AsyncStream<AudioSessionEvent> { stream }

    func activate() throws {
        activateCallCount += 1
        if let activateError { throw activateError }
    }

    func deactivate() {
        deactivateCallCount += 1
    }

    /// Test-only hook to simulate a real interruption/route-change event.
    func emit(_ event: AudioSessionEvent) {
        continuation.yield(event)
    }
}

final class MockSpeechTranscriptionService: SpeechTranscriptionServicing {
    var startError: Error?
    var transcriptUpdates: [String] = ["Test transcript"]
    var stopTranscriptResult = "final transcript"
    private(set) var startCallCount = 0
    private(set) var stopCallCount = 0
    private(set) var cancelCallCount = 0

    func startTranscribing() throws -> AsyncThrowingStream<String, Error> {
        startCallCount += 1
        if let startError {
            throw startError
        }
        let updates = transcriptUpdates
        return AsyncThrowingStream { continuation in
            for update in updates {
                continuation.yield(update)
            }
            continuation.finish()
        }
    }

    @discardableResult
    func stopTranscribing() -> String {
        stopCallCount += 1
        return stopTranscriptResult
    }

    func cancel() {
        cancelCallCount += 1
    }
}

final class MockSpeechSynthesizer: SpeechSynthesizing {
    private(set) var spokenTexts: [String] = []
    private(set) var stopCallCount = 0

    func speak(_ text: String) async {
        spokenTexts.append(text)
    }

    func stopSpeaking() {
        stopCallCount += 1
    }
}
