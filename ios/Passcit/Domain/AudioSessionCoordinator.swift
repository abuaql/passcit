import AVFAudio

enum AudioSessionEvent: Equatable {
    case interrupted
    case resumed
    case routeChanged
}

/// Configures the shared AVAudioSession for record+playback (Reading and
/// Civics record, Writing plays a spoken sentence via TTS) and surfaces
/// interruption/route-change events as a stream. Deliberately does NOT
/// reach into a SpeechTranscriptionServicing itself to cancel anything —
/// that's the future InterviewViewModel's (Stage 13C) job, so this stays
/// a self-contained, independently testable piece.
protocol AudioSessionCoordinating: AnyObject {
    var events: AsyncStream<AudioSessionEvent> { get }
    func activate() throws
    func deactivate()
}

/// Pulls the "which event does this interruption notification mean" logic
/// out into a pure function — testable with a plain userInfo dictionary,
/// no live AVAudioSession or real interruption required.
enum AudioInterruptionParser {
    static func event(forInterruptionUserInfo userInfo: [AnyHashable: Any]?) -> AudioSessionEvent? {
        guard let typeValue = userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return nil
        }
        switch type {
        case .began:
            return .interrupted
        case .ended:
            return .resumed
        @unknown default:
            return nil
        }
    }
}

final class AudioSessionCoordinator: AudioSessionCoordinating {
    private let session = AVAudioSession.sharedInstance()
    private var continuation: AsyncStream<AudioSessionEvent>.Continuation?
    private var notificationTokens: [NSObjectProtocol] = []

    lazy var events: AsyncStream<AudioSessionEvent> = AsyncStream { [weak self] continuation in
        self?.continuation = continuation
        self?.observeNotifications()
    }

    func activate() throws {
        try session.setCategory(.playAndRecord, mode: .spokenAudio, options: [.defaultToSpeaker, .allowBluetoothHFP])
        try session.setActive(true, options: .notifyOthersOnDeactivation)
    }

    func deactivate() {
        try? session.setActive(false, options: .notifyOthersOnDeactivation)
    }

    private func observeNotifications() {
        let interruption = NotificationCenter.default.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: session,
            queue: .main
        ) { [weak self] notification in
            guard let event = AudioInterruptionParser.event(forInterruptionUserInfo: notification.userInfo) else { return }
            self?.continuation?.yield(event)
        }
        let routeChange = NotificationCenter.default.addObserver(
            forName: AVAudioSession.routeChangeNotification,
            object: session,
            queue: .main
        ) { [weak self] _ in
            self?.continuation?.yield(.routeChanged)
        }
        notificationTokens = [interruption, routeChange]
    }

    deinit {
        notificationTokens.forEach { NotificationCenter.default.removeObserver($0) }
        continuation?.finish()
    }
}
