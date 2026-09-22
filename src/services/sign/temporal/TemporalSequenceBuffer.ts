import type { NormalizedHand, TemporalHandFrame } from "../types";

export interface SequenceMotionMetrics {
  averageSpeed: number;
  netDx: number;
  netDy: number;
  horizontalWaveCount: number;
  verticalNodCount: number;
  isStationary: boolean;
}

export class TemporalSequenceBuffer {
  private buffer: TemporalHandFrame[] = [];
  private maxFrames: number;
  private lastPalmPos: { x: number; y: number } | null = null;
  private lastTimestamp = 0;
  private lastDirectionX = 0;
  private lastDirectionY = 0;

  constructor(maxFrames = 20) {
    this.maxFrames = maxFrames;
  }

  public pushFrame(hands: NormalizedHand[], timestamp: number): TemporalHandFrame {
    const dominantHand = hands[0];
    let vx = 0;
    let vy = 0;
    let speed = 0;

    if (dominantHand && this.lastPalmPos && this.lastTimestamp > 0) {
      const dt = Math.max(0.001, (timestamp - this.lastTimestamp) / 1000); // in seconds
      const dx = dominantHand.palmCenter.x - this.lastPalmPos.x;
      const dy = dominantHand.palmCenter.y - this.lastPalmPos.y;

      vx = dx / dt;
      vy = dy / dt;
      speed = Math.hypot(vx, vy);
    }

    if (dominantHand) {
      this.lastPalmPos = { ...dominantHand.palmCenter };
    } else {
      this.lastPalmPos = null;
    }
    this.lastTimestamp = timestamp;

    const frame: TemporalHandFrame = {
      timestamp,
      hands,
      handCount: hands.length,
      palmVelocity: { vx, vy, speed },
    };

    this.buffer.push(frame);
    if (this.buffer.length > this.maxFrames) {
      this.buffer.shift();
    }

    return frame;
  }

  public getFrames(): TemporalHandFrame[] {
    return [...this.buffer];
  }

  public getLength(): number {
    return this.buffer.length;
  }

  public clear(): void {
    this.buffer = [];
    this.lastPalmPos = null;
    this.lastTimestamp = 0;
    this.lastDirectionX = 0;
    this.lastDirectionY = 0;
  }

  /**
   * Computes motion dynamics across the sliding temporal window
   */
  public analyzeMotion(): SequenceMotionMetrics {
    if (this.buffer.length < 3) {
      return {
        averageSpeed: 0,
        netDx: 0,
        netDy: 0,
        horizontalWaveCount: 0,
        verticalNodCount: 0,
        isStationary: true,
      };
    }

    let totalSpeed = 0;
    let waveCount = 0;
    let nodCount = 0;

    let dirX = this.lastDirectionX;
    let dirY = this.lastDirectionY;

    for (let i = 1; i < this.buffer.length; i++) {
      const v = this.buffer[i].palmVelocity;
      totalSpeed += v.speed;

      // Track horizontal direction reversals (lateral wave)
      if (Math.abs(v.vx) > 0.08) {
        const currentDirX = v.vx > 0 ? 1 : -1;
        if (dirX !== 0 && currentDirX !== dirX) {
          waveCount++;
        }
        dirX = currentDirX;
      }

      // Track vertical direction reversals (vertical nod)
      if (Math.abs(v.vy) > 0.08) {
        const currentDirY = v.vy > 0 ? 1 : -1;
        if (dirY !== 0 && currentDirY !== dirY) {
          nodCount++;
        }
        dirY = currentDirY;
      }
    }

    this.lastDirectionX = dirX;
    this.lastDirectionY = dirY;

    const firstHand = this.buffer[0]?.hands[0]?.palmCenter;
    const lastHand = this.buffer[this.buffer.length - 1]?.hands[0]?.palmCenter;

    const netDx = firstHand && lastHand ? lastHand.x - firstHand.x : 0;
    const netDy = firstHand && lastHand ? lastHand.y - firstHand.y : 0;
    const averageSpeed = totalSpeed / (this.buffer.length - 1);
    const isStationary = averageSpeed < 0.12;

    return {
      averageSpeed,
      netDx,
      netDy,
      horizontalWaveCount: waveCount,
      verticalNodCount: nodCount,
      isStationary,
    };
  }
}
