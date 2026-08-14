import AVFAudio

/// Text-to-speech playback — used by the Writing section to read a
/// sentence aloud (the applicant writes what they hear, matching the
/// real USCIS writing test), and optionally to read Civics questions
/// aloud for realism. Never touches accepted-answer text.
protocol SpeechSynthesizing: AnyObject {
    func speak(_ text: String) async
    func stopSpeaking()
}

/// Multi-language variant used by the Learn tab's Study Panel "Listen"
/// button — unlike Interview's fixed en-US voice (chosen once at init),
/// the study language can change at any time via the language picker, so
/// the voice is resolved fresh on every call from a BCP-47 tag (see
/// StudyLanguage.speechTag).
protocol StudySpeechSynthesizing: AnyObject {
    func speak(_ text: String, languageCode: String) async
    func stopSpeaking()
}

/// The properties this module actually needs from a system voice —
/// lets voice *selection* be tested with lightweight mocks instead of
/// real AVSpeechSynthesisVoice instances, whose quality tier can't be
/// constructed by hand (it reflects what's actually installed).
protocol SpeechVoiceCandidate {
    var language: String { get }
    var quality: AVSpeechSynthesisVoiceQuality { get }
}

extension AVSpeechSynthesisVoice: SpeechVoiceCandidate {}

/// Picks the least robotic-sounding voice actually available on THIS
/// device, without ever hardcoding a voice identifier (one device's
/// downloaded Enhanced/Premium voice identifier may not exist on
/// another). Apple ships every system voice in one of three quality
/// tiers — .default (compact, always present, the flat/robotic-sounding
/// one), .enhanced, and .premium (both optional downloads under
/// Settings > Accessibility > Spoken Content > Voices) — so preferring
/// the highest tier actually installed is what makes the same code
/// sound noticeably better on a device that has one downloaded, while
/// still working everywhere else.
enum SpeechVoiceSelector {
    static func selectBest<T: SpeechVoiceCandidate>(from candidates: [T], language: String) -> T? {
        let matching = candidates.filter { $0.language == language }
        if let premium = matching.first(where: { $0.quality == .premium }) {
            return premium
        }
        if let enhanced = matching.first(where: { $0.quality == .enhanced }) {
            return enhanced
        }
        return matching.first
    }
}

final class SpeechSynthesizer: NSObject, SpeechSynthesizing, StudySpeechSynthesizing {
    // AVSpeechSynthesizer isn't Sendable, but this class only ever touches
    // it from the main actor in practice (speak/stopSpeaking are called
    // from a @MainActor ViewModel, and the delegate callbacks below run on
    // the same runloop AVSpeechSynthesizer itself uses) — same escape
    // hatch already used for APIClient.refreshHandler. AVSpeechSynthesisVoice
    // itself is Sendable, so `voice` needs no such annotation.
    private nonisolated(unsafe) let synthesizer = AVSpeechSynthesizer()
    private let voice: AVSpeechSynthesisVoice?
    private var continuation: CheckedContinuation<Void, Never>?

    // A measured, conversational pace rather than Apple's raw default —
    // closer to how an officer actually reads a sentence for someone to
    // transcribe than to a fast announcement readout.
    private static let speakingRate = AVSpeechUtteranceDefaultSpeechRate * 0.92
    private static let pitchMultiplier: Float = 1.0
    private static let volume: Float = 1.0
    // A short, natural beat before/after the sentence — not a dramatic
    // pause, just enough that it doesn't sound like it's mid-sentence
    // already or get cut off at the end.
    private static let utteranceEdgeDelay: TimeInterval = 0.25

    override init() {
        voice = Self.preferredVoice()
        super.init()
        synthesizer.delegate = self
    }

    func speak(_ text: String) async {
        await speakUtterance(text, voice: voice)
    }

    // StudySpeechSynthesizing conformance — resolves a voice fresh on
    // every call (the study language can change between calls, unlike
    // Interview's fixed `voice` picked once at init), falling back to
    // whatever system default AVSpeechSynthesisVoice offers for the
    // language exactly like preferredVoice() does for en-US.
    func speak(_ text: String, languageCode: String) async {
        let voice = SpeechVoiceSelector.selectBest(from: AVSpeechSynthesisVoice.speechVoices(), language: languageCode)
            ?? AVSpeechSynthesisVoice(language: languageCode)
        await speakUtterance(text, voice: voice)
    }

    private func speakUtterance(_ text: String, voice: AVSpeechSynthesisVoice?) async {
        stopSpeaking()
        await withCheckedContinuation { continuation in
            self.continuation = continuation
            let utterance = AVSpeechUtterance(string: text)
            utterance.voice = voice
            utterance.rate = Self.speakingRate
            utterance.pitchMultiplier = Self.pitchMultiplier
            utterance.volume = Self.volume
            utterance.preUtteranceDelay = Self.utteranceEdgeDelay
            utterance.postUtteranceDelay = Self.utteranceEdgeDelay
            synthesizer.speak(utterance)
        }
    }

    func stopSpeaking() {
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }
        resumeContinuationIfNeeded()
    }

    private func resumeContinuationIfNeeded() {
        continuation?.resume()
        continuation = nil
    }

    /// The best en-US voice this device actually has installed, or nil
    /// if the system can't offer one at all (AVSpeechSynthesizer falls
    /// back to its own current default in that case — speak() still
    /// works, it just uses whatever voice the system provides).
    static func preferredVoice(from voices: [AVSpeechSynthesisVoice] = AVSpeechSynthesisVoice.speechVoices()) -> AVSpeechSynthesisVoice? {
        SpeechVoiceSelector.selectBest(from: voices, language: "en-US") ?? AVSpeechSynthesisVoice(language: "en-US")
    }
}

extension SpeechSynthesizer: AVSpeechSynthesizerDelegate {
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        resumeContinuationIfNeeded()
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        resumeContinuationIfNeeded()
    }
}
