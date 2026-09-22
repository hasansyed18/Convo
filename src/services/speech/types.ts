// Speech Recognition & Synthesis Types and Provider Abstraction

export type RecognitionState =
  | "IDLE"
  | "LISTENING"
  | "PROCESSING"
  | "SUCCESS"
  | "ERROR";

export type SpeechErrorCode =
  | "not-allowed"
  | "no-speech"
  | "audio-capture"
  | "network"
  | "aborted"
  | "language-not-supported"
  | "unsupported-browser"
  | "unknown";

export interface SpeechPhrase {
  label: string;
  emoji: string;
}

export interface SpeechLanguage {
  code: string;
  label: string;
  flag: string;
  quickPhrases: SpeechPhrase[];
}

export const SUPPORTED_SPEECH_LANGUAGES: SpeechLanguage[] = [
  {
    code: "en-IN",
    label: "English (India)",
    flag: "🇮🇳",
    quickPhrases: [
      { label: "Hello, nice to meet you!", emoji: "👋" },
      { label: "Could you please help me?", emoji: "🙏" },
      { label: "Yes, I understand.", emoji: "✅" },
      { label: "No, that's okay.", emoji: "❌" },
      { label: "Please write it down for me.", emoji: "✍️" },
      { label: "Could you speak a bit slower?", emoji: "🗣️" },
    ],
  },
  {
    code: "hi-IN",
    label: "Hindi (हिन्दी)",
    flag: "🇮🇳",
    quickPhrases: [
      { label: "नमस्ते, आपसे मिलकर अच्छा लगा!", emoji: "👋" },
      { label: "क्या आप मेरी मदद कर सकते हैं?", emoji: "🙏" },
      { label: "हाँ, मैं समझ गया।", emoji: "✅" },
      { label: "नहीं, धन्यवाद।", emoji: "❌" },
      { label: "कृपया इसे लिखकर बताएं।", emoji: "✍️" },
      { label: "कृपया थोड़ा धीरे बोलें।", emoji: "🗣️" },
    ],
  },
  {
    code: "en-US",
    label: "English (US)",
    flag: "🇺🇸",
    quickPhrases: [
      { label: "Hello, how are you?", emoji: "👋" },
      { label: "Can you please assist me?", emoji: "🙏" },
      { label: "Yes, I understand.", emoji: "✅" },
      { label: "No, thank you.", emoji: "❌" },
      { label: "Please write that down for me.", emoji: "✍️" },
      { label: "Could you speak more slowly?", emoji: "🗣️" },
    ],
  },
  {
    code: "ta-IN",
    label: "Tamil (தமிழ்)",
    flag: "🇮🇳",
    quickPhrases: [
      { label: "வணக்கம், உங்களை சந்தித்ததில் மகிழ்ச்சி!", emoji: "👋" },
      { label: "எனக்கு கொஞ்சம் உதவ முடியுமா?", emoji: "🙏" },
      { label: "ஆம், எனக்கு புரிகிறது.", emoji: "✅" },
      { label: "இல்லை, நன்றி.", emoji: "❌" },
      { label: "தயவுசெய்து எழுதி காட்டுங்கள்.", emoji: "✍️" },
      { label: "கொஞ்சம் மெதுவாக பேசுங்கள்.", emoji: "🗣️" },
    ],
  },
  {
    code: "te-IN",
    label: "Telugu (తెలుగు)",
    flag: "🇮🇳",
    quickPhrases: [
      { label: "నమస్కారం, మిమ్మల్ని కలవడం సంతోషం!", emoji: "👋" },
      { label: "దయచేసి నాకు సహాయం చేస్తారా?", emoji: "🙏" },
      { label: "అవును, నాకు అర్థమైంది.", emoji: "✅" },
      { label: "వద్దు, ధన్యవాదాలు.", emoji: "❌" },
      { label: "దయచేసి రాసి చూపించండి.", emoji: "✍️" },
      { label: "దయచేసి కొంచెం నెమ్మదిగా మాట్లాడండి.", emoji: "🗣️" },
    ],
  },
  {
    code: "bn-IN",
    label: "Bengali (বাংলা)",
    flag: "🇮🇳",
    quickPhrases: [
      { label: "নমস্কার, আপনার সাথে দেখা হয়ে ভালো লাগলো!", emoji: "👋" },
      { label: "আপনি কি আমাকে সাহায্য করতে পারেন?", emoji: "🙏" },
      { label: "হ্যাঁ, আমি বুঝতে পেরেছি।", emoji: "✅" },
      { label: "না, ধন্যবাদ।", emoji: "❌" },
      { label: "দয়া করে লিখে দিন।", emoji: "✍️" },
      { label: "দয়া করে একটু আস্তে কথা বলুন।", emoji: "🗣️" },
    ],
  },
  {
    code: "mr-IN",
    label: "Marathi (मराठी)",
    flag: "🇮🇳",
    quickPhrases: [
      { label: "नमस्कार, तुम्हाला भेटून आनंद झाला!", emoji: "👋" },
      { label: "कृपया मला मदत करू शकता का?", emoji: "🙏" },
      { label: "होय, मला समजले.", emoji: "✅" },
      { label: "नाही, धन्यवाद.", emoji: "❌" },
      { label: "कृपया मला लिहून दाखवा.", emoji: "✍️" },
      { label: "कृपया थोडे हळू बोला.", emoji: "🗣️" },
    ],
  },
  {
    code: "kn-IN",
    label: "Kannada (ಕನ್ನಡ)",
    flag: "🇮🇳",
    quickPhrases: [
      { label: "ನಮಸ್ಕಾರ, ನಿಮ್ಮನ್ನು ಭೇಟಿಯಾಗಲು ಸಂತೋಷವಾಗಿದೆ!", emoji: "👋" },
      { label: "ದಯವಿಟ್ಟು ನನಗೆ ಸಹಾಯ ಮಾಡುವಿರಾ?", emoji: "🙏" },
      { label: "ಹೌದು, ನನಗೆ ಅರ್ಥವಾಯಿತು.", emoji: "✅" },
      { label: "ಇಲ್ಲ, ಧನ್ಯವಾದಗಳು.", emoji: "❌" },
      { label: "ದಯವಿಟ್ಟು ಬರೆದು ತೋರಿಸಿ.", emoji: "✍️" },
      { label: "ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ನಿಧಾನವಾಗಿ ಮಾತನಾಡಿ.", emoji: "🗣️" },
    ],
  },
  {
    code: "ml-IN",
    label: "Malayalam (മലയാളം)",
    flag: "🇮🇳",
    quickPhrases: [
      { label: "നമസ്കാരം, കണ്ടതിൽ സന്തോഷം!", emoji: "👋" },
      { label: "ദയവായി എന്നെ സഹായിക്കാമോ?", emoji: "🙏" },
      { label: "അതെ, എനിക്ക് മനസ്സിലായി.", emoji: "✅" },
      { label: "വേണ്ട, നന്ദി.", emoji: "❌" },
      { label: "ദയവായി എഴുതി കാണിക്കൂ.", emoji: "✍️" },
      { label: "ദയവായി കുറച്ച് പതുക്കെ സംസാരിക്കാമോ?", emoji: "🗣️" },
    ],
  },
  {
    code: "gu-IN",
    label: "Gujarati (ગુજરાતી)",
    flag: "🇮🇳",
    quickPhrases: [
      { label: "નમસ્તે, તમને મળીને આનંદ થયો!", emoji: "👋" },
      { label: "શું તમે મને મદદ કરી શકો છો?", emoji: "🙏" },
      { label: "હા, મને સમજાયું.", emoji: "✅" },
      { label: "ના, આભાર.", emoji: "❌" },
      { label: "કૃપા કરીને લખીને બતાવો.", emoji: "✍️" },
      { label: "કૃપા કરીને થોડું ધીમે બોલો.", emoji: "🗣️" },
    ],
  },
  {
    code: "es-ES",
    label: "Spanish (Español)",
    flag: "🇪🇸",
    quickPhrases: [
      { label: "¡Hola, mucho gusto!", emoji: "👋" },
      { label: "¿Podría ayudarme, por favor?", emoji: "🙏" },
      { label: "Sí, entiendo perfectamente.", emoji: "✅" },
      { label: "No, muchas gracias.", emoji: "❌" },
      { label: "Por favor, escríbalo para mí.", emoji: "✍️" },
      { label: "¿Puede hablar un poco más despacio?", emoji: "🗣️" },
    ],
  },
  {
    code: "fr-FR",
    label: "French (Français)",
    flag: "🇫🇷",
    quickPhrases: [
      { label: "Bonjour, ravi de vous rencontrer !", emoji: "👋" },
      { label: "Pouvez-vous m'aider, s'il vous plaît ?", emoji: "🙏" },
      { label: "Oui, je comprends.", emoji: "✅" },
      { label: "Non, merci beaucoup.", emoji: "❌" },
      { label: "Veuillez l'écrire pour moi.", emoji: "✍️" },
      { label: "Pouvez-vous parler plus lentement ?", emoji: "🗣️" },
    ],
  },
  {
    code: "de-DE",
    label: "German (Deutsch)",
    flag: "🇩🇪",
    quickPhrases: [
      { label: "Hallo, freut mich, Sie kennenzulernen!", emoji: "👋" },
      { label: "Können Sie mir bitte helfen?", emoji: "🙏" },
      { label: "Ja, ich verstehe.", emoji: "✅" },
      { label: "Nein, vielen Dank.", emoji: "❌" },
      { label: "Bitte schreiben Sie es für mich auf.", emoji: "✍️" },
      { label: "Könnten Sie bitte etwas langsamer sprechen?", emoji: "🗣️" },
    ],
  },
  {
    code: "ar-SA",
    label: "Arabic (العربية)",
    flag: "🇸🇦",
    quickPhrases: [
      { label: "مرحباً، يسعدني لقاؤك!", emoji: "👋" },
      { label: "هل يمكنك مساعدتي من فضلك؟", emoji: "🙏" },
      { label: "نعم، أنا أفهم ذلك.", emoji: "✅" },
      { label: "لا، شكراً جزيلاً.", emoji: "❌" },
      { label: "يرجى كتابتها لي من فضلك.", emoji: "✍️" },
      { label: "هل يمكنك التحدث ببطء أكثر؟", emoji: "🗣️" },
    ],
  },
  {
    code: "ja-JP",
    label: "Japanese (日本語)",
    flag: "🇯🇵",
    quickPhrases: [
      { label: "こんにちは、はじめまして！", emoji: "👋" },
      { label: "手伝っていただけますか？", emoji: "🙏" },
      { label: "はい、理解しました。", emoji: "✅" },
      { label: "いいえ、大丈夫です。", emoji: "❌" },
      { label: "書いていただけますか？", emoji: "✍️" },
      { label: "もう少しゆっくり話していただけますか？", emoji: "🗣️" },
    ],
  },
  {
    code: "en-GB",
    label: "English (UK)",
    flag: "🇬🇧",
    quickPhrases: [
      { label: "Hello, lovely to meet you!", emoji: "👋" },
      { label: "Could you please assist me?", emoji: "🙏" },
      { label: "Yes, I understand.", emoji: "✅" },
      { label: "No, thank you.", emoji: "❌" },
      { label: "Could you please write that down?", emoji: "✍️" },
      { label: "Could you speak a little slower, please?", emoji: "🗣️" },
    ],
  },
];

export interface SpeechRecognitionCallbacks {
  onStateChange: (state: RecognitionState) => void;
  onInterimResult: (transcript: string, confidence: number) => void;
  onFinalResult: (transcript: string, confidence: number) => void;
  onError: (errorCode: SpeechErrorCode, message: string) => void;
  onEnd: () => void;
}

export interface SpeechRecognitionProviderOptions {
  language: string;
  continuous?: boolean;
  interimResults?: boolean;
  callbacks: SpeechRecognitionCallbacks;
}

export interface SpeechRecognitionProvider {
  readonly id: string;
  readonly name: string;
  isAvailable(): boolean;
  start(options: SpeechRecognitionProviderOptions): Promise<boolean>;
  stop(): Promise<void>;
  abort(): Promise<void>;
  setLanguage(lang: string): void;
}

