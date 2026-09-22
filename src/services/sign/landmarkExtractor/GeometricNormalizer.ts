import type { Handedness, HandLandmark3D, NormalizedHand } from "../types";

export class GeometricNormalizer {
  /**
   * Normalizes raw 3D landmarks into scale- and translation-invariant coordinates
   * and computes anatomical finger curl metrics.
   */
  public static normalize(
    rawLandmarks: HandLandmark3D[],
    handedness: Handedness,
    confidence: number
  ): NormalizedHand | null {
    if (!rawLandmarks || rawLandmarks.length < 21) return null;

    const wrist = rawLandmarks[0];
    const middleMcp = rawLandmarks[9];

    // Reference palm scale = Euclidean distance from wrist (0) to middle MCP (9)
    const palmScale = Math.hypot(
      middleMcp.x - wrist.x,
      middleMcp.y - wrist.y,
      (middleMcp.z || 0) - (wrist.z || 0)
    );

    // Prevent division by zero if landmarks collapse
    const scale = palmScale > 0.001 ? palmScale : 1.0;

    // Translation & scale-normalized coordinates
    const normalizedLandmarks: HandLandmark3D[] = rawLandmarks.map((pt) => ({
      x: (pt.x - wrist.x) / scale,
      y: (pt.y - wrist.y) / scale,
      z: ((pt.z || 0) - (wrist.z || 0)) / scale,
    }));

    // Calculate finger curl ratios (0.0 = fully extended, 1.0 = fully curled)
    const fingerCurl = {
      thumb: this.computeThumbCurl(normalizedLandmarks),
      index: this.computeFingerCurl(normalizedLandmarks, 5, 6, 7, 8),
      middle: this.computeFingerCurl(normalizedLandmarks, 9, 10, 11, 12),
      ring: this.computeFingerCurl(normalizedLandmarks, 13, 14, 15, 16),
      pinky: this.computeFingerCurl(normalizedLandmarks, 17, 18, 19, 20),
    };

    // Calculate palm center in camera coordinates [0, 1]
    const palmCenter = {
      x: (wrist.x + middleMcp.x) * 0.5,
      y: (wrist.y + middleMcp.y) * 0.5,
    };

    return {
      handedness,
      confidence,
      rawLandmarks,
      normalizedLandmarks,
      fingerCurl,
      palmCenter,
    };
  }

  /**
   * Computes finger curl ratio:
   * Compares distance from fingertip to wrist vs MCP to wrist.
   * Ratio ~0.0 when fully extended, ~1.0 when fully folded/curled into palm.
   */
  private static computeFingerCurl(
    pts: HandLandmark3D[],
    mcpIdx: number,
    _pipIdx: number,
    _dipIdx: number,
    tipIdx: number
  ): number {
    const tip = pts[tipIdx];
    const mcp = pts[mcpIdx];

    // Distance of tip from wrist (origin 0,0,0)
    const tipDist = Math.hypot(tip.x, tip.y, tip.z);
    // Distance of MCP from wrist
    const mcpDist = Math.hypot(mcp.x, mcp.y, mcp.z);

    // Fully extended: tipDist is typically ~1.8 - 2.2 * mcpDist
    // Fully curled: tipDist is typically <= 0.8 * mcpDist
    const extensionRatio = tipDist / (mcpDist > 0 ? mcpDist : 1);

    // Map [0.8, 1.8] to curl [1.0, 0.0]
    const curl = (1.8 - extensionRatio) / (1.8 - 0.8);
    return Math.max(0, Math.min(1, curl));
  }

  /**
   * Computes thumb curl ratio:
   * Thumb moves across the palm towards pinky base (MCP 17) or tucks down.
   */
  private static computeThumbCurl(pts: HandLandmark3D[]): number {
    const thumbTip = pts[4];
    const pinkyMcp = pts[17];
    const indexMcp = pts[5];

    // Distance from thumb tip to pinky base
    const distToPinky = Math.hypot(
      thumbTip.x - pinkyMcp.x,
      thumbTip.y - pinkyMcp.y,
      thumbTip.z - pinkyMcp.z
    );

    // Distance from index MCP to pinky MCP (palm width reference)
    const palmWidth = Math.hypot(
      indexMcp.x - pinkyMcp.x,
      indexMcp.y - pinkyMcp.y,
      indexMcp.z - pinkyMcp.z
    );

    // If thumb is extended wide outward: distToPinky is large (> 1.4 * palmWidth)
    // If thumb is tucked across palm: distToPinky is small (< 0.7 * palmWidth)
    const ratio = distToPinky / (palmWidth > 0 ? palmWidth : 1);
    const curl = (1.4 - ratio) / (1.4 - 0.6);
    return Math.max(0, Math.min(1, curl));
  }
}
