// Real-time audio noise analyzer and volume level meter using Web Audio API

export interface AudioNoiseStats {
  volumePercent: number; // 0 to 100
  decibels: number; // approx dB (-100 to 0)
  noiseLevel: "quiet" | "moderate" | "noisy";
  waveform: number[]; // normalized waveform slice (-1 to 1 or 0 to 255)
}

export class AudioNoiseService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphoneStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;
  private isAnalyzing = false;
  private onStatsCallback: ((stats: AudioNoiseStats) => void) | null = null;

  public async startAnalyzing(
    stream?: MediaStream,
    onStats?: (stats: AudioNoiseStats) => void
  ): Promise<boolean> {
    try {
      this.onStatsCallback = onStats || null;

      if (!stream) {
        this.microphoneStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: false, // keep ambient for noise detection
            autoGainControl: true,
          },
        });
      } else {
        this.microphoneStream = stream;
      }

      const win = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const AudioCtx = win.AudioContext || win.webkitAudioContext;
      if (!AudioCtx) return false;
      this.audioContext = new AudioCtx();
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.sourceNode = this.audioContext.createMediaStreamSource(this.microphoneStream);
      this.sourceNode.connect(this.analyser);

      this.isAnalyzing = true;
      this.analyzeLoop();
      return true;
    } catch (error) {
      console.warn("Could not start audio noise analysis:", error);
      return false;
    }
  }

  private analyzeLoop = () => {
    if (!this.isAnalyzing || !this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const timeDomainData = new Uint8Array(bufferLength);
    this.analyser.getByteTimeDomainData(timeDomainData);

    // Calculate RMS volume
    let sumSquares = 0;
    const waveformSample: number[] = [];
    const step = Math.max(1, Math.floor(bufferLength / 32));

    for (let i = 0; i < bufferLength; i++) {
      const normalized = (timeDomainData[i] - 128) / 128; // -1 to 1
      sumSquares += normalized * normalized;

      if (i % step === 0 && waveformSample.length < 32) {
        waveformSample.push(normalized);
      }
    }

    const rms = Math.sqrt(sumSquares / bufferLength);
    const volumePercent = Math.min(100, Math.round(rms * 250));
    const decibels = rms > 0.0001 ? Math.round(20 * Math.log10(rms)) : -100;

    let noiseLevel: "quiet" | "moderate" | "noisy";
    if (volumePercent > 45) {
      noiseLevel = "noisy";
    } else if (volumePercent > 18) {
      noiseLevel = "moderate";
    } else {
      noiseLevel = "quiet";
    }

    if (this.onStatsCallback) {
      this.onStatsCallback({
        volumePercent,
        decibels,
        noiseLevel,
        waveform: waveformSample,
      });
    }

    this.animationFrameId = requestAnimationFrame(this.analyzeLoop);
  };

  public stopAnalyzing() {
    this.isAnalyzing = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach((track) => track.stop());
      this.microphoneStream = null;
    }
  }
}

export const audioNoiseService = new AudioNoiseService();
