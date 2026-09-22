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
  private currentLanguage = "en-IN";
  private activeCallbacks: SpeechRecognitionProviderOptions["callbacks"] | null = null;
  private isRunning = false;

  public isAvailable(): boolean {
    if (typeof window === "undefined") return false;
    const win = window as IWindowWithSpeech;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
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
        "Speech recognition is not supported in this browser. Please use Chrome or Edge."
      );
      options.callbacks.onStateChange("ERROR");
      return false;
    }

    // Stop any existing session
    if (this.isRunning) {
      await this.stop();
    }

    this.activeCallbacks = options.callbacks;
    this.currentLanguage = options.language || this.currentLanguage;

    const win = window as IWindowWithSpeech;
    const RecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!RecognitionClass) {
      options.callbacks.onStateChange("ERROR");
      options.callbacks.onError(
        "unsupported-browser",
        "Speech recognition is not supported in this browser."
      );
      return false;
    }

    try {
      this.recognitionInstance = new RecognitionClass();
      this.recognitionInstance.lang = this.currentLanguage;
      this.recognitionInstance.continuous = options.continuous ?? true;
      this.recognitionInstance.interimResults = options.interimResults ?? true;
      this.recognitionInstance.maxAlternatives = 1;

      this.recognitionInstance.onstart = () => {
        this.isRunning = true;
        this.activeCallbacks?.onStateChange("LISTENING");
      };

      this.recognitionInstance.onresult = (event: ISpeechRecognitionEvent) => {
        let interimText = "";
        let finalText = "";
        let confidence = 0.85;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const text = item[0]?.transcript || "";
          const conf = item[0]?.confidence || 0.85;
          if (conf > 0) confidence = conf;

          if (item.isFinal) {
            finalText += text;
          } else {
            interimText += text;
          }
        }

        if (finalText.trim()) {
          this.activeCallbacks?.onFinalResult(finalText.trim(), Math.round(confidence * 100) / 100);
          this.activeCallbacks?.onStateChange("LISTENING");
        } else if (interimText.trim()) {
          this.activeCallbacks?.onInterimResult(interimText.trim(), Math.round(confidence * 100) / 100);
        }
      };

      this.recognitionInstance.onerror = (event: { error: string; message?: string }) => {
        // "no-speech" is a benign silence event, do NOT kill state
        if (event.error === "no-speech") {
          return;
        }

        // "aborted" is triggered on manual stop/abort, do NOT treat as error
        if (event.error === "aborted") {
          this.isRunning = false;
          return;
        }

        this.isRunning = false;
        const errCode = this.mapErrorCode(event.error);
        const errMsg = this.getErrorMessage(errCode, event.error);
        this.activeCallbacks?.onStateChange("ERROR");
        this.activeCallbacks?.onError(errCode, errMsg);
      };

      this.recognitionInstance.onend = () => {
        // Auto-reconnect if continuous session is still active
        if (this.isRunning) {
          try {
            this.recognitionInstance?.start();
            return;
          } catch {
            // Cannot start immediately
          }
        }
        this.isRunning = false;
        this.activeCallbacks?.onStateChange("IDLE");
        this.activeCallbacks?.onEnd();
      };

      this.recognitionInstance.start();
      return true;
    } catch (err: unknown) {
      this.isRunning = false;
      const message = err instanceof Error ? err.message : "Failed to start speech recognition.";
      const errCode = this.mapErrorCode(message);
      options.callbacks.onStateChange("ERROR");
      options.callbacks.onError(errCode, message);
      return false;
    }
  }

  public async stop(): Promise<void> {
    if (this.recognitionInstance && this.isRunning) {
      try {
        this.recognitionInstance.stop();
      } catch {
        // Ignore stop error
      }
    }
    this.isRunning = false;
  }

  public async abort(): Promise<void> {
    if (this.recognitionInstance && this.isRunning) {
      try {
        this.recognitionInstance.abort();
      } catch {
        // Ignore abort error
      }
    }
    this.isRunning = false;
  }

  public setLanguage(lang: string): void {
    this.currentLanguage = lang;
    if (this.recognitionInstance) {
      this.recognitionInstance.lang = lang;
    }
  }

  private mapErrorCode(browserError: string): SpeechErrorCode {
    switch (browserError) {
      case "not-allowed":
      case "permission-denied":
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
    switch (code) {
      case "not-allowed":
        return "Microphone access denied. Please click the padlock/tune icon in your address bar and allow microphone permissions.";
      case "no-speech":
        return "No speech was detected. Please speak clearly into your microphone.";
      case "audio-capture":
        return "Audio capture failed. Ensure your microphone is plugged in and not in use by another application.";
      case "network":
        return "Network error: Browser speech recognition service is temporarily unreachable (Google/Edge speech endpoint).";
      case "aborted":
        return "Speech recognition was stopped.";
      case "language-not-supported":
        return "Selected language is not supported by this browser's speech recognition engine.";
      default:
        return `Speech recognition error: ${raw || "Service temporarily unavailable."}`;
    }
  }
}
