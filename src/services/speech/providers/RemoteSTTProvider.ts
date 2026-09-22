import type {
  SpeechErrorCode,
  SpeechRecognitionProvider,
  SpeechRecognitionProviderOptions,
} from "../types";

export interface RemoteSTTConfig {
  endpointUrl?: string;
  apiKey?: string;
  modelName?: string;
}

/**
 * Pluggable Remote STT Provider
 * Captures microphone audio using MediaRecorder and sends it to a remote STT endpoint
 * (e.g., Whisper API, Deepgram, or custom WebSocket/REST service).
 */
export class RemoteSTTProvider implements SpeechRecognitionProvider {
  public readonly id = "remote-stt-provider";
  public readonly name = "Pluggable Remote STT Service";

  private config: RemoteSTTConfig;
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private currentLanguage = "en-IN";
  private isRecording = false;

  constructor(config: RemoteSTTConfig = {}) {
    this.config = config;
  }

  public isAvailable(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== "undefined"
    );
  }

  public updateConfig(newConfig: Partial<RemoteSTTConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public async start(options: SpeechRecognitionProviderOptions): Promise<boolean> {
    if (!this.isAvailable()) {
      options.callbacks.onError(
        "audio-capture",
        "Hardware audio recording is not available in this browser environment."
      );
      options.callbacks.onStateChange("ERROR");
      return false;
    }

    try {
      this.currentLanguage = options.language || this.currentLanguage;
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(this.audioStream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstart = () => {
        this.isRecording = true;
        options.callbacks.onStateChange("LISTENING");
      };

      this.mediaRecorder.onerror = (err) => {
        this.isRecording = false;
        options.callbacks.onStateChange("ERROR");
        options.callbacks.onError("audio-capture", `Audio recording error: ${err}`);
      };

      this.mediaRecorder.onstop = async () => {
        this.isRecording = false;
        options.callbacks.onStateChange("PROCESSING");

        const mimeType = this.mediaRecorder?.mimeType || "audio/webm";
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        this.audioChunks = [];

        // If endpointUrl is configured, dispatch to remote server
        if (this.config.endpointUrl) {
          try {
            const formData = new FormData();
            formData.append("audio", audioBlob, "speech.webm");
            formData.append("language", this.currentLanguage);
            if (this.config.modelName) {
              formData.append("model", this.config.modelName);
            }

            const response = await fetch(this.config.endpointUrl, {
              method: "POST",
              headers: this.config.apiKey
                ? { Authorization: `Bearer ${this.config.apiKey}` }
                : undefined,
              body: formData,
            });

            if (!response.ok) {
              throw new Error(`Remote STT server returned status ${response.status}`);
            }

            const data = await response.json();
            const transcript = data.text || data.transcript || "";
            const confidence = data.confidence || 0.9;

            if (transcript.trim()) {
              options.callbacks.onFinalResult(transcript.trim(), confidence);
              options.callbacks.onStateChange("SUCCESS");
            } else {
              options.callbacks.onError("no-speech", "No speech detected in audio clip.");
              options.callbacks.onStateChange("ERROR");
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Check network/server status.";
            options.callbacks.onError(
              "network",
              `Remote STT request failed: ${message}`
            );
            options.callbacks.onStateChange("ERROR");
          }
        } else {
          // Development / Standalone fallback without live endpoint:
          // Report clearly that the remote endpoint needs to be configured
          options.callbacks.onError(
            "network",
            "Remote STT provider is configured but endpoint URL is not set. Connect your custom model endpoint or use Browser Speech Provider."
          );
          options.callbacks.onStateChange("ERROR");
        }

        options.callbacks.onEnd();
      };

      this.mediaRecorder.start(250);
      return true;
    } catch (err: unknown) {
      this.isRecording = false;
      const isNotAllowed = err instanceof Error && err.name === "NotAllowedError";
      const code: SpeechErrorCode = isNotAllowed ? "not-allowed" : "audio-capture";
      const message = err instanceof Error ? err.message : String(err);
      options.callbacks.onStateChange("ERROR");
      options.callbacks.onError(
        code,
        isNotAllowed
          ? "Microphone access was denied."
          : `Failed to acquire microphone: ${message}`
      );
      return false;
    }
  }

  public async stop(): Promise<void> {
    if (this.mediaRecorder && this.isRecording) {
      try {
        this.mediaRecorder.stop();
      } catch {
        // Ignore stop error
      }
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }
    this.isRecording = false;
  }

  public async abort(): Promise<void> {
    if (this.mediaRecorder && this.isRecording) {
      try {
        this.mediaRecorder.stop();
      } catch {
        // Ignore stop error
      }
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }
    this.audioChunks = [];
    this.isRecording = false;
  }

  public setLanguage(lang: string): void {
    this.currentLanguage = lang;
  }
}
