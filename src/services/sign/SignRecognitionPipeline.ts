import { MediaPipeLandmarkExtractor } from "./landmarkExtractor/MediaPipeLandmarkExtractor";
import { RuleBasedSequenceClassifier } from "./models/RuleBasedSequenceClassifier";
import type { SignRecognitionModel } from "./models/SignRecognitionModel";
import { PhraseAssembler } from "./phrase/PhraseAssembler";
import { AntiRepetitionDebouncer } from "./temporal/AntiRepetitionDebouncer";
import { TemporalSequenceBuffer } from "./temporal/TemporalSequenceBuffer";
import { SIGN_VOCABULARY } from "./vocabulary";
import type {
  NormalizedHand,
  SignPrediction,
  SignRecognitionDiagnostics,
  SignRecognitionState,
} from "./types";

export interface PipelineUpdatePayload {
  state: SignRecognitionState;
  activePrediction: SignPrediction | null;
  holdingProgress: number;
  tokens: SignPrediction[];
  composedPhrase: string;
  diagnostics: SignRecognitionDiagnostics;
}

export class SignRecognitionPipeline {
  private extractor: MediaPipeLandmarkExtractor;
  private model: SignRecognitionModel;
  private sequenceBuffer: TemporalSequenceBuffer;
  private debouncer: AntiRepetitionDebouncer;
  private phraseAssembler: PhraseAssembler;

  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private stream: MediaStream | null = null;

  private isRunning = false;
  private animationId: number | null = null;
  private consecutiveEmptyFrames = 0;

  private currentState: SignRecognitionState = "READY";
  private activePrediction: SignPrediction | null = null;
  private onUpdateCallback: ((payload: PipelineUpdatePayload) => void) | null = null;

  // Diagnostics counters
  private frameCount = 0;
  private lastFpsTime = 0;
  private currentFps = 0;
  private lastLatencyMs = 0;

  constructor() {
    this.extractor = new MediaPipeLandmarkExtractor();
    this.model = new RuleBasedSequenceClassifier();
    this.sequenceBuffer = new TemporalSequenceBuffer(20);
    this.phraseAssembler = new PhraseAssembler();
    this.debouncer = new AntiRepetitionDebouncer({ minStableFrames: 5, cooldownMs: 650 }, (token) => {
      this.phraseAssembler.addToken(token);
    });
  }

  public getPhraseAssembler(): PhraseAssembler {
    return this.phraseAssembler;
  }

  public getModel(): SignRecognitionModel {
    return this.model;
  }

  public setModel(model: SignRecognitionModel): void {
    this.model = model;
  }

  public simulateSign(signId: string): void {
    const def = SIGN_VOCABULARY[signId];
    if (!def) return;
    const prediction: SignPrediction = {
      signId: def.signId,
      label: def.label,
      confidence: 0.95,
      handMode: def.handMode,
      isDynamic: def.isDynamic,
    };
    this.phraseAssembler.addToken(prediction);
    this.activePrediction = prediction;
    this.currentState = "DETECTED";
    if (this.onUpdateCallback) {
      this.onUpdateCallback({
        state: "DETECTED",
        activePrediction: prediction,
        holdingProgress: 1.0,
        tokens: this.phraseAssembler.getTokens(),
        composedPhrase: this.phraseAssembler.getComposedText(),
        diagnostics: this.getDiagnostics(1),
      });
    }
  }

  public async start(
    videoElement: HTMLVideoElement,
    canvasElement?: HTMLCanvasElement,
    onUpdate?: (payload: PipelineUpdatePayload) => void
  ): Promise<boolean> {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement || null;
    this.onUpdateCallback = onUpdate || null;

    try {
      // 1. Initialize camera stream
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();

      // 2. Initialize MediaPipe HandLandmarker in background
      this.extractor.initialize().catch((err) => {
        console.warn("MediaPipe model background initialization note:", err);
      });

      this.isRunning = true;
      this.lastFpsTime = performance.now();
      this.processLoop();
      return true;
    } catch (err) {
      console.error("Failed to start camera for sign pipeline:", err);
      return false;
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    this.canvasElement = null;
    this.sequenceBuffer.clear();
    this.debouncer.reset();
  }

  private processLoop = () => {
    if (!this.isRunning || !this.videoElement) return;

    const startComputeTime = performance.now();
    this.frameCount++;

    // Calculate FPS every 500ms
    if (startComputeTime - this.lastFpsTime >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (startComputeTime - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = startComputeTime;
    }

    // Process frame if video ready
    if (this.videoElement.readyState >= 2) {
      const hands = this.extractor.detect(this.videoElement, startComputeTime);

      if (hands.length === 0) {
        this.consecutiveEmptyFrames++;
        if (this.consecutiveEmptyFrames > 3) {
          this.currentState = "NO_HAND";
          this.activePrediction = null;
          this.sequenceBuffer.pushFrame([], startComputeTime);
          this.debouncer.process(null, Date.now());
          if (this.canvasElement) {
            const ctx = this.canvasElement.getContext("2d");
            if (ctx) ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
          }
        }
      } else {
        this.consecutiveEmptyFrames = 0;
        // Hand(s) detected!
        this.sequenceBuffer.pushFrame(hands, startComputeTime);
        const motion = this.sequenceBuffer.analyzeMotion();
        const frames = this.sequenceBuffer.getFrames();

        // Model Prediction
        const prediction = this.model.predict(frames, motion);
        this.activePrediction = prediction;

        // Anti-Repetition Debouncer
        const committed = this.debouncer.process(prediction, Date.now());

        // Update State
        if (committed) {
          this.currentState = "DETECTED";
        } else if (this.debouncer.getState() === "HOLDING") {
          this.currentState = "RECOGNIZING";
        } else if (prediction) {
          this.currentState = "DETECTING";
        } else {
          this.currentState = "UNCERTAIN";
        }

        // Draw Canvas Overlay
        if (this.canvasElement) {
          this.drawOverlay(hands, prediction);
        }
      }

      this.lastLatencyMs = Math.round(performance.now() - startComputeTime);

      // Dispatch update to UI
      if (this.onUpdateCallback) {
        this.onUpdateCallback({
          state: this.currentState,
          activePrediction: this.activePrediction,
          holdingProgress: this.debouncer.getHoldingProgress(),
          tokens: this.phraseAssembler.getTokens(),
          composedPhrase: this.phraseAssembler.getComposedText(),
          diagnostics: this.getDiagnostics(hands.length),
        });
      }
    }

    this.animationId = requestAnimationFrame(this.processLoop);
  };

  private drawOverlay(hands: NormalizedHand[], prediction: SignPrediction | null) {
    if (!this.canvasElement) return;
    const canvas = this.canvasElement;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;

    // Hand landmark connection skeleton pairs
    const bones = [
      [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],       // Index
      [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
      [0, 13], [13, 14], [14, 15], [15, 16],// Ring
      [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
      [5, 9], [9, 13], [13, 17],            // Palm knuckle base
    ];

    for (const hand of hands) {
      const pts = hand.rawLandmarks;

      // Skeletal connections
      ctx.strokeStyle = prediction ? "#10b981" : "#38bdf8";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";

      for (const [i, j] of bones) {
        if (pts[i] && pts[j]) {
          ctx.beginPath();
          // Mirror X for selfie preview
          ctx.moveTo((1 - pts[i].x) * w, pts[i].y * h);
          ctx.lineTo((1 - pts[j].x) * w, pts[j].y * h);
          ctx.stroke();
        }
      }

      // Joint circles
      pts.forEach((pt, idx) => {
        const isTip = [4, 8, 12, 16, 20].includes(idx);
        ctx.fillStyle = isTip ? "#fbbf24" : prediction ? "#10b981" : "#ffffff";
        ctx.beginPath();
        ctx.arc((1 - pt.x) * w, pt.y * h, isTip ? 5.5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Floating sign tag above middle fingertip
      if (prediction && pts[12]) {
        const tagX = (1 - pts[12].x) * w;
        const tagY = Math.max(30, pts[12].y * h - 24);

        ctx.save();
        ctx.font = "bold 14px system-ui, sans-serif";
        const tagText = `${prediction.label} (${Math.round(prediction.confidence * 100)}%)`;
        const metrics = ctx.measureText(tagText);
        const bgW = metrics.width + 20;
        const bgH = 26;

        ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(tagX - bgW / 2, tagY - bgH / 2, bgW, bgH, 13);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(tagText, tagX, tagY);
        ctx.restore();
      }
    }
  }

  private getDiagnostics(handCount = 0): SignRecognitionDiagnostics {
    return {
      fps: this.currentFps,
      handCount,
      landmarksDetected: handCount * 21,
      currentPrediction: this.activePrediction,
      sequenceBufferLength: this.sequenceBuffer.getLength(),
      debouncerState: this.debouncer.getState(),
      cooldownRemainingMs: this.debouncer.getCooldownRemainingMs(),
      lastCommittedToken: this.debouncer.getLastCommittedSignId(),
      extractorType: this.extractor.isReady() ? "mediapipe-tasks" : "development-cv",
      pipelineLatencyMs: this.lastLatencyMs,
    };
  }
}

export const signRecognitionPipeline = new SignRecognitionPipeline();
