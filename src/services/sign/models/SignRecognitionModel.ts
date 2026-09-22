import type { SignPrediction, TemporalHandFrame } from "../types";
import type { SequenceMotionMetrics } from "../temporal/TemporalSequenceBuffer";

export interface SignRecognitionModel {
  readonly id: string;
  readonly name: string;
  readonly version: string;

  isReady(): boolean;
  predict(
    sequence: TemporalHandFrame[],
    motion: SequenceMotionMetrics
  ): SignPrediction | null;
  reset(): void;
}
