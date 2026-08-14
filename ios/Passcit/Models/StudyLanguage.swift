import Foundation

// Matches the backend's StudyLanguage Prisma enum exactly, ported 1:1
// from the old web app's src/lib/ai/languages.ts (STUDY_LANGUAGES) — same
// 12 languages, same speechTag/rtl metadata. The official USCIS question
// and answer are always shown in English regardless of this selection.
enum StudyLanguage: String, Codable, Equatable, CaseIterable, Identifiable {
    case en = "EN"
    case ar = "AR"
    case es = "ES"
    case hi = "HI"
    case ur = "UR"
    case fr = "FR"
    case pt = "PT"
    case zh = "ZH"
    case ru = "RU"
    case ko = "KO"
    case vi = "VI"
    case tl = "TL"

    var id: String { rawValue }

    var englishName: String {
        switch self {
        case .en: return "English"
        case .ar: return "Arabic"
        case .es: return "Spanish"
        case .hi: return "Hindi"
        case .ur: return "Urdu"
        case .fr: return "French"
        case .pt: return "Portuguese"
        case .zh: return "Chinese (Simplified)"
        case .ru: return "Russian"
        case .ko: return "Korean"
        case .vi: return "Vietnamese"
        case .tl: return "Tagalog"
        }
    }

    /// Endonym, shown in the picker so speakers recognise their own language.
    var nativeName: String {
        switch self {
        case .en: return "English"
        case .ar: return "العربية"
        case .es: return "Español"
        case .hi: return "हिन्दी"
        case .ur: return "اردو"
        case .fr: return "Français"
        case .pt: return "Português"
        case .zh: return "中文"
        case .ru: return "Русский"
        case .ko: return "한국어"
        case .vi: return "Tiếng Việt"
        case .tl: return "Tagalog"
        }
    }

    /// BCP-47 tag used to choose a speech-synthesis voice.
    var speechTag: String {
        switch self {
        case .en: return "en-US"
        case .ar: return "ar-SA"
        case .es: return "es-ES"
        case .hi: return "hi-IN"
        case .ur: return "ur-PK"
        case .fr: return "fr-FR"
        case .pt: return "pt-BR"
        case .zh: return "zh-CN"
        case .ru: return "ru-RU"
        case .ko: return "ko-KR"
        case .vi: return "vi-VN"
        case .tl: return "fil-PH"
        }
    }

    /// Right-to-left script — generated content must be rendered
    /// right-to-left. Never applied to the official English content.
    var rtl: Bool {
        self == .ar || self == .ur
    }
}
