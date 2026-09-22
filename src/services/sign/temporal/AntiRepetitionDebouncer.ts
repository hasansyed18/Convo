import type { SignPrediction } from "../types";

export type DebouncerState =
  | "IDLE"
  | "HOLDING"
  | "COMMITTED"
  | "COOLDOWN"
  | "TRANSITION";

export interface DebounceConfig {
  minStableFrames: number; // consecutive frames required before commit (default: 7)
  cooldownMs: number; // wait time before another sign can be emitted (default: 800ms)
  confidenceThreshold: number; // minimum confidence required (default: 0.75)
}

export class AntiRepetitionDebouncer {
  private config: DebounceConfig;
  private state: DebouncerState = "IDLE";

  private candidateSignId: string | null = null;
  private consecutiveFrames = 0;
  private lastCommittedSignId: string | null = null;
  private lastCommitTime = 0;
  private onTokenCommitted: ((prediction: SignPrediction) => void) | null = null;

  constructor(
    config: Partial<DebounceConfig> = {},
    onCommit?: (prediction: SignPrediction) => void
  ) {
    this.config = {
      minStableFrames: config.minStableFrames ?? 5,
      cooldownMs: config.cooldownMs ?? 650,
      confidenceThreshold: config.confidenceThreshold ?? 0.70,
    };
    this.onTokenCommitted = onCommit || null;
  }

  public setOnCommit(callback: (prediction: SignPrediction) => void): void {
    this.onTokenCommitted = callback;
  }

  public getState(): DebouncerState {
    return this.state;
  }

  public getCooldownRemainingMs(): number {
    if (this.state !== "COOLDOWN") return 0;
    const elapsed = Date.now() - this.lastCommitTime;
    return Math.max(0, this.config.cooldownMs - elapsed);
  }

  public getLastCommittedSignId(): string | null {
    return this.lastCommittedSignId;
  }

  public getHoldingProgress(): number {
    if (this.state !== "HOLDING" || this.config.minStableFrames === 0) return 0;
    return Math.min(1, this.consecutiveFrames / this.config.minStableFrames);
  }

  /**
   * Main per-frame process loop:
   * Enforces temporal stability, duplicate suppression, and state transitions.
   */
  public process(prediction: SignPrediction | null, timestamp = Date.now()): boolean {
    const elapsedSinceCommit = timestamp - this.lastCommitTime;

    // Check cooldown expiration
    if (this.state === "COOLDOWN") {
      if (elapsedSinceCommit >= this.config.cooldownMs) {
        this.state = "TRANSITION";
      } else {
        return false;
      }
    }

    // TRANSITION state: User MUST leave the previous sign pose before a new sign can register
    if (this.state === "TRANSITION") {
      if (!prediction || prediction.signId !== this.lastCommittedSignId) {
        // Hand has transitioned away or to a different pose!
        this.state = "IDLE";
        this.candidateSignId = null;
        this.consecutiveFrames = 0;
      } else {
        // Still holding the exact same pose -> refuse to re-emit!
        return false;
      }
    }

    // No confident sign in current frame
    if (!prediction || prediction.confidence < this.config.confidenceThreshold) {
      if (this.state === "HOLDING") {
        this.consecutiveFrames = Math.max(0, this.consecutiveFrames - 1);
        if (this.consecutiveFrames === 0) {
          this.state = "IDLE";
          this.candidateSignId = null;
        }
      }
      return false;
    }

    // A valid sign was predicted
    if (this.candidateSignId === prediction.signId) {
      this.consecutiveFrames++;
      this.state = "HOLDING";

      // Reached required stability window!
      if (this.consecutiveFrames >= this.config.minStableFrames) {
        // COMMIT THE SIGN TOKEN EXACTLY ONCE
        this.state = "COMMITTED";
        this.lastCommittedSignId = prediction.signId;
        this.lastCommitTime = timestamp;

        if (this.onTokenCommitted) {
          this.onTokenCommitted(prediction);
        }

        // Enter cooldown immediately to prevent repeats
        this.state = "COOLDOWN";
        this.candidateSignId = null;
        this.consecutiveFrames = 0;
        return true;
      }
    } else {
      // New candidate sign observed
      this.candidateSignId = prediction.signId;
      this.consecutiveFrames = 1;
      this.state = "HOLDING";
    }

    return false;
  }

  public reset(): void {
    this.state = "IDLE";
    this.candidateSignId = null;
    this.consecutiveFrames = 0;
    this.lastCommittedSignId = null;
    this.lastCommitTime = 0;
  }
}
