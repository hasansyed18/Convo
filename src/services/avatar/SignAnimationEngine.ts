import {
  type SignAvatarKeyframe,
  type SignItem,
  translateTextToSignSequence,
  SIGN_DICTIONARY,
} from "../signDictionaryService";

export type SignLanguageDialect = "ASL" | "ISL" | "UNIVERSAL";

export interface SignSequenceItem {
  sign: SignItem;
  word: string;
}

export type AnimationUpdateCallback = (
  keyframe: SignAvatarKeyframe,
  item: SignSequenceItem,
  itemIndex: number,
  totalItems: number,
  itemProgress: number
) => void;

export class SignAnimationEngine {
  private sequence: SignSequenceItem[] = [];
  private currentIndex = 0;
  private isPlaying = false;
  private isPaused = false;
  private speedMultiplier = 1.0;
  private loop = false;

  private dialect: SignLanguageDialect = "ASL";
  private animationFrameId: number | null = null;
  private itemStartTime = 0;
  private pausedElapsedTime = 0;

  private onUpdateCallback: AnimationUpdateCallback | null = null;
  private onCompleteCallback: (() => void) | null = null;

  public setDialect(dialect: SignLanguageDialect): void {
    this.dialect = dialect;
  }

  public getDialect(): SignLanguageDialect {
    return this.dialect;
  }

  public setSpeed(speed: number): void {
    this.speedMultiplier = Math.max(0.25, Math.min(3.0, speed));
  }

  public getSpeed(): number {
    return this.speedMultiplier;
  }

  public setLoop(loop: boolean): void {
    this.loop = loop;
  }

  public onUpdate(callback: AnimationUpdateCallback): void {
    this.onUpdateCallback = callback;
  }

  public onComplete(callback: () => void): void {
    this.onCompleteCallback = callback;
  }

  public loadText(text: string, dialect: SignLanguageDialect = "ASL"): SignSequenceItem[] {
    this.dialect = dialect;
    this.sequence = translateTextToSignSequence(text);
    this.currentIndex = 0;
    return [...this.sequence];
  }

  public loadSignId(signId: string): SignSequenceItem[] {
    const sign = SIGN_DICTIONARY[signId];
    if (sign) {
      this.sequence = [{ sign, word: sign.name }];
    } else {
      this.sequence = [];
    }
    this.currentIndex = 0;
    return [...this.sequence];
  }

  public play(): void {
    if (this.sequence.length === 0) return;

    if (this.isPaused) {
      this.resume();
      return;
    }

    this.stop();
    this.isPlaying = true;
    this.isPaused = false;
    this.currentIndex = 0;
    this.itemStartTime = performance.now();
    this.pausedElapsedTime = 0;
    this.tick(this.itemStartTime);
  }

  public pause(): void {
    if (!this.isPlaying || this.isPaused) return;
    this.isPaused = true;
    this.pausedElapsedTime = performance.now() - this.itemStartTime;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public resume(): void {
    if (!this.isPlaying || !this.isPaused) return;
    this.isPaused = false;
    this.itemStartTime = performance.now() - this.pausedElapsedTime;
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  public stop(): void {
    this.isPlaying = false;
    this.isPaused = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.currentIndex = 0;
    this.pausedElapsedTime = 0;
  }

  public getCurrentSequence(): SignSequenceItem[] {
    return [...this.sequence];
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  private tick = (now: number) => {
    if (!this.isPlaying || this.isPaused || this.sequence.length === 0) return;

    const currentItem = this.sequence[this.currentIndex];
    if (!currentItem) {
      this.finishSequence();
      return;
    }

    const keyframe = currentItem.sign.keyframes[0];
    const baseDuration = keyframe?.durationMs || 1000;
    const effectiveDuration = baseDuration / this.speedMultiplier;

    const elapsed = now - this.itemStartTime;
    const progress = Math.min(1.0, Math.max(0.0, elapsed / effectiveDuration));

    if (keyframe && this.onUpdateCallback) {
      this.onUpdateCallback(
        keyframe,
        currentItem,
        this.currentIndex,
        this.sequence.length,
        progress
      );
    }

    if (progress < 1.0) {
      this.animationFrameId = requestAnimationFrame(this.tick);
    } else {
      // Step to next item in sign sequence
      if (this.currentIndex < this.sequence.length - 1) {
        this.currentIndex++;
        this.itemStartTime = performance.now();
        this.animationFrameId = requestAnimationFrame(this.tick);
      } else if (this.loop) {
        this.currentIndex = 0;
        this.itemStartTime = performance.now();
        this.animationFrameId = requestAnimationFrame(this.tick);
      } else {
        this.finishSequence();
      }
    }
  };

  private finishSequence(): void {
    this.isPlaying = false;
    this.isPaused = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.onCompleteCallback) {
      this.onCompleteCallback();
    }
  }
}
