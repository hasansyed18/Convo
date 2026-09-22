import { BrowserSpeechRecognitionProvider } from "./providers/BrowserSpeechRecognitionProvider";
import { RemoteSTTProvider } from "./providers/RemoteSTTProvider";
import type {
  RecognitionState,
  SpeechRecognitionCallbacks,
  SpeechRecognitionProvider,
} from "./types";

export class SpeechRecognitionManager {
  private providers: Map<string, SpeechRecognitionProvider> = new Map();
  private activeProviderId: string;
  private state: RecognitionState = "IDLE";
  private currentLanguage = "en-IN";
  private activeCallbacks: Partial<SpeechRecognitionCallbacks> = {};

  constructor() {
    const browserProvider = new BrowserSpeechRecognitionProvider();
    const remoteProvider = new RemoteSTTProvider();

    this.providers.set(browserProvider.id, browserProvider);
    this.providers.set(remoteProvider.id, remoteProvider);

    // Default to browser provider if supported
    this.activeProviderId = browserProvider.isAvailable()
      ? browserProvider.id
      : remoteProvider.id;
  }

  public getProviders(): SpeechRecognitionProvider[] {
    return Array.from(this.providers.values());
  }

  public getActiveProvider(): SpeechRecognitionProvider {
    return this.providers.get(this.activeProviderId) || this.providers.values().next().value!;
  }

  public setProvider(providerId: string): boolean {
    if (this.providers.has(providerId)) {
      this.activeProviderId = providerId;
      return true;
    }
    return false;
  }

  public getState(): RecognitionState {
    return this.state;
  }

  public getLanguage(): string {
    return this.currentLanguage;
  }

  public setLanguage(lang: string): void {
    this.currentLanguage = lang;
    const provider = this.getActiveProvider();
    provider.setLanguage(lang);
  }

  public async start(callbacks: SpeechRecognitionCallbacks): Promise<boolean> {
    const provider = this.getActiveProvider();
    this.activeCallbacks = callbacks;

    if (!provider.isAvailable()) {
      this.setState("ERROR");
      callbacks.onError(
        "unsupported-browser",
        `Selected speech provider (${provider.name}) is not supported in this browser.`
      );
      return false;
    }

    const providerCallbacks: SpeechRecognitionCallbacks = {
      onStateChange: (newState) => {
        this.setState(newState);
        callbacks.onStateChange(newState);
      },
      onInterimResult: (transcript, confidence) => {
        callbacks.onInterimResult(transcript, confidence);
      },
      onFinalResult: (transcript, confidence) => {
        callbacks.onFinalResult(transcript, confidence);
      },
      onError: (errorCode, message) => {
        this.setState("ERROR");
        callbacks.onError(errorCode, message);
      },
      onEnd: () => {
        if (this.state !== "ERROR" && this.state !== "SUCCESS") {
          this.setState("IDLE");
        }
        callbacks.onEnd();
      },
    };

    return provider.start({
      language: this.currentLanguage,
      continuous: false,
      interimResults: true,
      callbacks: providerCallbacks,
    });
  }

  public async stop(): Promise<void> {
    const provider = this.getActiveProvider();
    await provider.stop();
    this.setState("IDLE");
  }

  public async abort(): Promise<void> {
    const provider = this.getActiveProvider();
    await provider.abort();
    this.setState("IDLE");
  }

  private setState(newState: RecognitionState) {
    this.state = newState;
    if (this.activeCallbacks.onStateChange) {
      this.activeCallbacks.onStateChange(newState);
    }
  }
}

export const speechRecognitionManager = new SpeechRecognitionManager();
