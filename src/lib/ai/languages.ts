import type { StudyLanguage } from "@/generated/prisma/client";

export interface StudyLanguageInfo {
  code: StudyLanguage;
  /** Name in English, for aria labels and prompts sent to the model. */
  englishName: string;
  /** Endonym, shown in the picker so speakers recognise their own language. */
  nativeName: string;
  /** BCP-47 tag used to choose a speech-synthesis voice. */
  speechTag: string;
  /** Right-to-left script — generated content must be rendered with dir="rtl". */
  rtl: boolean;
}

export const DEFAULT_STUDY_LANGUAGE: StudyLanguage = "EN";

export const STUDY_LANGUAGES: readonly StudyLanguageInfo[] = [
  { code: "EN", englishName: "English", nativeName: "English", speechTag: "en-US", rtl: false },
  { code: "AR", englishName: "Arabic", nativeName: "العربية", speechTag: "ar-SA", rtl: true },
  { code: "ES", englishName: "Spanish", nativeName: "Español", speechTag: "es-ES", rtl: false },
  { code: "HI", englishName: "Hindi", nativeName: "हिन्दी", speechTag: "hi-IN", rtl: false },
  { code: "UR", englishName: "Urdu", nativeName: "اردو", speechTag: "ur-PK", rtl: true },
  { code: "FR", englishName: "French", nativeName: "Français", speechTag: "fr-FR", rtl: false },
  { code: "PT", englishName: "Portuguese", nativeName: "Português", speechTag: "pt-BR", rtl: false },
  { code: "ZH", englishName: "Chinese (Simplified)", nativeName: "中文", speechTag: "zh-CN", rtl: false },
  { code: "RU", englishName: "Russian", nativeName: "Русский", speechTag: "ru-RU", rtl: false },
  { code: "KO", englishName: "Korean", nativeName: "한국어", speechTag: "ko-KR", rtl: false },
  { code: "VI", englishName: "Vietnamese", nativeName: "Tiếng Việt", speechTag: "vi-VN", rtl: false },
  { code: "TL", englishName: "Tagalog", nativeName: "Tagalog", speechTag: "fil-PH", rtl: false },
];

const BY_CODE = new Map(STUDY_LANGUAGES.map((l) => [l.code, l]));

export function studyLanguageInfo(code: StudyLanguage): StudyLanguageInfo {
  return BY_CODE.get(code) ?? BY_CODE.get(DEFAULT_STUDY_LANGUAGE)!;
}

/** Narrows an untrusted string (query param, localStorage value) to a known language. */
export function isStudyLanguage(value: string): value is StudyLanguage {
  return BY_CODE.has(value as StudyLanguage);
}
