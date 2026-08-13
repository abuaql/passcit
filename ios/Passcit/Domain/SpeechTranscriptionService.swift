import AVFAudio
import Speech

enum SpeechTranscriptionError: Error, Equatable {
    case recognizerUnavailable
}

/// Live speech-to-text capture for Reading and Civics (and optionally
/// Identity's local-only rehearsal). Never grades anything — it only
/// produces a transcript string; InterviewViewModel (Stage 13C) submits
/// that string to the server, which is the sole source of correctness.
protocol SpeechTranscriptionServicing: AnyObject {
    /// Starts capturing audio and transcribing it live. Each element is
    /// the latest cumulative transcript (not a delta). Ends normally when
    /// stopTranscribing()/cancel() is called, or throws if recognition
    /// itself fails mid-stream.
    func startTranscribing() throws -> AsyncThrowingStream<String, Error>
    /// Stops capture and returns the final transcript.
    @discardableResult
    func stopTranscribing() -> String
    /// Cancels capture immediately, discarding any transcript. Safe to
    /// call even if nothing is in progress (e.g. from an audio-session
    /// interruption handler).
    func cancel()
}

final class SpeechTranscriptionService: NSObject, SpeechTranscriptionServicing {
    private let audioEngine = AVAudioEngine()
    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var latestTranscript = ""

    func startTranscribing() throws -> AsyncThrowingStream<String, Error> {
        cancel() // ensure a clean slate — never two overlapping sessions

        guard let recognizer, recognizer.isAvailable else {
            throw SpeechTranscriptionError.recognizerUnavailable
        }

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        // Prefer on-device recognition when the device/locale supports it
        // — avoids a network round trip and keeps rehearsal audio off any
        // server beyond what the interview API itself already receives
        // (as a text transcript, never raw audio).
        if recognizer.supportsOnDeviceRecognition {
            request.requiresOnDeviceRecognition = true
        }
        recognitionRequest = request

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.removeTap(onBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            self?.recognitionRequest?.append(buffer)
        }

        audioEngine.prepare()
        try audioEngine.start()

        return AsyncThrowingStream { continuation in
            recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
                guard let self else { return }
                if let result {
                    self.latestTranscript = result.bestTranscription.formattedString
                    continuation.yield(self.latestTranscript)
                    if result.isFinal {
                        continuation.finish()
                    }
                }
                if let error {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { [weak self] _ in
                self?.teardownAudioEngine()
            }
        }
    }

    @discardableResult
    func stopTranscribing() -> String {
        recognitionRequest?.endAudio()
        teardownAudioEngine()
        let transcript = latestTranscript
        recognitionTask = nil
        recognitionRequest = nil
        latestTranscript = ""
        return transcript
    }

    func cancel() {
        recognitionTask?.cancel()
        teardownAudioEngine()
        recognitionTask = nil
        recognitionRequest = nil
        latestTranscript = ""
    }

    private func teardownAudioEngine() {
        if audioEngine.isRunning {
            audioEngine.stop()
        }
        audioEngine.inputNode.removeTap(onBus: 0)
    }
}
