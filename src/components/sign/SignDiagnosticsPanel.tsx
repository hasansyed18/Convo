import React from "react";
import type { SignRecognitionDiagnostics, SignRecognitionState } from "../../services/sign/types";
import { Activity, ShieldAlert, Cpu } from "lucide-react";

interface SignDiagnosticsPanelProps {
  diagnostics: SignRecognitionDiagnostics;
  state: SignRecognitionState;
  onClose?: () => void;
}

export const SignDiagnosticsPanel: React.FC<SignDiagnosticsPanelProps> = ({
  diagnostics,
  state,
}) => {
  // Only render in development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  const confPercent = diagnostics.currentPrediction
    ? Math.round(diagnostics.currentPrediction.confidence * 100)
    : 0;

  return (
    <div className="rounded-2xl bg-slate-950/95 border border-cyan-500/30 p-3.5 text-xs text-slate-300 font-mono space-y-2.5 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 text-cyan-400 font-bold">
          <Activity size={15} />
          <span>CV Pipeline Telemetry (Dev Diagnostics)</span>
        </div>
        <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-md">
          <Cpu size={12} /> {diagnostics.extractorType}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <div className="rounded-xl bg-slate-900/80 p-2 border border-slate-800">
          <span className="text-slate-500 block text-[10px]">THROUGHPUT</span>
          <span className="font-bold text-emerald-400">{diagnostics.fps} FPS</span>
          <span className="text-slate-500 text-[10px] ml-1.5">({diagnostics.pipelineLatencyMs}ms)</span>
        </div>

        <div className="rounded-xl bg-slate-900/80 p-2 border border-slate-800">
          <span className="text-slate-500 block text-[10px]">HAND TRACKING</span>
          <span className="font-bold text-white">{diagnostics.handCount} Hands</span>
          <span className="text-slate-500 text-[10px] ml-1.5">({diagnostics.landmarksDetected} pts)</span>
        </div>

        <div className="rounded-xl bg-slate-900/80 p-2 border border-slate-800">
          <span className="text-slate-500 block text-[10px]">STATE MACHINE</span>
          <span
            className={`font-bold ${
              state === "DETECTED"
                ? "text-emerald-400"
                : state === "RECOGNIZING"
                ? "text-amber-400"
                : state === "NO_HAND"
                ? "text-rose-400"
                : "text-blue-400"
            }`}
          >
            {state}
          </span>
        </div>

        <div className="rounded-xl bg-slate-900/80 p-2 border border-slate-800">
          <span className="text-slate-500 block text-[10px]">ANTI-REPEAT</span>
          <span className="font-bold text-cyan-400">{diagnostics.debouncerState}</span>
          {diagnostics.cooldownRemainingMs > 0 && (
            <span className="text-amber-400 text-[10px] ml-1">
              ({diagnostics.cooldownRemainingMs}ms)
            </span>
          )}
        </div>
      </div>

      {/* Prediction Details */}
      <div className="rounded-xl bg-slate-900/60 p-2 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-slate-500 text-[10px] block">CURRENT PREDICTION</span>
          <span className="font-bold text-white">
            {diagnostics.currentPrediction ? (
              `${diagnostics.currentPrediction.label} (${confPercent}%)`
            ) : (
              <span className="text-slate-500 italic">No confident sign</span>
            )}
          </span>
        </div>

        <div className="text-right">
          <span className="text-slate-500 text-[10px] block">LAST COMMITTED TOKEN</span>
          <span className="font-bold text-emerald-300">
            {diagnostics.lastCommittedToken || "None"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-amber-300/80 pt-0.5">
        <ShieldAlert size={12} className="shrink-0" />
        <span>Strict ML Policy Active: No confident sign detected will output null instead of fake fallback.</span>
      </div>
    </div>
  );
};
