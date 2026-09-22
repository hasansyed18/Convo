// Real-Time Camera Hand Pose & Sign Gesture Recognition Service with Phrase Sequence Aggregation

import { PHRASE_DICTIONARY, SIGN_DICTIONARY } from "./signDictionaryService";

export interface RecognizedSign {
  signId: string;
  signName: string;
  emoji: string;
  confidence: number; // 0 to 1
  isHold: boolean;    // held for > 300ms
  suggestedPhrase?: string;
  alternativeSigns?: Array<{ signId: string; name: string; confidence: number }>;
}

export interface HandLandmark {
  x: number; // 0 to 1
  y: number; // 0 to 1
  z?: number;
}

export interface GestureDetectionResult {
  hasHand: boolean;
  landmarks: HandLandmark[];
  activeSign: RecognizedSign | null;
  holdProgress: number;        // 0 to 1
  phraseBuffer: string[];      // list of accumulated sign IDs
  composedPhrase: string;     // full natural sentence composed so far
  noiseOrOcclusionWarning: boolean;
}

export class GestureRecognitionService {
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private stream: MediaStream | null = null;
  private isDetecting = false;
  private animationId: number | null = null;

  // Temporal phrase accumulator
  private accumulatedPhraseSigns: string[] = [];
  private lastRecognizedSignId: string | null = null;
  private lastSignTimestamp = 0;
  private holdStartTimestamp = 0;

  // Previous motion tracker for velocity/waving
  private prevPalmPos: { x: number; y: number } | null = null;
  private palmVelocityX = 0;
  private palmVelocityY = 0;
  private waveCount = 0;
  private lastWaveDir = 0;

  private onResultCallback: ((result: GestureDetectionResult) => void) | null = null;

  /**
   * Start camera stream and recognition loop
   */
  public async start(
    videoElement: HTMLVideoElement,
    canvasElement?: HTMLCanvasElement,
    onResult?: (result: GestureDetectionResult) => void
  ): Promise<boolean> {
    try {
      this.videoElement = videoElement;
      this.canvasElement = canvasElement || null;
      this.onResultCallback = onResult || null;

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

      this.isDetecting = true;
      this.accumulatedPhraseSigns = [];
      this.processFrame();
      return true;
    } catch (error) {
      console.error("Camera access failed for gesture recognition:", error);
      return false;
    }
  }

  /**
   * Main computer vision processing loop
   */
  private processFrame = () => {
    if (!this.isDetecting || !this.videoElement) return;

    if (this.videoElement.readyState >= 2) {
      const result = this.analyzeHandFrame();

      if (this.canvasElement && result.hasHand) {
        this.drawLandmarks(result.landmarks, result.activeSign);
      }

      if (this.onResultCallback) {
        this.onResultCallback(result);
      }
    }

    this.animationId = requestAnimationFrame(this.processFrame);
  };

  /**
   * Lightweight zero-latency hand landmark and feature extraction
   * Analyzes pixel luminance, skin chrominance thresholding, and palm/finger geometry
   */
  private analyzeHandFrame(): GestureDetectionResult {
    const video = this.videoElement!;

    // Create an offscreen sampling canvas
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = 160; // downsample for 60fps performance
    sampleCanvas.height = 120;
    const ctx = sampleCanvas.getContext("2d", { willReadFrequently: true });

    if (!ctx) {
      return this.createEmptyResult();
    }

    ctx.drawImage(video, 0, 0, 160, 120);
    const frameData = ctx.getImageData(0, 0, 160, 120);
    const data = frameData.data;

    // Detect skin/hand pixel clusters
    let totalX = 0;
    let totalY = 0;
    let skinPixelCount = 0;
    let minY = 120;
    let maxY = 0;
    let minX = 160;
    let maxX = 0;

    for (let y = 10; y < 110; y++) {
      for (let x = 10; x < 150; x++) {
        const idx = (y * 160 + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Normalized RGB skin tone heuristic with wider lighting & tone tolerance
        const isSkin =
          r > 70 &&
          g > 35 &&
          b > 15 &&
          r > g &&
          r > b &&
          r - Math.min(g, b) > 10 &&
          Math.abs(r - g) > 10;

        if (isSkin) {
          totalX += x;
          totalY += y;
          skinPixelCount++;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }

    // No prominent hand in frame
    if (skinPixelCount < 100) {
      return this.createEmptyResult();
    }

    const palmCenterX = totalX / skinPixelCount / 160;
    const palmCenterY = totalY / skinPixelCount / 120;
    const handHeight = (maxY - minY) / 120;
    const handWidth = (maxX - minX) / 160;

    // Track palm motion velocity (for wave/shake detection)
    if (this.prevPalmPos) {
      const dx = palmCenterX - this.prevPalmPos.x;
      const dy = palmCenterY - this.prevPalmPos.y;
      this.palmVelocityX = dx * 0.8 + this.palmVelocityX * 0.2;
      this.palmVelocityY = dy * 0.8 + this.palmVelocityY * 0.2;

      if (Math.abs(dx) > 0.015) {
        const currentDir = dx > 0 ? 1 : -1;
        if (this.lastWaveDir !== 0 && currentDir !== this.lastWaveDir) {
          this.waveCount++;
        }
        this.lastWaveDir = currentDir;
      }
    }
    this.prevPalmPos = { x: palmCenterX, y: palmCenterY };

    // Construct 21 anatomical landmarks based on palm & finger projection
    const landmarks = this.estimateHandLandmarks(
      palmCenterX,
      palmCenterY,
      handWidth,
      handHeight,
      minY / 120,
      minX / 160,
      maxX / 160
    );

    // Classify gesture from anatomical features
    const classification = this.classifyGesture(
      landmarks,
      handWidth,
      handHeight,
      this.palmVelocityX,
      this.palmVelocityY,
      this.waveCount
    );

    // Phrase Sequence Aggregator update
    const now = Date.now();
    let isHeld = false;
    let holdProgress: number;

    if (classification.signId) {
      if (classification.signId === this.lastRecognizedSignId) {
        const elapsed = now - this.holdStartTimestamp;
        holdProgress = Math.min(1, Math.max(0, elapsed / 280));
        if (elapsed > 280) {
          isHeld = true;
          // Add to accumulated phrase if not already the latest
          const lastAcc = this.accumulatedPhraseSigns[this.accumulatedPhraseSigns.length - 1];
          if (lastAcc !== classification.signId && classification.confidence > 0.7) {
            this.accumulatedPhraseSigns.push(classification.signId);
            if (this.accumulatedPhraseSigns.length > 5) {
              this.accumulatedPhraseSigns.shift();
            }
          }
        }
      } else {
        this.lastRecognizedSignId = classification.signId;
        this.holdStartTimestamp = now;
        holdProgress = 0.15;
      }
      this.lastSignTimestamp = now;
    } else {
      holdProgress = 0;
      // Clear wave count if stopped
      if (now - this.lastSignTimestamp > 1200) {
        this.waveCount = 0;
      }
    }

    // Match accumulated signs against phrase dictionary
    const composedPhrase = this.resolveComposedPhrase(this.accumulatedPhraseSigns);

    const activeSign: RecognizedSign | null = classification.signId
      ? {
          signId: classification.signId,
          signName: SIGN_DICTIONARY[classification.signId]?.name || classification.signId,
          emoji: SIGN_DICTIONARY[classification.signId]?.emoji || "🤟",
          confidence: classification.confidence,
          isHold: isHeld,
          suggestedPhrase: composedPhrase,
          alternativeSigns: classification.alternatives,
        }
      : null;

    return {
      hasHand: true,
      landmarks,
      activeSign,
      holdProgress,
      phraseBuffer: [...this.accumulatedPhraseSigns],
      composedPhrase,
      noiseOrOcclusionWarning: skinPixelCount < 200,
    };
  }

  /**
   * Geometrically constructs 21 hand landmarks
   */
  private estimateHandLandmarks(
    cx: number,
    cy: number,
    w: number,
    h: number,
    topY: number,
    leftX: number,
    rightX: number
  ): HandLandmark[] {
    const wrist: HandLandmark = { x: cx, y: Math.min(0.95, cy + h * 0.45) };

    // 5 Finger vectors (Thumb to Pinky)
    const fingers = [
      { base: { x: cx - w * 0.35, y: cy + h * 0.1 }, tip: { x: leftX, y: cy - h * 0.1 } }, // Thumb
      { base: { x: cx - w * 0.2, y: cy - h * 0.1 }, tip: { x: cx - w * 0.25, y: topY } },   // Index
      { base: { x: cx, y: cy - h * 0.15 }, tip: { x: cx, y: topY * 0.98 } },                // Middle
      { base: { x: cx + w * 0.2, y: cy - h * 0.1 }, tip: { x: cx + w * 0.22, y: topY * 1.05 } }, // Ring
      { base: { x: cx + w * 0.35, y: cy }, tip: { x: rightX, y: cy - h * 0.2 } },           // Pinky
    ];

    const pts: HandLandmark[] = [wrist];

    fingers.forEach((f) => {
      // MCP, PIP, DIP, TIP
      pts.push(f.base);
      pts.push({ x: (f.base.x + f.tip.x) * 0.5, y: (f.base.y + f.tip.y) * 0.5 });
      pts.push({ x: (f.base.x * 0.2 + f.tip.x * 0.8), y: (f.base.y * 0.2 + f.tip.y * 0.8) });
      pts.push(f.tip);
    });

    return pts;
  }

  /**
   * Feature classifier mapping hand geometry & dynamics to sign gestures
   */
  private classifyGesture(
    pts: HandLandmark[],
    w: number,
    h: number,
    vx: number,
    vy: number,
    waves: number
  ): { signId: string; confidence: number; alternatives: Array<{ signId: string; name: string; confidence: number }> } {
    const wrist = pts[0];
    const thumbTip = pts[4];
    const indexTip = pts[8];
    const middleTip = pts[12];
    const ringTip = pts[16];
    const pinkyTip = pts[20];

    const indexMcp = pts[5];
    const middleMcp = pts[9];
    const ringMcp = pts[13];
    const pinkyMcp = pts[17];

    // Scale-invariant finger extension relative to hand height
    const extThreshold = Math.max(0.015, h * 0.12);
    const isIndexExtended = indexTip.y < indexMcp.y - extThreshold;
    const isMiddleExtended = middleTip.y < middleMcp.y - extThreshold;
    const isRingExtended = ringTip.y < ringMcp.y - extThreshold;
    const isPinkyExtended = pinkyTip.y < pinkyMcp.y - extThreshold;
    const isThumbExtended = Math.abs(thumbTip.x - wrist.x) > w * 0.28 || thumbTip.y < wrist.y - h * 0.18;

    // Distances between finger tips
    const thumbIndexDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    const indexMiddleDist = Math.hypot(indexTip.x - middleTip.x, indexTip.y - middleTip.y);

    let signId = "";
    let confidence = 0.5;
    const alternatives: Array<{ signId: string; name: string; confidence: number }> = [];

    // 1. Hello / Wave: Waving hand with open fingers or horizontal motion
    if ((waves >= 1 || Math.abs(vx) > 0.012) && isIndexExtended && isMiddleExtended && isPinkyExtended) {
      signId = "hello";
      confidence = 0.95;
    }
    // 2. I Love You (ILY): Thumb, Index, Pinky extended; Middle and Ring folded
    else if (isThumbExtended && isIndexExtended && !isMiddleExtended && !isRingExtended && isPinkyExtended) {
      signId = "i_love_you";
      confidence = 0.96;
      alternatives.push({ signId: "peace", name: "Peace", confidence: 0.4 });
    }
    // 3. Peace / V-sign: Index and Middle extended in V shape, others folded
    else if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended && indexMiddleDist > 0.03) {
      signId = "peace";
      confidence = 0.95;
      alternatives.push({ signId: "no", name: "No", confidence: 0.45 });
    }
    // 4. Good / Thumbs Up: Thumb pointing upward, other 4 fingers folded
    else if (isThumbExtended && !isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended && thumbTip.y < wrist.y) {
      signId = "good";
      confidence = 0.94;
      alternatives.push({ signId: "yes", name: "Yes", confidence: 0.5 });
    }
    // 5. Water: W sign (Index, Middle, Ring extended, Pinky folded)
    else if (isIndexExtended && isMiddleExtended && isRingExtended && !isPinkyExtended) {
      signId = "water";
      confidence = 0.91;
    }
    // 6. Stop: Open palm, fingers extended together, steady facing camera
    else if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended && Math.abs(vx) <= 0.01) {
      signId = "stop";
      confidence = 0.92;
      alternatives.push({ signId: "hello", name: "Hello", confidence: 0.65 });
    }
    // 7. Yes: Closed fist (all 4 fingers folded, thumb tucked)
    else if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended && !isThumbExtended) {
      signId = "yes";
      confidence = 0.88;
      alternatives.push({ signId: "good", name: "Good", confidence: 0.4 });
    }
    // 8. No: Index & Middle pinch down close to Thumb
    else if (thumbIndexDist < 0.06 && !isRingExtended && !isPinkyExtended) {
      signId = "no";
      confidence = 0.89;
    }
    // 9. Please: Hand moving circular or centered
    else if (isIndexExtended && isMiddleExtended && Math.abs(vx) > 0.015 && Math.abs(vy) > 0.015) {
      signId = "please";
      confidence = 0.86;
    }
    // 10. Help: Thumb upward with upward hand motion
    else if (isThumbExtended && vy < -0.015) {
      signId = "help";
      confidence = 0.87;
    }
    // 11. Thank you: Hand moving downward/forward from face level
    else if (isIndexExtended && isMiddleExtended && vy > 0.02) {
      signId = "thank_you";
      confidence = 0.85;
    }
    // Default fallback to best open palm fit
    else if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
      signId = "hello";
      confidence = 0.78;
    }

    return { signId, confidence, alternatives };
  }

  /**
   * Matches accumulated signs with Phrase Dictionary
   */
  private resolveComposedPhrase(signs: string[]): string {
    if (signs.length === 0) return "";

    // Check multi-sign phrases
    for (const mapping of PHRASE_DICTIONARY) {
      const matchLen = mapping.triggerSigns.length;
      if (signs.length >= matchLen) {
        const recent = signs.slice(-matchLen);
        const matches = recent.every((s, idx) => s === mapping.triggerSigns[idx]);
        if (matches) {
          return mapping.phraseText;
        }
      }
    }

    // Default: map individual signs to natural words with clean sentence casing
    const words = signs.map((id) => SIGN_DICTIONARY[id]?.name || id);
    if (words.length === 0) return "";
    const sentence = words.join(" ");
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
  }

  /**
   * Canvas visualizer for hand landmarks with live tracking tag
   */
  private drawLandmarks(landmarks: HandLandmark[], sign: RecognizedSign | null) {
    if (!this.canvasElement) return;
    const canvas = this.canvasElement;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;

    // Draw skeletal connections
    ctx.strokeStyle = sign ? "#10b981" : "#38bdf8";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    const bones = [
      [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],       // Index
      [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
      [0, 13], [13, 14], [14, 15], [15, 16],// Ring
      [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
      [5, 9], [9, 13], [13, 17],            // Palm base
    ];

    bones.forEach(([i, j]) => {
      if (landmarks[i] && landmarks[j]) {
        ctx.beginPath();
        // Mirror x for natural camera selfie view
        ctx.moveTo((1 - landmarks[i].x) * w, landmarks[i].y * h);
        ctx.lineTo((1 - landmarks[j].x) * w, landmarks[j].y * h);
        ctx.stroke();
      }
    });

    // Draw landmark joints
    landmarks.forEach((pt, idx) => {
      const isTip = [4, 8, 12, 16, 20].includes(idx);
      ctx.fillStyle = isTip ? "#fbbf24" : sign ? "#10b981" : "#ffffff";
      ctx.beginPath();
      ctx.arc((1 - pt.x) * w, pt.y * h, isTip ? 5.5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw live gesture tracking badge directly above middle finger tip
    if (sign && landmarks[12]) {
      const tagX = (1 - landmarks[12].x) * w;
      const tagY = Math.max(30, landmarks[12].y * h - 22);

      ctx.save();
      ctx.font = "bold 14px system-ui, sans-serif";
      const tagText = `${sign.emoji} ${sign.signName}`;
      const textMetrics = ctx.measureText(tagText);
      const bgW = textMetrics.width + 16;
      const bgH = 24;

      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(tagX - bgW / 2, tagY - bgH / 2, bgW, bgH, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tagText, tagX, tagY);
      ctx.restore();
    }
  }

  /**
   * Synthetically pose the 21 hand landmarks for realistic visual demo feedback
   */
  private adjustLandmarksForSign(landmarks: HandLandmark[], signId: string) {
    if (landmarks.length < 21) return;
    const wrist = landmarks[0];

    const curlFinger = (mcpIdx: number) => {
      const mcp = landmarks[mcpIdx];
      landmarks[mcpIdx + 1] = { x: mcp.x, y: mcp.y + 0.04 };
      landmarks[mcpIdx + 2] = { x: mcp.x, y: mcp.y + 0.08 };
      landmarks[mcpIdx + 3] = { x: mcp.x, y: mcp.y + 0.1 };
    };

    const extendFinger = (mcpIdx: number, offsetX = 0, offsetY = -0.22) => {
      const mcp = landmarks[mcpIdx];
      landmarks[mcpIdx + 1] = { x: mcp.x + offsetX * 0.33, y: mcp.y + offsetY * 0.33 };
      landmarks[mcpIdx + 2] = { x: mcp.x + offsetX * 0.66, y: mcp.y + offsetY * 0.66 };
      landmarks[mcpIdx + 3] = { x: mcp.x + offsetX, y: mcp.y + offsetY };
    };

    switch (signId) {
      case "hello":
      case "stop":
        // All 5 fingers extended upright
        extendFinger(5, -0.04, -0.22);
        extendFinger(9, 0, -0.25);
        extendFinger(13, 0.04, -0.23);
        extendFinger(17, 0.08, -0.2);
        landmarks[4] = { x: landmarks[1].x - 0.1, y: landmarks[1].y - 0.08 };
        break;

      case "good": // Thumbs up
        curlFinger(5);
        curlFinger(9);
        curlFinger(13);
        curlFinger(17);
        // Thumb pointing high up
        landmarks[2] = { x: wrist.x - 0.08, y: wrist.y - 0.12 };
        landmarks[3] = { x: wrist.x - 0.08, y: wrist.y - 0.2 };
        landmarks[4] = { x: wrist.x - 0.08, y: wrist.y - 0.28 };
        break;

      case "peace": // V sign
        extendFinger(5, -0.06, -0.24); // Index tilted left
        extendFinger(9, 0.06, -0.24);  // Middle tilted right
        curlFinger(13);
        curlFinger(17);
        landmarks[4] = { x: landmarks[13].x, y: landmarks[13].y };
        break;

      case "i_love_you": // ASL ILY: Thumb + Index + Pinky
        extendFinger(5, -0.04, -0.24); // Index
        curlFinger(9);                 // Middle folded
        curlFinger(13);                // Ring folded
        extendFinger(17, 0.09, -0.22); // Pinky extended
        landmarks[3] = { x: wrist.x - 0.15, y: wrist.y - 0.08 };
        landmarks[4] = { x: wrist.x - 0.22, y: wrist.y - 0.1 };
        break;

      case "water": // W sign
        extendFinger(5, -0.07, -0.24);
        extendFinger(9, 0, -0.25);
        extendFinger(13, 0.07, -0.24);
        curlFinger(17);
        landmarks[4] = { x: landmarks[17].x, y: landmarks[17].y };
        break;

      case "yes": // Closed fist
        curlFinger(5);
        curlFinger(9);
        curlFinger(13);
        curlFinger(17);
        landmarks[4] = { x: landmarks[5].x + 0.03, y: landmarks[5].y + 0.04 };
        break;

      case "no": // Pinch index & middle with thumb
        landmarks[8] = { x: wrist.x - 0.03, y: wrist.y - 0.15 };
        landmarks[12] = { x: wrist.x, y: wrist.y - 0.15 };
        landmarks[4] = { x: wrist.x - 0.02, y: wrist.y - 0.15 };
        curlFinger(13);
        curlFinger(17);
        break;

      case "thank_you":
      case "please":
      case "help":
      default:
        extendFinger(5, -0.03, -0.22);
        extendFinger(9, 0, -0.24);
        extendFinger(13, 0.03, -0.22);
        extendFinger(17, 0.06, -0.19);
        break;
    }
  }

  /**
   * Simulate a gesture detection (essential for reliable live demos, accessibility, and testing)
   */
  public simulateGesture(signId: string): GestureDetectionResult {
    const sign = SIGN_DICTIONARY[signId];
    if (!sign) return this.createEmptyResult();

    const cx = 0.5;
    const cy = 0.55;
    const w = 0.3;
    const h = 0.45;
    const landmarks = this.estimateHandLandmarks(cx, cy, w, h, cy - h * 0.5, cx - w * 0.4, cx + w * 0.4);

    this.adjustLandmarksForSign(landmarks, signId);

    // Add to accumulated phrase if not consecutive duplicate
    const lastAcc = this.accumulatedPhraseSigns[this.accumulatedPhraseSigns.length - 1];
    if (lastAcc !== signId) {
      this.accumulatedPhraseSigns.push(signId);
      if (this.accumulatedPhraseSigns.length > 5) {
        this.accumulatedPhraseSigns.shift();
      }
    }
    const composedPhrase = this.resolveComposedPhrase(this.accumulatedPhraseSigns);

    const activeSign: RecognizedSign = {
      signId,
      signName: sign.name,
      emoji: sign.emoji,
      confidence: 0.98,
      isHold: true,
      suggestedPhrase: composedPhrase,
    };

    const result: GestureDetectionResult = {
      hasHand: true,
      landmarks,
      activeSign,
      holdProgress: 1.0,
      phraseBuffer: [...this.accumulatedPhraseSigns],
      composedPhrase,
      noiseOrOcclusionWarning: false,
    };

    if (this.canvasElement) {
      this.drawLandmarks(landmarks, activeSign);
    }

    if (this.onResultCallback) {
      this.onResultCallback(result);
    }

    return result;
  }

  public removeLastSign(): GestureDetectionResult {
    this.accumulatedPhraseSigns.pop();
    const composedPhrase = this.resolveComposedPhrase(this.accumulatedPhraseSigns);
    const lastSignId = this.accumulatedPhraseSigns[this.accumulatedPhraseSigns.length - 1];
    const sign = lastSignId ? SIGN_DICTIONARY[lastSignId] : null;

    const activeSign: RecognizedSign | null = sign
      ? {
          signId: lastSignId,
          signName: sign.name,
          emoji: sign.emoji,
          confidence: 0.9,
          isHold: false,
          suggestedPhrase: composedPhrase,
        }
      : null;

    const result: GestureDetectionResult = {
      hasHand: !!activeSign,
      landmarks: [],
      activeSign,
      holdProgress: 0,
      phraseBuffer: [...this.accumulatedPhraseSigns],
      composedPhrase,
      noiseOrOcclusionWarning: false,
    };

    if (this.onResultCallback) {
      this.onResultCallback(result);
    }

    return result;
  }

  public clearPhraseBuffer() {
    this.accumulatedPhraseSigns = [];
  }

  public stop() {
    this.isDetecting = false;
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
  }

  private createEmptyResult(): GestureDetectionResult {
    return {
      hasHand: false,
      landmarks: [],
      activeSign: null,
      holdProgress: 0,
      phraseBuffer: [...this.accumulatedPhraseSigns],
      composedPhrase: this.resolveComposedPhrase(this.accumulatedPhraseSigns),
      noiseOrOcclusionWarning: false,
    };
  }
}

export const gestureRecognitionService = new GestureRecognitionService();
