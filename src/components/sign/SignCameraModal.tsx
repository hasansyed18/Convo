import { useEffect, useRef, useState } from "react";
import {
  X,
  Camera,
  Send,
  RefreshCw,
  AlertTriangle,
  Volume2,
  BookOpen,
  CheckCircle2,
  Activity,
  RotateCcw,
  Edit3,
  Sparkles,
} from "lucide-react";
import {
  signRecognitionPipeline,
  type PipelineUpdatePayload,
} from "../../services/sign/SignRecognitionPipeline";
import type {
  SignPrediction,
  SignRecognitionDiagnostics,
  SignRecognitionState,
} from "../../services/sign/types";
import { SIGN_VOCABULARY } from "../../services/sign/vocabulary";
import { textToSpeechService } from "../../services/speech/textToSpeechService";
import { SignDiagnosticsPanel } from "./SignDiagnosticsPanel";

interface SignCameraModalProps {
  onInsertText: (text: string, asSignInput?: boolean) => void;
  onClose: () => void;
}

export default function SignCameraModal({ onInsertText, onClose }: SignCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [activeTab, setActiveTab] = useState<"camera" | "guide">("camera");
  const [pipelineState, setPipelineState] = useState<SignRecognitionState>("READY");
  const [activePrediction, setActivePrediction] = useState<SignPrediction | null>(null);
  const [holdingProgress, setHoldingProgress] = useState(0);
  const [tokens, setTokens] = useState<SignPrediction[]>([]);
  const [composedPhrase, setComposedPhrase] = useState("");
  const [diagnostics, setDiagnostics] = useState<SignRecognitionDiagnostics | null>(null);

  const [cameraError, setCameraError] = useState("");
  const [showDebugPanel, setShowDebugPanel] = useState(import.meta.env.DEV);

  useEffect(() => {
    let isMounted = true;

    async function initPipeline() {
      if (!videoRef.current || !canvasRef.current) return;

      const success = await signRecognitionPipeline.start(
        videoRef.current,
        canvasRef.current,
        (payload: PipelineUpdatePayload) => {
          if (!isMounted) return;
          setPipelineState(payload.state);
          setActivePrediction(payload.activePrediction);
          setHoldingProgress(payload.holdingProgress);
          setTokens(payload.tokens);
          setComposedPhrase(payload.composedPhrase);
          setDiagnostics(payload.diagnostics);
        }
      );

      if (isMounted && !success) {
        setCameraError(
          "Could not access camera. Please check camera permissions in your browser."
        );
      }
    }

    initPipeline();

    return () => {
      isMounted = false;
      signRecognitionPipeline.stop();
    };
  }, []);

  const handleClear = () => {
    signRecognitionPipeline.getPhraseAssembler().clear();
    setTokens([]);
    setComposedPhrase("");
    setActivePrediction(null);
    setHoldingProgress(0);
  };

  const handleUndo = () => {
    const text = signRecognitionPipeline.getPhraseAssembler().undo();
    setTokens(signRecognitionPipeline.getPhraseAssembler().getTokens());
    setComposedPhrase(text);
  };

  const handleSend = () => {
    const textToSend = composedPhrase || activePrediction?.label || "";
    if (textToSend.trim()) {
      onInsertText(textToSend.trim(), true);
      onClose();
    }
  };

  const handleSpeakText = () => {
    const text = (composedPhrase || activePrediction?.label || "").trim();
    if (text) {
      textToSpeechService.speak(text);
    }
  };

  const handleSimulateGesture = (signId: string) => {
    signRecognitionPipeline.simulateSign(signId);
    const def = SIGN_VOCABULARY[signId];
    if (def) {
      textToSpeechService.speak(def.label);
    }
  };

  const confidence = activePrediction ? Math.round(activePrediction.confidence * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-950/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                Computer Vision Sign Recognition
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                {/* State Badge */}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    pipelineState === "DETECTED"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse"
                      : pipelineState === "RECOGNIZING"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      : pipelineState === "DETECTING"
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                      : pipelineState === "UNCERTAIN"
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  ● {pipelineState === "DETECTED"
                    ? `Sign Detected: ${activePrediction?.label || ""}`
                    : pipelineState === "RECOGNIZING"
                    ? "Holding Gesture..."
                    : pipelineState === "DETECTING"
                    ? "Detecting Hands"
                    : pipelineState === "UNCERTAIN"
                    ? "No Confident Sign"
                    : pipelineState === "NO_HAND"
                    ? "No Hand Detected"
                    : "Camera Ready"}
                </span>

                <span className="text-[11px] text-slate-400">
                  MediaPipe Vision Pipeline (30 FPS)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex rounded-xl bg-slate-800 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("camera")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition ${
                  activeTab === "camera"
                    ? "bg-emerald-500 text-black font-semibold shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Camera size={13} /> Camera
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("guide")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition ${
                  activeTab === "guide"
                    ? "bg-emerald-500 text-black font-semibold shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <BookOpen size={13} /> Vocabulary Guide
              </button>
            </div>

            {/* Dev Diagnostics Toggle */}
            {import.meta.env.DEV && (
              <button
                type="button"
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                title="Toggle CV Telemetry Diagnostics"
                className={`p-2 rounded-xl border transition text-xs ${
                  showDebugPanel
                    ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                }`}
              >
                <Activity size={16} />
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {activeTab === "camera" ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Camera Feed & Landmark Canvas */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
              {cameraError ? (
                <div className="p-6 text-center max-w-sm">
                  <AlertTriangle className="mx-auto mb-3 text-amber-400" size={36} />
                  <p className="text-sm text-slate-300 mb-4">{cameraError}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
                  >
                    Retry Camera
                  </button>
                </div>
              ) : (
                <>
                  {/* Mirrored User Video */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover -scale-x-100"
                  />

                  {/* Real-time Landmark Overlay Canvas */}
                  <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />

                  {/* Active Detected Gesture Overlay HUD */}
                  {activePrediction ? (
                    <div className="absolute top-3 right-3 flex items-center gap-2.5 rounded-2xl border border-emerald-500/40 px-3.5 py-2 backdrop-blur bg-slate-950/90 shadow-xl animate-in fade-in">
                      <span className="text-2xl">
                        {SIGN_VOCABULARY[activePrediction.signId]?.emoji || "🤟"}
                      </span>
                      <div>
                        <p className="font-bold text-white text-sm leading-none flex items-center gap-1.5">
                          {activePrediction.label}
                          <CheckCircle2 size={13} className="text-emerald-400" />
                        </p>
                        <p className="text-[10px] font-mono mt-0.5 text-emerald-400">
                          {confidence}% Confidence
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleSpeakText}
                        title="Read sign aloud"
                        className="ml-1 p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 transition"
                      >
                        <Volume2 size={14} />
                      </button>
                    </div>
                  ) : pipelineState === "UNCERTAIN" ? (
                    <div className="absolute top-3 right-3 rounded-2xl border border-slate-700 px-3 py-1.5 backdrop-blur bg-slate-950/80 text-[11px] text-slate-400 italic">
                      No confident sign detected.
                    </div>
                  ) : null}

                  {/* Hold-to-Confirm Progress Meter */}
                  {holdingProgress > 0 && holdingProgress < 1 && (
                    <div className="absolute top-3 left-3 rounded-full bg-slate-950/85 border border-amber-500/40 px-3 py-1 backdrop-blur flex items-center gap-2 shadow animate-in fade-in">
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 transition-all duration-75"
                          style={{ width: `${Math.round(holdingProgress * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-amber-300">
                        Hold steady: {Math.round(holdingProgress * 100)}%
                      </span>
                    </div>
                  )}

                  {/* Token History & Composed Phrase Bar */}
                  <div className="absolute bottom-3 inset-x-3 rounded-2xl bg-slate-950/92 border border-slate-700/80 p-3.5 backdrop-blur flex flex-col gap-2 shadow-2xl">
                    {/* Committed Tokens History */}
                    {tokens.length > 0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                          Committed:
                        </span>
                        {tokens.map((token, idx) => (
                          <span
                            key={idx}
                            className="shrink-0 flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-lg px-2 py-0.5 text-xs font-semibold"
                          >
                            <span>{SIGN_VOCABULARY[token.signId]?.emoji || "🤟"}</span>
                            <span>{token.label}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold uppercase tracking-wider mb-0.5">
                          <Edit3 size={12} />
                          <span>Candidate Phrase:</span>
                          {signRecognitionPipeline.getPhraseAssembler().isPhraseMatched() && (
                            <span className="ml-1.5 flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.2 text-[9px] text-emerald-300 font-bold lowercase">
                              <Sparkles size={10} />
                              phrase recognized
                            </span>
                          )}
                        </div>

                        <input
                          type="text"
                          value={composedPhrase || (activePrediction ? activePrediction.label : "")}
                          onChange={(e) => {
                            setComposedPhrase(e.target.value);
                            signRecognitionPipeline
                              .getPhraseAssembler()
                              .setComposedText(e.target.value);
                          }}
                          placeholder="Perform signs or pose hands in view..."
                          className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-500 placeholder:italic"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {(composedPhrase || activePrediction) && (
                          <button
                            type="button"
                            onClick={handleSpeakText}
                            title="Read phrase aloud (TTS)"
                            className="p-2 rounded-xl text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition"
                          >
                            <Volume2 size={16} />
                          </button>
                        )}

                        {tokens.length > 0 && (
                          <button
                            type="button"
                            onClick={handleUndo}
                            title="Undo last committed sign"
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          >
                            <RotateCcw size={15} />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleClear}
                          title="Clear phrase buffer"
                          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        >
                          <RefreshCw size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={handleSend}
                          disabled={!composedPhrase && !activePrediction}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black px-4 py-2 text-xs font-bold transition shadow"
                        >
                          <Send size={13} /> Confirm & Send
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick Gesture Visual Guide & One-Tap Testing */}
            <div className="bg-slate-950 border-t border-slate-800/80 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <BookOpen size={13} className="text-emerald-400" />
                  Show to camera or tap to test:
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Hold pose steady in camera
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { id: "good", emoji: "👍", label: "Good", hint: "Thumbs Up" },
                  { id: "stop", emoji: "✋", label: "Stop", hint: "Open Palm" },
                  { id: "hello", emoji: "👋", label: "Hello", hint: "Wave Hand" },
                  { id: "love", emoji: "🤟", label: "Love", hint: "ILY Sign" },
                  { id: "water", emoji: "💧", label: "Water", hint: "W Sign" },
                  { id: "yes", emoji: "✊", label: "Yes", hint: "Fist Nod" },
                ].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleSimulateGesture(g.id)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/80 text-center transition group active:scale-95"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">{g.emoji}</span>
                    <span className="text-xs font-bold text-white mt-0.5">{g.label}</span>
                    <span className="text-[9px] text-slate-400">{g.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dev Diagnostics Panel (Visible in DEV mode if toggled) */}
            {showDebugPanel && diagnostics && (
              <div className="p-3 bg-slate-950 border-t border-slate-800">
                <SignDiagnosticsPanel diagnostics={diagnostics} state={pipelineState} />
              </div>
            )}
          </div>
        ) : (
          /* Vocabulary Guide Tab */
          <div className="p-5 bg-slate-950 space-y-4 overflow-y-auto max-h-[70vh]">
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
              <h4 className="font-bold text-sm text-emerald-400 mb-1 flex items-center gap-1.5">
                <CheckCircle2 size={16} /> Controlled MVP Sign Vocabulary (Calibrated Rules)
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                KOMBO strictly recognizes anatomical finger configurations and dynamic motion vectors.
                To be recognized, hold your hand steady for 7 frames (~230ms). If a pose is ambiguous,
                KOMBO displays <em>"No confident sign detected"</em> rather than inventing false communication.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.values(SIGN_VOCABULARY).map((item) => (
                <div
                  key={item.signId}
                  className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 flex flex-col justify-between hover:border-emerald-500/40 transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{item.emoji}</span>
                        <h5 className="font-bold text-sm text-white">{item.label}</h5>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-0.5">
                        {item.language}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-2">
                      <strong className="text-slate-400">Hand Pose: </strong>
                      {item.description}
                    </p>

                    <p className="text-[11px] text-cyan-300/90 italic">
                      Example: "{item.examplePhrase}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Anti-Repetition Guard Active • Single-Token Emission</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!composedPhrase && !activePrediction}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-black transition shadow"
            >
              <Send size={13} /> Confirm & Send Sign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
