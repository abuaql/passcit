import Testing
import AVFAudio
@testable import Passcit

@Suite("AudioInterruptionParser")
struct AudioSessionCoordinatorTests {

    @Test func interruptionBeganMapsToInterrupted() {
        let userInfo: [AnyHashable: Any] = [
            AVAudioSessionInterruptionTypeKey: AVAudioSession.InterruptionType.began.rawValue,
        ]
        #expect(AudioInterruptionParser.event(forInterruptionUserInfo: userInfo) == .interrupted)
    }

    @Test func interruptionEndedMapsToResumed() {
        let userInfo: [AnyHashable: Any] = [
            AVAudioSessionInterruptionTypeKey: AVAudioSession.InterruptionType.ended.rawValue,
        ]
        #expect(AudioInterruptionParser.event(forInterruptionUserInfo: userInfo) == .resumed)
    }

    @Test func missingUserInfoYieldsNoEvent() {
        #expect(AudioInterruptionParser.event(forInterruptionUserInfo: nil) == nil)
    }

    @Test func malformedUserInfoYieldsNoEvent() {
        let userInfo: [AnyHashable: Any] = [AVAudioSessionInterruptionTypeKey: "not a number"]
        #expect(AudioInterruptionParser.event(forInterruptionUserInfo: userInfo) == nil)
    }

    @Test func routeChangeEventIsDistinctFromInterruptionEvents() {
        // Documents the third case exists and is distinct — the real
        // AudioSessionCoordinator yields .routeChanged directly from the
        // routeChangeNotification observer (no parsing needed, unlike
        // interruption which carries a type payload).
        #expect(AudioSessionEvent.routeChanged != .interrupted)
        #expect(AudioSessionEvent.routeChanged != .resumed)
    }
}
