import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import type { Handedness, HandLandmark3D, NormalizedHand } from "../types";
import { GeometricNormalizer } from "./GeometricNormalizer";

export class MediaPipeLandmarkExtractor {
  private handLandmarker: HandLandmarker | null = null;
  private isInitializing = false;
  private initError: string | null = null;
  private lastTimestampMs = 0;

  public async initialize(): Promise<boolean> {
    if (this.handLandmarker) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    this.initError = null;

    try {
      // 1. Load WebAssembly binaries (prefer local /wasm, fallback to CDN)
      let vision;
      try {
        vision = await FilesetResolver.forVisionTasks("/wasm");
      } catch {
        vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
        );
      }

      // 2. Model asset path (prefer local /models/hand_landmarker.task, fallback to CDN)
      const modelPath = "/models/hand_landmarker.task";

      // 3. Create HandLandmarker with GPU delegate, fallback to CPU if WebGL fails
      try {
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        });
      } catch (gpuErr) {
        console.warn("MediaPipe GPU delegate unavailable, falling back to CPU delegate:", gpuErr);
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        });
      }

      this.isInitializing = false;
      return true;
    } catch (err: unknown) {
      console.warn("MediaPipe HandLandmarker init error:", err);
      this.isInitializing = false;
      const message = err instanceof Error ? err.message : String(err);
      this.initError =
        message ||
        "MediaPipe HandLandmarker model failed to load. Check internet connectivity for initial model download.";
      return false;
    }
  }

  public isReady(): boolean {
    return this.handLandmarker !== null;
  }

  public isLoading(): boolean {
    return this.isInitializing;
  }

  public getError(): string | null {
    return this.initError;
  }

  public detect(video: HTMLVideoElement, timestampMs: number): NormalizedHand[] {
    if (!this.handLandmarker || !video || video.readyState < 2) {
      return [];
    }

    // Ensure timestamp is strictly monotonically increasing integer
    let safeTimestamp = Math.floor(timestampMs);
    if (safeTimestamp <= this.lastTimestampMs) {
      safeTimestamp = this.lastTimestampMs + 1;
    }
    this.lastTimestampMs = safeTimestamp;

    try {
      const results = this.handLandmarker.detectForVideo(video, safeTimestamp);
      if (!results || !results.landmarks || results.landmarks.length === 0) {
        return [];
      }

      const normalizedHands: NormalizedHand[] = [];

      for (let i = 0; i < results.landmarks.length; i++) {
        const rawPoints = results.landmarks[i];
        if (!rawPoints || rawPoints.length < 21) continue;

        const rawLandmarks: HandLandmark3D[] = rawPoints.map((p) => ({
          x: p.x,
          y: p.y,
          z: p.z || 0,
        }));

        // Determine handedness from MediaPipe categories
        let handedness: Handedness = "Right";
        let conf = 0.85;

        if (results.handedness && results.handedness[i] && results.handedness[i][0]) {
          const cat = results.handedness[i][0];
          // Mirror correction: camera is in selfie mode
          handedness = cat.categoryName === "Left" ? "Right" : "Left";
          conf = cat.score || conf;
        }

        const normalized = GeometricNormalizer.normalize(rawLandmarks, handedness, conf);
        if (normalized) {
          normalizedHands.push(normalized);
        }
      }

      return normalizedHands;
    } catch (err) {
      console.warn("MediaPipe detection frame error:", err);
      return [];
    }
  }

  public dispose(): void {
    if (this.handLandmarker) {
      try {
        this.handLandmarker.close();
      } catch {
        // Ignore close error
      }
      this.handLandmarker = null;
    }
    this.lastTimestampMs = 0;
  }
}

export const mediaPipeLandmarkExtractor = new MediaPipeLandmarkExtractor();
