import type {
  SpeechErrorCode,
  SpeechRecognitionProvider,
  SpeechRecognitionProviderOptions,
} from "../types";

type SpeechRecognitionConstructor = new () => ISpeechRecognitionInstance;

interface ISpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
        confidence?: number;
      };
    };
  };
}

interface IWindowWithSpeech extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export class BrowserSpeechRecognitionProvider implements SpeechRecognitionProvider {
  public readonly id = "browser-speech-api";
  public readonly name = "Browser Web Speech API";

  private recognitionInstance: ISpeechRecognitionInstance | null = null;
  private currentLanguage = "en-US";
  private activeCallbacks: SpeechRecognitionProviderOptions["callbacks"] | null = null;
  private activeOptions: SpeechRecognitionProviderOptions | null = null;
  private isRunning = false;
  private pendingInterimText = "";
  private restartTimeout: ReturnType<typeof setTimeout> | null = null;

  public isAvailable(): boolean {
    if (typeof window === "undefined") return false;
    const win = window as IWindowWithSpeech;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  public isMobileDevice(): boolean {
    if (typeof navigator === "undefined") return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  public async checkMicrophonePermission(): Promise<"granted" | "denied" | "prompt" | "unknown"> {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
        return status.state;
      }
    } catch {
      // permissions API not supported for microphone on some browsers
    }
    return "unknown";
  }

  public async start(options: SpeechRecognitionProviderOptions): Promise<boolean> {
    if (!this.isAvailable()) {
      options.callbacks.onError(
        "unsupported-browser",
        "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari."
      );
      options.callbacks.onStateChange("ERROR");
      return false;
    }

    // Stop any existing session cleanly
    if (this.isRunning) {
      await this.stop();
    }

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    this.activeCallbacks = options.callbacks;
    this.activeOptions = options;
    this.currentLanguage = options.language || this.currentLanguage;
    this.pendingInterimText = "";
    this.isRunning = true;

    return this.initAndStartInstance();
  }

  private initAndStartInstance(): boolean {
    if (!this.isRunning) return false;

    const win = window as IWindowWithSpeech;
    const RecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!RecognitionClass) {
      this.isRunning = false;
      this.activeCallbacks?.onStateChange("ERROR");
      this.activeCallbacks?.onError(
        "unsupported-browser",
        "Speech recognition is not supported in this browser."
      );
      return false;
    }

    try {
      // Clean up previous instance before creating a new one
      // (Web Speech API requires a new instance after each onend lifecycle)
      if (this.recognitionInstance) {
        this.recognitionInstance.onstart = null;
        this.recognitionInstance.onresult = null;
        this.recognitionInstance.onerror = null;
        this.recognitionInstance.onend = null;
        try {
          this.recognitionInstance.abort();
        } catch {
          // Ignore abort of ended instance
        }
        this.recognitionInstance = null;
      }

      const instance = new RecognitionClass();
      const isMobile = this.isMobileDevice();

      instance.lang = this.currentLanguage;
      // On mobile browsers (Android Chrome, iOS Safari), continuous: true causes audio
      // buffering without intermediate flushes. Single-shot with auto-restart on onend
      // ensures instantaneous responsiveness.
      instance.continuous = isMobile ? false : (this.activeOptions?.continuous ?? true);
      instance.interimResults = this.activeOptions?.interimResults ?? true;
      instance.maxAlternatives = 1;

      instance.onstart = () => {
        if (!this.isRunning) return;
        this.activeCallbacks?.onStateChange("LISTENING");
      };

      instance.onresult = (event: ISpeechRecognitionEvent) => {
        let interimText = "";
        let finalText = "";
        let confidence = 0.85;

        // Iterate through all results starting from event.resultIndex
        const startIdx = typeof event.resultIndex === "number" ? event.resultIndex : 0;

        for (let i = startIdx; i < event.results.length; ++i) {
          const item = event.results[i];
          if (!item) continue;
          const text = item[0]?.transcript || "";
          const conf = item[0]?.confidence || 0.85;
          if (conf > 0) confidence = conf;

          if (item.isFinal) {
            finalText += text;
          } else {
            interimText += text;
          }
        }

        // Secondary fallback if resultIndex skipped results on mobile Blink/WebKit engines
        if (!finalText && !interimText && event.results.length > 0) {
          for (let i = 0; i < event.results.length; ++i) {
            const item = event.results[i];
            if (!item) continue;
            const text = item[0]?.transcript || "";
            if (item.isFinal) {
              finalText += text;
            } else {
              interimText += text;
            }
          }
        }

        if (finalText.trim()) {
          this.pendingInterimText = "";
          this.activeCallbacks?.onFinalResult(finalText.trim(), Math.round(confidence * 100) / 100);
          this.activeCallbacks?.onStateChange("LISTENING");
        } else if (interimText.trim()) {
          this.pendingInterimText = interimText.trim();
          this.activeCallbacks?.onInterimResult(interimText.trim(), Math.round(confidence * 100) / 100);
        }
      };

      instance.onerror = (event: { error: string; message?: string }) => {
        // "no-speech" is a benign silence event common on mobile pauses
        if (event.error === "no-speech") {
          return;
        }

        // "aborted" is triggered on manual stop/abort
        if (event.error === "aborted") {
          return;
        }

        const errCode = this.mapErrorCode(event.error);
        const errMsg = this.getErrorMessage(errCode, event.error);

        // Permissions or service blocked: fatal error
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          this.isRunning = false;
          this.activeCallbacks?.onStateChange("ERROR");
          this.activeCallbacks?.onError(errCode, errMsg);
          return;
        }

        // Insecure context or network failure
        if (errCode === "network") {
          this.isRunning = false;
          this.activeCallbacks?.onStateChange("ERROR");
          this.activeCallbacks?.onError(errCode, errMsg);
          return;
        }
      };

      instance.onend = () => {
        // Mobile flush: If recognition ended with uncommitted interim text, commit it immediately
        if (this.pendingInterimText.trim() && this.activeCallbacks) {
          this.activeCallbacks.onFinalResult(this.pendingInterimText.trim(), 0.85);
          this.pendingInterimText = "";
        }

        // If user hasn't explicitly stopped, restart via a brand-new instance
        if (this.isRunning) {
          const delay = isMobile ? 80 : 30;
          this.restartTimeout = setTimeout(() => {
            if (this.isRunning) {
              this.initAndStartInstance();
            }
          }, delay);
          return;
        }

        this.isRunning = false;
        this.activeCallbacks?.onStateChange("IDLE");
        this.activeCallbacks?.onEnd();
      };

      this.recognitionInstance = instance;
      instance.start();
      return true;
    } catch (err: unknown) {
      if (!this.isRunning) return false;
      const message = err instanceof Error ? err.message : "Failed to start speech recognition.";
      const errCode = this.mapErrorCode(message);
      this.isRunning = false;
      this.activeCallbacks?.onStateChange("ERROR");
      this.activeCallbacks?.onError(errCode, message);
      return false;
    }
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    if (this.pendingInterimText.trim() && this.activeCallbacks) {
      this.activeCallbacks.onFinalResult(this.pendingInterimText.trim(), 0.85);
      this.pendingInterimText = "";
    }

    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.stop();
      } catch {
        // Ignore stop error
      }
    }
  }

  public async abort(): Promise<void> {
    this.isRunning = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    this.pendingInterimText = "";

    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.abort();
      } catch {
        // Ignore abort error
      }
    }
  }

  public setLanguage(lang: string): void {
    this.currentLanguage = lang;
    if (this.recognitionInstance) {
      this.recognitionInstance.lang = lang;
      // If currently listening, refresh the instance to activate the new language immediately
      if (this.isRunning) {
        this.initAndStartInstance();
      }
    }
  }

  private mapErrorCode(browserError: string): SpeechErrorCode {
    switch (browserError) {
      case "not-allowed":
      case "permission-denied":
      case "service-not-allowed":
        return "not-allowed";
      case "no-speech":
        return "no-speech";
      case "audio-capture":
        return "audio-capture";
      case "network":
        return "network";
      case "aborted":
        return "aborted";
      case "language-not-supported":
        return "language-not-supported";
      default:
        return "unknown";
    }
  }

  private getErrorMessage(code: SpeechErrorCode, raw: string): string {
    const isMobile = this.isMobileDevice();
    const isSecure = typeof window !== "undefined" && window.isSecureContext;

    switch (code) {
      case "not-allowed":
        if (!isSecure && isMobile) {
          return "Microphone access blocked. Mobile browsers require HTTPS or localhost. If testing over local network IP, please use HTTPS or deploy to Vercel.";
        }
        return "Microphone access denied. Please allow microphone permissions in your mobile/browser settings.";
      case "no-speech":
        return "No speech detected. Please speak closer to your mobile microphone.";
      case "audio-capture":
        return "Audio capture failed. Ensure your mobile microphone is not in use by another app (like phone call or voice recorder).";
      case "network":
        if (!isSecure && isMobile) {
          return "Network/Security error: Mobile speech recognition requires HTTPS. Please test via localhost or deploy to Vercel.";
        }
        return "Network error: Browser speech recognition service is temporarily unreachable.";
      case "aborted":
        return "Speech recognition was stopped.";
      case "language-not-supported":
        return "Selected language is not supported by this device's speech recognition engine.";
      default:
        return `Speech recognition error: ${raw || "Service temporarily unavailable."}`;
    }
  }
}
