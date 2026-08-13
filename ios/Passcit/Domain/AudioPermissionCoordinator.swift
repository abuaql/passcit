import AVFAudio
import Speech

enum AudioPermissionStatus: Equatable {
    case notDetermined
    case granted
    case denied
}

// Interview's Reading/Civics sections need BOTH microphone capture and
// speech-recognition authorization — combined here into one status so a
// future InterviewViewModel (Stage 13C) has one thing to check, not two.
protocol AudioPermissionCoordinating: AnyObject {
    var currentStatus: AudioPermissionStatus { get }
    func requestPermission() async -> AudioPermissionStatus
}

final class AudioPermissionCoordinator: AudioPermissionCoordinating {
    var currentStatus: AudioPermissionStatus {
        Self.combine(
            microphone: AVAudioApplication.shared.recordPermission,
            speech: SFSpeechRecognizer.authorizationStatus()
        )
    }

    func requestPermission() async -> AudioPermissionStatus {
        let micGranted = await requestMicrophonePermission()
        let speechStatus = await requestSpeechPermission()
        return Self.combine(
            microphone: micGranted ? .granted : .denied,
            speech: speechStatus
        )
    }

    private func requestMicrophonePermission() async -> Bool {
        await withCheckedContinuation { continuation in
            AVAudioApplication.requestRecordPermission { granted in
                continuation.resume(returning: granted)
            }
        }
    }

    private func requestSpeechPermission() async -> SFSpeechRecognizerAuthorizationStatus {
        await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status)
            }
        }
    }

    /// Pure and directly testable without any real permission prompt —
    /// the async wrappers above exist only to funnel real system state
    /// into this function.
    static func combine(
        microphone: AVAudioApplication.recordPermission,
        speech: SFSpeechRecognizerAuthorizationStatus
    ) -> AudioPermissionStatus {
        if microphone == .granted, speech == .authorized {
            return .granted
        }
        if microphone == .denied || speech == .denied || speech == .restricted {
            return .denied
        }
        return .notDetermined
    }
}
