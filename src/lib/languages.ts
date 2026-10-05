export type SttLanguageCode =
  | "bn-IN"
  | "en-IN"
  | "gu-IN"
  | "hi-IN"
  | "kn-IN"
  | "ml-IN"
  | "mr-IN"
  | "pa-IN"
  | "ta-IN"
  | "te-IN";

export type TtsLanguageCode = SttLanguageCode | "hi-en";

export interface Language {
  id: string;
  name: string;
  native: string;
  /** Prisma has no Hinglish model; its Hindi model handles code-switching. */
  stt: SttLanguageCode;
  tts: TtsLanguageCode;
  /** Timbre v2.5 voice whose preferred locale matches `tts`. */
  voice: string;
  /** How Evon should write replies so Timbre pronounces them naturally. */
  replyStyle: string;
  /** Fixed greeting used for mic checks: "Hello, I'm Bolo. Please tell me your full name." */
  sample: string;
  /** Shown under the native name in pickers instead of `name`. */
  tagline?: string;
}

export const LANGUAGES: Language[] = [
  {
    id: "hinglish",
    name: "Hinglish",
    native: "हिंदी + English",
    tagline: "Hinglish · code-mixed",
    stt: "hi-IN",
    tts: "hi-en",
    voice: "Poorvi",
    replyStyle: "conversational Hinglish: Hindi in Devanagari script, common English words kept in English",
    sample: "नमस्ते! मैं Bolo हूँ। Please अपना पूरा नाम बताइए।",
  },
  { id: "hi", name: "Hindi", native: "हिन्दी", stt: "hi-IN", tts: "hi-IN", voice: "Chitra", replyStyle: "simple spoken Hindi in Devanagari script", sample: "नमस्ते! मैं बोलो हूँ। कृपया अपना पूरा नाम बताइए।" },
  { id: "en", name: "English", native: "English", stt: "en-IN", tts: "en-IN", voice: "Trupti", replyStyle: "simple Indian English", sample: "Hello! I am Bolo. Please tell me your full name." },
  { id: "kn", name: "Kannada", native: "ಕನ್ನಡ", stt: "kn-IN", tts: "kn-IN", voice: "Kavin", replyStyle: "simple spoken Kannada in Kannada script", sample: "ನಮಸ್ಕಾರ! ನಾನು ಬೋಲೋ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರನ್ನು ಹೇಳಿ." },
  { id: "ta", name: "Tamil", native: "தமிழ்", stt: "ta-IN", tts: "ta-IN", voice: "Trisha", replyStyle: "simple spoken Tamil in Tamil script", sample: "வணக்கம்! நான் போலோ. தயவுசெய்து உங்கள் முழுப் பெயரைச் சொல்லுங்கள்." },
  { id: "te", name: "Telugu", native: "తెలుగు", stt: "te-IN", tts: "te-IN", voice: "Lehara", replyStyle: "simple spoken Telugu in Telugu script", sample: "నమస్కారం! నేను బోలో. దయచేసి మీ పూర్తి పేరు చెప్పండి." },
  { id: "bn", name: "Bengali", native: "বাংলা", stt: "bn-IN", tts: "bn-IN", voice: "Kirra", replyStyle: "simple spoken Bengali in Bengali script", sample: "নমস্কার! আমি বোলো। অনুগ্রহ করে আপনার পুরো নাম বলুন।" },
  { id: "mr", name: "Marathi", native: "मराठी", stt: "mr-IN", tts: "mr-IN", voice: "Ishaan", replyStyle: "simple spoken Marathi in Devanagari script", sample: "नमस्कार! मी बोलो. कृपया तुमचे पूर्ण नाव सांगा." },
  { id: "gu", name: "Gujarati", native: "ગુજરાતી", stt: "gu-IN", tts: "gu-IN", voice: "Falak", replyStyle: "simple spoken Gujarati in Gujarati script", sample: "નમસ્તે! હું બોલો છું. કૃપા કરીને તમારું પૂરું નામ જણાવો." },
  { id: "ml", name: "Malayalam", native: "മലയാളം", stt: "ml-IN", tts: "ml-IN", voice: "Reshma", replyStyle: "simple spoken Malayalam in Malayalam script", sample: "നമസ്കാരം! ഞാൻ ബോലോ. ദയവായി നിങ്ങളുടെ മുഴുവൻ പേര് പറയൂ." },
  { id: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ", stt: "pa-IN", tts: "pa-IN", voice: "Zayan", replyStyle: "simple spoken Punjabi in Gurmukhi script", sample: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਬੋਲੋ ਹਾਂ। ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਪੂਰਾ ਨਾਮ ਦੱਸੋ।" },
];

export const DEFAULT_LANGUAGE_ID = "hinglish";

const SCRIPT_PATTERNS: Partial<Record<SttLanguageCode, RegExp>> = {
  "hi-IN": /[\u0900-\u097F]/,
  "mr-IN": /[\u0900-\u097F]/,
  "bn-IN": /[\u0980-\u09FF]/,
  "pa-IN": /[\u0A00-\u0A7F]/,
  "gu-IN": /[\u0A80-\u0AFF]/,
  "ta-IN": /[\u0B80-\u0BFF]/,
  "te-IN": /[\u0C00-\u0C7F]/,
  "kn-IN": /[\u0C80-\u0CFF]/,
  "ml-IN": /[\u0D00-\u0D7F]/,
};

/** True when nearly every line uses the language's native script (Timbre reads native script best). */
export function usesNativeScript(lines: string[], language: Language): boolean {
  const pattern = SCRIPT_PATTERNS[language.stt];
  if (!pattern || lines.length === 0) return true;
  return lines.filter((l) => pattern.test(l)).length >= Math.ceil(lines.length * 0.8);
}

export function getLanguage(id: string): Language | undefined {
  return LANGUAGES.find((l) => l.id === id);
}
