import Testing
import AVFAudio
import Speech
@testable import Passcit

@Suite("AudioPermissionCoordinator.combine")
struct AudioPermissionCoordinatorTests {

    @Test func grantedOnlyWhenBothMicrophoneAndSpeechAreAuthorized() {
        let status = AudioPermissionCoordinator.combine(microphone: .granted, speech: .authorized)
        #expect(status == .granted)
    }

    @Test func deniedWhenMicrophoneIsDeniedEvenIfSpeechIsAuthorized() {
        let status = AudioPermissionCoordinator.combine(microphone: .denied, speech: .authorized)
        #expect(status == .denied)
    }

    @Test func deniedWhenSpeechIsDeniedEvenIfMicrophoneIsGranted() {
        let status = AudioPermissionCoordinator.combine(microphone: .granted, speech: .denied)
        #expect(status == .denied)
    }

    @Test func deniedWhenSpeechIsRestricted() {
        let status = AudioPermissionCoordinator.combine(microphone: .granted, speech: .restricted)
        #expect(status == .denied)
    }

    @Test func notDeterminedWhenMicrophoneIsUndeterminedAndSpeechIsNotDenied() {
        let status = AudioPermissionCoordinator.combine(microphone: .undetermined, speech: .notDetermined)
        #expect(status == .notDetermined)
    }

    @Test func notDeterminedWhenSpeechIsUndeterminedButMicrophoneIsGranted() {
        let status = AudioPermissionCoordinator.combine(microphone: .granted, speech: .notDetermined)
        #expect(status == .notDetermined)
    }

    @Test func deniedTakesPriorityOverUndetermined() {
        // Microphone denied, speech not yet asked — must not report
        // .notDetermined (which would prompt again for something already denied).
        let status = AudioPermissionCoordinator.combine(microphone: .denied, speech: .notDetermined)
        #expect(status == .denied)
    }
}
