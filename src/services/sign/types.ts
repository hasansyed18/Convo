// Sign Language Recognition Types & Pipeline Contracts

export interface HandLandmark3D {
  x: number; // 0 to 1 (normalized camera width)
  y: number; // 0 to 1 (normalized camera height)
  z: number; // relative depth
}

export type Handedness = "Left" | "Right";

export interface NormalizedHand {
  handedness: Handedness;
  confidence: number;
  rawLandmarks: HandLandmark3D[];
  // Translation & scale-normalized coordinates (wrist at origin [0,0,0], middle-MCP distance = 1.0)
  normalizedLandmarks: HandLandmark3D[];
  // Normalized finger curl ratios: 0 = fully extended, 1 = fully curled into palm
  fingerCurl: {
    thumb: number;
    index: number;
    middle: number;
    ring: number;
    pinky: number;
  };
  // Palm center point in frame coordinates [0, 1]
  palmCenter: { x: number; y: number };
}

export interface TemporalHandFrame {
  timestamp: number;
  hands: NormalizedHand[];
  handCount: number;
  // Frame-to-frame velocity of dominant hand palm
  palmVelocity: { vx: number; vy: number; speed: number };
}

export interface SignPrediction {
  signId: string;
  label: string;
  confidence: number; // 0.0 to 1.0
  handMode: "oneHand" | "twoHand";
  isDynamic: boolean;
}

export type SignRecognitionState =
  | "READY"
  | "DETECTING"
  | "RECOGNIZING"
  | "DETECTED"
  | "UNCERTAIN"
  | "NO_HAND";

export interface SignRecognitionDiagnostics {
  fps: number;
  handCount: number;
  landmarksDetected: number;
  currentPrediction: SignPrediction | null;
  sequenceBufferLength: number;
  debouncerState: "IDLE" | "HOLDING" | "COMMITTED" | "COOLDOWN" | "TRANSITION";
  cooldownRemainingMs: number;
  lastCommittedToken: string | null;
  extractorType: "mediapipe-tasks" | "development-cv";
  pipelineLatencyMs: number;
}

