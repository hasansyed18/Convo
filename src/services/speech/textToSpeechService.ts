// Dedicated Clean Text-to-Speech Service

export interface TextToSpeechOptions {
  lang?: string;
  rate?: number; // 0.5 to 2.0 (default 1.0)
  pitch?: number; // 0.5 to 1.5 (default 1.0)
  volume?: number; // 0.0 to 1.0 (default 1.0)
  voiceIndex?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: unknown) => void;
}

export class TextToSpeechService {
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private resumeTimer: number | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isPausedState = false;

  constructor() {
    this.initVoices();
  }

  private initVoices() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.cachedVoices = window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.cachedVoices = window.speechSynthesis.getVoices();
      };
    }
  }

  public isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported()) return [];
    if (this.cachedVoices.length > 0) return this.cachedVoices;
    return window.speechSynthesis.getVoices();
  }

  public getVoicesForLanguage(langCode: string): SpeechSynthesisVoice[] {
    const all = this.getVoices();
    const prefix = langCode.split("-")[0].toLowerCase();
    return all.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  }

  public speak(text: string, options?: TextToSpeechOptions): void {
    if (!this.isSupported()) {
      console.warn("SpeechSynthesis is not supported in this browser.");
      return;
    }

    const cleanText = text?.trim();
    if (!cleanText) return;

    // 1. Unfreeze if browser synthesis is paused
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    // 2. Clear any stuck queue if currently speaking
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const targetLang = options?.lang || "en-IN";
    utterance.lang = targetLang;
    utterance.rate = options?.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = options?.volume ?? 1.0;

    // 3. Pick voice strictly matching language; never force-feed an incompatible voice
    const voices = this.getVoices();
    if (voices.length > 0) {
      if (typeof options?.voiceIndex === "number" && voices[options.voiceIndex]) {
        utterance.voice = voices[options.voiceIndex];
      } else {
        const langPrefix = targetLang.split("-")[0].toLowerCase();
        const norm = (s: string) => s.toLowerCase().replace("_", "-");

        const exactMatch = voices.find((v) => norm(v.lang) === norm(targetLang));
        const prefixMatch = voices.find((v) => norm(v.lang).startsWith(langPrefix));

        if (exactMatch) {
          utterance.voice = exactMatch;
        } else if (prefixMatch) {
          utterance.voice = prefixMatch;
        }
        // If neither, leave utterance.voice = undefined.
        // Chrome/Edge will use the native engine for targetLang.
      }
    }

    this.currentUtterance = utterance;
    this.isPausedState = false;

    // Chrome Watchdog: prevents 15-second utterance pause bug
    this.startWatchdog();

    utterance.onstart = () => {
      if (options?.onStart) options.onStart();
    };

    utterance.onend = () => {
      this.stopWatchdog();
      this.currentUtterance = null;
      this.isPausedState = false;
      if (options?.onEnd) options.onEnd();
    };

    utterance.onerror = (err) => {
      this.stopWatchdog();
      this.currentUtterance = null;
      this.isPausedState = false;
      // Do not treat deliberate cancel as fatal error
      if (options?.onError) options.onError(err);
    };

    // 4. Chrome bug fix: Delay speak by 40ms so cancel IPC finishes
    setTimeout(() => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("speechSynthesis.speak exception:", err);
      }
    }, 40);
  }

  public pause(): void {
    if (this.isSupported() && window.speechSynthesis.speaking && !this.isPausedState) {
      window.speechSynthesis.pause();
      this.isPausedState = true;
    }
  }

  public resume(): void {
    if (this.isSupported() && this.isPausedState) {
      window.speechSynthesis.resume();
      this.isPausedState = false;
    }
  }

  public cancel(): void {
    this.stopWatchdog();
    this.isPausedState = false;
    this.currentUtterance = null;
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }

  public isSpeaking(): boolean {
    return this.isSupported() && window.speechSynthesis.speaking;
  }

  public isPaused(): boolean {
    return this.isPausedState;
  }

  public getCurrentUtterance(): SpeechSynthesisUtterance | null {
    return this.currentUtterance;
  }

  private startWatchdog(): void {
    this.stopWatchdog();
    this.resumeTimer = window.setInterval(() => {
      if (typeof window !== "undefined" && window.speechSynthesis?.speaking && !this.isPausedState) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
  }

  private stopWatchdog(): void {
    if (this.resumeTimer !== null) {
      window.clearInterval(this.resumeTimer);
      this.resumeTimer = null;
    }
  }
}

export const textToSpeechService = new TextToSpeechService();
