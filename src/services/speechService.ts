// Facade uniting SpeechRecognitionManager, TextToSpeechService, and Audio Cues

import { speechRecognitionManager } from "./speech/SpeechRecognitionManager";
import { textToSpeechService, type TextToSpeechOptions } from "./speech/textToSpeechService";
import { SUPPORTED_SPEECH_LANGUAGES, type SpeechLanguage } from "./speech/types";

export type { SpeechRecognitionCallbacks, SpeechErrorCode, RecognitionState } from "./speech/types";
export { SUPPORTED_SPEECH_LANGUAGES };

export interface SpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult: (transcript: string, isFinal: boolean, confidence: number) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export type VoiceOption = SpeechLanguage;
export const SUPPORTED_LANGUAGES: VoiceOption[] = SUPPORTED_SPEECH_LANGUAGES;

class SpeechServiceFacade {
  private audioContext: AudioContext | null = null;

  public isSpeechRecognitionSupported(): boolean {
    return speechRecognitionManager.getActiveProvider().isAvailable();
  }

  public isSpeechSynthesisSupported(): boolean {
    return textToSpeechService.isSupported();
  }

  public setLanguage(langCode: string): void {
    speechRecognitionManager.setLanguage(langCode);
  }

  public getLanguage(): string {
    return speechRecognitionManager.getLanguage();
  }

  public startListening(options: SpeechRecognitionOptions): boolean {
    speechRecognitionManager.setLanguage(options.language || "en-IN");
    speechRecognitionManager.start({
      onStateChange: () => {},
      onInterimResult: (transcript, confidence) => {
        options.onResult(transcript, false, confidence);
      },
      onFinalResult: (transcript, confidence) => {
        options.onResult(transcript, true, confidence);
      },
      onError: (_code, message) => {
        if (options.onError) options.onError(message);
      },
      onEnd: () => {
        if (options.onEnd) options.onEnd();
      },
    });
    this.playAudioCue("mic-start");
    return true;
  }

  public stopListening(): void {
    speechRecognitionManager.stop();
    this.playAudioCue("mic-stop");
  }

  public resetRecognition(): void {
    speechRecognitionManager.abort();
  }

  public speak(text: string, options?: TextToSpeechOptions): void {
    const lang = options?.lang || speechRecognitionManager.getLanguage() || "en-IN";
    textToSpeechService.speak(text, { lang, ...options });
  }

  public stopSpeaking(): void {
    textToSpeechService.cancel();
  }

  public getVoices(): SpeechSynthesisVoice[] {
    return textToSpeechService.getVoices();
  }

  public playAudioCue(type: "sent" | "received" | "mic-start" | "mic-stop" | "sign-detected" | "alert"): void {
    try {
      if (typeof window === "undefined") return;
      const win = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const AudioCtx = win.AudioContext || win.webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }

      const ctx = this.audioContext;
      if (!ctx) return;

      if (ctx.state === "suspended") {
        void ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      switch (type) {
        case "sent":
          osc.type = "sine";
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
          break;

        case "received":
          osc.type = "triangle";
          osc.frequency.setValueAtTime(659.25, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.25);
          break;

        case "mic-start":
          osc.type = "sine";
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.linearRampToValueAtTime(660, now + 0.1);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.12);
          break;

        case "mic-stop":
          osc.type = "sine";
          osc.frequency.setValueAtTime(660, now);
          osc.frequency.linearRampToValueAtTime(380, now + 0.1);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.12);
          break;

        case "sign-detected":
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, now);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
          break;

        case "alert":
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(587.33, now);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
          break;
      }
    } catch {
      // Audio autoplay policy
    }
  }
}

export const speechService = new SpeechServiceFacade();
