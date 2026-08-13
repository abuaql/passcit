import Testing
import AVFAudio
@testable import Passcit

private struct MockVoiceCandidate: SpeechVoiceCandidate {
    let language: String
    let quality: AVSpeechSynthesisVoiceQuality
}

@Suite("SpeechVoiceSelector picks the least robotic-sounding installed voice")
struct SpeechVoiceSelectorTests {

    @Test func prefersPremiumOverEnhancedAndDefault() {
        let candidates = [
            MockVoiceCandidate(language: "en-US", quality: .default),
            MockVoiceCandidate(language: "en-US", quality: .enhanced),
            MockVoiceCandidate(language: "en-US", quality: .premium),
        ]
        let selected = SpeechVoiceSelector.selectBest(from: candidates, language: "en-US")
        #expect(selected?.quality == .premium)
    }

    @Test func prefersEnhancedOverDefaultWhenNoPremiumInstalled() {
        let candidates = [
            MockVoiceCandidate(language: "en-US", quality: .default),
            MockVoiceCandidate(language: "en-US", quality: .enhanced),
        ]
        let selected = SpeechVoiceSelector.selectBest(from: candidates, language: "en-US")
        #expect(selected?.quality == .enhanced)
    }

    @Test func fallsBackToDefaultQualityWhenNothingBetterIsInstalled() {
        // The realistic Simulator/fresh-device case: only the always-available
        // compact voice exists — selection must still succeed, not return nil.
        let candidates = [MockVoiceCandidate(language: "en-US", quality: .default)]
        let selected = SpeechVoiceSelector.selectBest(from: candidates, language: "en-US")
        #expect(selected?.quality == .default)
    }

    @Test func returnsNilWhenNoVoiceMatchesTheRequestedLanguage() {
        let candidates = [
            MockVoiceCandidate(language: "en-GB", quality: .premium),
            MockVoiceCandidate(language: "fr-FR", quality: .enhanced),
        ]
        let selected = SpeechVoiceSelector.selectBest(from: candidates, language: "en-US")
        #expect(selected == nil)
    }

    @Test func ignoresOtherLanguagesEvenWhenHigherQuality() {
        let candidates = [
            MockVoiceCandidate(language: "en-GB", quality: .premium),
            MockVoiceCandidate(language: "en-US", quality: .default),
        ]
        let selected = SpeechVoiceSelector.selectBest(from: candidates, language: "en-US")
        #expect(selected?.language == "en-US")
        #expect(selected?.quality == .default)
    }

    @Test func emptyCandidateListReturnsNil() {
        let selected = SpeechVoiceSelector.selectBest(from: [MockVoiceCandidate](), language: "en-US")
        #expect(selected == nil)
    }
}

@Suite("SpeechSynthesizer.preferredVoice integrates with real AVSpeechSynthesisVoice")
struct SpeechSynthesizerPreferredVoiceTests {

    @Test func picksARealEnUSVoiceWhenOneIsInTheProvidedList() throws {
        // A real system voice, not a mock — proves the generic selector
        // works against the concrete AVSpeechSynthesisVoice type used in
        // production, not just the test-only mock.
        let systemVoice = try #require(AVSpeechSynthesisVoice(language: "en-US"))
        let preferred = SpeechSynthesizer.preferredVoice(from: [systemVoice])
        #expect(preferred?.language == "en-US")
    }

    @Test func fallsBackToSystemDefaultWhenTheProvidedListHasNoEnUSVoice() {
        // Never crashes or returns nil outright — degrades to whatever
        // AVSpeechSynthesisVoice(language:) itself resolves to.
        let preferred = SpeechSynthesizer.preferredVoice(from: [])
        #expect(preferred != nil)
    }
}
