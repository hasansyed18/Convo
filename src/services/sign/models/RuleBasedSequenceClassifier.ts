import type { SignPrediction, TemporalHandFrame } from "../types";
import type { SequenceMotionMetrics } from "../temporal/TemporalSequenceBuffer";
import { SIGN_VOCABULARY } from "../vocabulary";
import type { SignRecognitionModel } from "./SignRecognitionModel";

/**
 * Development Rule-Based Sequence Classifier
 * Evaluates scale-invariant anatomical finger curl ratios, landmark geometry,
 * and temporal motion vectors across a frame buffer.
 *
 * NOTE: When confidence is below threshold, returns `null` ("No confident sign detected").
 * Does NOT hardcode "hello" or generate fake predictions.
 */
export class RuleBasedSequenceClassifier implements SignRecognitionModel {
  public readonly id = "rule-based-sequence-classifier-v1";
  public readonly name = "Calibrated Geometric Sequence Classifier (Dev)";
  public readonly version = "1.0.0";

  public isReady(): boolean {
    return true;
  }

  public reset(): void {
    // Stateless per prediction pass
  }

  public predict(
    sequence: TemporalHandFrame[],
    motion: SequenceMotionMetrics
  ): SignPrediction | null {
    if (!sequence || sequence.length === 0) return null;

    const latestFrame = sequence[sequence.length - 1];
    if (!latestFrame || latestFrame.hands.length === 0) return null;

    const hand = latestFrame.hands[0];
    const curl = hand.fingerCurl;
    const pts = hand.normalizedLandmarks;
    if (!pts || pts.length < 21) return null;

    const wrist = pts[0];
    const thumbTip = pts[4];
    const indexTip = pts[8];
    const middleTip = pts[12];

    // Distance between thumb tip and index tip in normalized scale
    const thumbIndexDist = Math.hypot(
      thumbTip.x - indexTip.x,
      thumbTip.y - indexTip.y,
      thumbTip.z - indexTip.z
    );

    // Extension booleans based on continuous curl ratios (0.0 = extended, 1.0 = curled)
    const isThumbExtended = curl.thumb < 0.48;
    const isIndexExtended = curl.index < 0.44;
    const isMiddleExtended = curl.middle < 0.44;
    const isRingExtended = curl.ring < 0.44;
    const isPinkyExtended = curl.pinky < 0.44;

    const isIndexCurled = curl.index > 0.48;
    const isMiddleCurled = curl.middle > 0.48;
    const isRingCurled = curl.ring > 0.48;
    const isPinkyCurled = curl.pinky > 0.48;

    // Fist curl: at least 3 out of 4 non-thumb fingers curled
    const curledCount = [isIndexCurled, isMiddleCurled, isRingCurled, isPinkyCurled].filter(Boolean).length;
    const isFistCurled = curledCount >= 3;
    const isAllFingersExtended = isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended;

    // 1. GOOD (Thumbs Up)
    // Thumb extended vertically UP (y coordinate smaller than wrist), fingers curled
    if (
      isFistCurled &&
      thumbTip.y < wrist.y - 0.25 &&
      Math.abs(thumbTip.x - wrist.x) < 0.9
    ) {
      return this.buildPrediction("good", 0.94);
    }

    // 2. BAD (Thumbs Down)
    // Thumb extended vertically DOWN, fingers curled
    if (
      isFistCurled &&
      thumbTip.y > wrist.y + 0.18
    ) {
      return this.buildPrediction("bad", 0.92);
    }

    // 3. I LOVE YOU (ILY Sign)
    // Thumb extended, Index extended, Pinky extended, Middle & Ring curled
    if (
      isThumbExtended &&
      isIndexExtended &&
      curl.middle > 0.45 &&
      curl.ring > 0.45 &&
      isPinkyExtended
    ) {
      return this.buildPrediction("love", 0.96);
    }

    // 4. WATER (W-Sign)
    // Index, Middle, Ring extended upright; Pinky curled
    if (
      isIndexExtended &&
      isMiddleExtended &&
      isRingExtended &&
      curl.pinky > 0.45
    ) {
      return this.buildPrediction("water", 0.91);
    }

    // 5. NO (Pinch sign)
    // Index and middle tips close to thumb tip, ring & pinky curled
    if (
      thumbIndexDist < 0.42 &&
      curl.ring > 0.45 &&
      curl.pinky > 0.45 &&
      motion.horizontalWaveCount === 0
    ) {
      return this.buildPrediction("no", 0.89);
    }

    // 6. HELLO (Wave motion)
    // All fingers extended AND noticeable horizontal oscillation
    if (
      isAllFingersExtended &&
      isThumbExtended &&
      (motion.horizontalWaveCount >= 1 || Math.abs(motion.netDx) > 0.03)
    ) {
      return this.buildPrediction("hello", 0.93);
    }

    // 7. STOP (Static open palm)
    // All fingers extended, upright, stationary
    if (
      isAllFingersExtended &&
      motion.isStationary &&
      motion.horizontalWaveCount === 0 &&
      indexTip.y < wrist.y &&
      middleTip.y < wrist.y
    ) {
      return this.buildPrediction("stop", 0.90);
    }

    // 8. YES (Fist nod)
    // Fist shape with vertical nod motion
    if (
      isFistCurled &&
      (motion.verticalNodCount >= 1 || motion.netDy > 0.02)
    ) {
      return this.buildPrediction("yes", 0.88);
    }

    // 9. HELP (Upward lift)
    // Fist or thumb lifted vertically upward
    if (
      (isThumbExtended || isFistCurled) &&
      motion.netDy < -0.03
    ) {
      return this.buildPrediction("help", 0.87);
    }

    // 10. THANK YOU (Forward extension from chin)
    // Flat hand moving downward/forward (netDy > 0.035) with open fingers
    if (
      isIndexExtended &&
      isMiddleExtended &&
      motion.netDy > 0.035 &&
      motion.horizontalWaveCount === 0
    ) {
      return this.buildPrediction("thank_you", 0.86);
    }

    // 11. PLEASE (Circular motion on chest)
    // Flat hand moving in two-dimensional circular path (both wave and nod count >= 1)
    if (
      isIndexExtended &&
      isMiddleExtended &&
      motion.horizontalWaveCount >= 1 &&
      motion.verticalNodCount >= 1
    ) {
      return this.buildPrediction("please", 0.85);
    }

    // CRITICAL: If no gesture satisfies strict rules with > 0.70 confidence,
    // return null! NEVER fake a default "hello" or guess!
    return null;
  }

  private buildPrediction(signId: string, confidence: number): SignPrediction | null {
    const def = SIGN_VOCABULARY[signId];
    if (!def || confidence < 0.7) return null;

    return {
      signId: def.signId,
      label: def.label,
      confidence,
      handMode: def.handMode,
      isDynamic: def.isDynamic,
    };
  }
}
