import Foundation
@testable import Passcit

/// Test double for StudySpeechSynthesizing — verifies what StudyPanelViewModel
/// asked to be spoken without touching real AVFoundation.
final class MockStudySpeechSynthesizer: StudySpeechSynthesizing {
    private(set) var spokenText: [String] = []
    private(set) var spokenLanguageCodes: [String] = []
    private(set) var stopCallCount = 0

    func speak(_ text: String, languageCode: String) async {
        spokenText.append(text)
        spokenLanguageCodes.append(languageCode)
    }

    func stopSpeaking() {
        stopCallCount += 1
    }
}
