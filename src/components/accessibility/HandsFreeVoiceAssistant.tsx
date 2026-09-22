// HandsFreeVoiceAssistant: Production-Grade Voice Assistant UI & Eyes-Free Mode for Blind Users
// Provides floating accessible controls, real-time auditory status, and full-screen single-touch interaction

import { useState } from "react";
import {
  Mic,
  Volume2,
  Sparkles,
  Eye,
  EyeOff,
  Radio,
  HelpCircle,
  X,
  MessageSquare,
  Globe,
} from "lucide-react";
import { useVoiceAssistant } from "../../contexts/VoiceAssistantContext";
import { SUPPORTED_SPEECH_LANGUAGES } from "../../services/speech/types";

export default function HandsFreeVoiceAssistant() {
  const {
    isAssistantEnabled,
    assistantState,
    detectedLanguage,
    transcript,
    lastResponse,
    isEyesFreeMode,
    toggleAssistant,
    startActiveListening,
    stopListening,
    setEyesFreeMode,
    setLanguage,
  } = useVoiceAssistant();

  const [showHelpModal, setShowHelpModal] = useState(false);

  const isListening =
    assistantState === "LISTENING_FOR_WAKE" || assistantState === "ACTIVE_LISTENING";
  const isSpeaking = assistantState === "SPEAKING";
  const isThinking = assistantState === "THINKING";

  const currentLangObj =
    SUPPORTED_SPEECH_LANGUAGES.find((l) => l.code === detectedLanguage) ||
    SUPPORTED_SPEECH_LANGUAGES[0];

  // --------------------------------------------------------------------------
  // EYES-FREE BLIND MODE (FULLSCREEN TOUCH INTERFACE)
  // --------------------------------------------------------------------------
  if (isEyesFreeMode) {
    return (
      <div
        role="region"
        aria-label="Eyes-Free Hands-Free Voice Assistant for Blind Users"
        aria-live="assertive"
        onClick={() => {
          if (isSpeaking) {
            stopListening();
          } else {
            startActiveListening();
          }
        }}
        className="fixed inset-0 z-50 flex flex-col justify-between bg-black p-6 sm:p-10 select-none cursor-pointer animate-in fade-in duration-300"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-2xl font-bold">
              🎙️
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                Convo Eyes-Free Mode
              </h1>
              <p className="text-xs sm:text-sm text-cyan-300 font-medium">
                Tap anywhere on screen to speak • Double tap to cancel
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEyesFreeMode(false);
            }}
            className="flex items-center gap-2 rounded-2xl bg-slate-900 border border-slate-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition"
          >
            <EyeOff size={18} /> Exit Eyes-Free
          </button>
        </div>

        {/* Center Live Interaction Surface */}
        <div className="my-auto flex flex-col items-center text-center space-y-6 max-w-2xl mx-auto">
          {/* Pulsing Mic Target */}
          <div
            className={`relative flex h-32 w-32 sm:h-40 sm:w-40 items-center justify-center rounded-full transition-all duration-300 ${
              isSpeaking
                ? "bg-purple-500/30 text-purple-300 ring-8 ring-purple-500/20 scale-105"
                : isThinking
                ? "bg-amber-500/30 text-amber-300 ring-8 ring-amber-500/20 animate-pulse"
                : assistantState === "ACTIVE_LISTENING"
                ? "bg-emerald-500/40 text-emerald-300 ring-8 ring-emerald-500/40 scale-110 shadow-[0_0_50px_rgba(52,211,153,0.6)]"
                : "bg-cyan-500/20 text-cyan-400 ring-4 ring-cyan-500/20 hover:scale-105"
            }`}
          >
            {isSpeaking ? (
              <Volume2 size={56} className="animate-bounce" />
            ) : (
              <Mic size={56} className={isListening ? "animate-pulse" : ""} />
            )}
            {isListening && (
              <span className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-40" />
            )}
          </div>

          {/* Status Headline */}
          <div className="space-y-2">
            <span
              className={`inline-block rounded-full px-4 py-1 text-xs sm:text-sm font-black uppercase tracking-widest ${
                isSpeaking
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                  : isThinking
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : assistantState === "ACTIVE_LISTENING"
                  ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 animate-pulse"
                  : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
              }`}
            >
              {isSpeaking
                ? "Convo is Speaking"
                : isThinking
                ? "Thinking..."
                : assistantState === "ACTIVE_LISTENING"
                ? "Listening to your voice..."
                : "Listening for 'Hey Convo' (Tap anywhere to speak)"}
            </span>

            {/* High-Contrast Large Text Readout for low-vision & companions */}
            <p className="text-xl sm:text-3xl font-extrabold text-white leading-relaxed min-h-[4rem]">
              {transcript || lastResponse || 'Say: "How many messages did I receive today?"'}
            </p>
          </div>

          {/* Language & Voice Tag */}
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 bg-slate-900/90 border border-cyan-500/30 px-3 py-1.5 rounded-full">
            <Globe size={14} />
            <span>
              Native Voice: {currentLangObj.flag} {currentLangObj.label} ({detectedLanguage})
            </span>
          </div>
        </div>

        {/* Bottom Suggested Hands-Free Commands */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3.5">
            <p className="text-xs font-bold text-cyan-400">🗣️ Message Commands:</p>
            <p className="text-xs text-slate-300 mt-1">
              "How many messages did I receive today?" • "Read the messages" • "Reply with [text]"
            </p>
          </div>
          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3.5">
            <p className="text-xs font-bold text-emerald-400">🧭 Navigation & Language:</p>
            <p className="text-xs text-slate-300 mt-1">
              "Open chat with Sarah" • "Go to dashboard" • "Where am I?" • "Speak in Hindi"
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // FLOATING ACCESSIBLE WIDGET (DEFAULT NON-OBTRUSIVE OVERLAY)
  // --------------------------------------------------------------------------
  return (
    <>
      <div
        role="region"
        aria-label="Hands-Free AI Voice Assistant"
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 select-none"
      >
        {/* Expandable Assistant Banner */}
        <div
          onClick={startActiveListening}
          title="Tap to talk to Convo AI assistant"
          className={`flex items-center gap-3 rounded-full border px-4 py-2.5 shadow-2xl backdrop-blur-md transition-all duration-200 cursor-pointer active:scale-95 ${
            !isAssistantEnabled
              ? "bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700"
              : isSpeaking
              ? "bg-purple-950/90 border-purple-500/50 text-purple-200 shadow-purple-500/20"
              : isThinking
              ? "bg-amber-950/90 border-amber-500/50 text-amber-200 shadow-amber-500/20"
              : assistantState === "ACTIVE_LISTENING"
              ? "bg-emerald-950/90 border-emerald-500/60 text-emerald-200 shadow-emerald-500/30 scale-105"
              : "bg-slate-900/95 border-cyan-500/40 text-cyan-200 shadow-cyan-500/20 hover:border-cyan-400"
          }`}
        >
          {/* Animated Icon Indicator */}
          <div
            className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              !isAssistantEnabled
                ? "bg-slate-800 text-slate-500"
                : isSpeaking
                ? "bg-purple-500/30 text-purple-300"
                : isThinking
                ? "bg-amber-500/30 text-amber-300"
                : assistantState === "ACTIVE_LISTENING"
                ? "bg-emerald-500/30 text-emerald-300"
                : "bg-cyan-500/20 text-cyan-400"
            }`}
          >
            {isSpeaking ? (
              <Volume2 size={16} className="animate-pulse" />
            ) : isThinking ? (
              <Radio size={16} className="animate-spin" />
            ) : (
              <Mic size={16} className={isListening ? "animate-pulse" : ""} />
            )}
            {isListening && isAssistantEnabled && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>

          {/* Status Copy */}
          <div className="hidden sm:flex flex-col text-left pr-1">
            <span className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
              <span>Convo AI</span>
              <span className="text-[10px] text-cyan-400 font-mono">({currentLangObj.flag})</span>
            </span>
            <span className="text-[11px] text-slate-400 leading-tight truncate max-w-[190px]">
              {!isAssistantEnabled
                ? "Voice off (Tap to start)"
                : isSpeaking
                ? "Speaking aloud..."
                : isThinking
                ? "Processing..."
                : assistantState === "ACTIVE_LISTENING"
                ? "Listening..."
                : "Say 'Hey Convo'"}
            </span>
          </div>

          {/* Quick Eyes-Free Fullscreen Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEyesFreeMode(true);
            }}
            title="Open Eyes-Free Mode for Blind Users"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-cyan-300 hover:text-white transition"
          >
            <Eye size={15} />
          </button>

          {/* Help Menu Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowHelpModal(true);
            }}
            title="Voice Commands Guide"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
          >
            <HelpCircle size={15} />
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* VOICE COMMANDS HELP MODAL                                              */}
      {/* ---------------------------------------------------------------------- */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="flex flex-col w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 p-4 bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
                  <Sparkles size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-white text-base">
                    "Hey Convo" Voice Commands
                  </h3>
                  <p className="text-xs text-slate-400">
                    Hands-Free Multilingual Accessibility
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Language Selector */}
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3 flex items-center justify-between">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Globe size={14} className="text-cyan-400" /> Active Language:
                </span>
                <select
                  value={detectedLanguage}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-slate-800 text-white rounded-xl px-2.5 py-1 text-xs border border-slate-700 outline-none"
                >
                  {SUPPORTED_SPEECH_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Commands List */}
              <div className="space-y-3">
                <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-3 space-y-1">
                  <p className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <MessageSquare size={14} /> Check & Count Messages
                  </p>
                  <p className="text-slate-300">
                    "How many messages did I receive today?"
                  </p>
                  <p className="text-[11px] text-slate-500">
                    In Hindi: "आज कितने मैसेज आए हैं?" • In Spanish: "¿Cuántos mensajes recibí hoy?"
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-3 space-y-1">
                  <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Volume2 size={14} /> Read Messages Aloud
                  </p>
                  <p className="text-slate-300">
                    "Read the messages" or "Read the chat"
                  </p>
                  <p className="text-[11px] text-slate-500">
                    In Hindi: "मैसेज पढ़ो" • In Spanish: "Lee los mensajes"
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-3 space-y-1">
                  <p className="font-bold text-purple-400 flex items-center gap-1.5">
                    <Mic size={14} /> Open Chat & Reply Hands-Free
                  </p>
                  <p className="text-slate-300">
                    "Open chat with Sarah" $\rightarrow$ then "Reply with I will be there soon"
                  </p>
                  <p className="text-[11px] text-slate-500">
                    In Hindi: "साराह की चैट खोलो" $\rightarrow$ "जवाब दो मैं आ रहा हूँ"
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-3 space-y-1">
                  <p className="font-bold text-blue-400 flex items-center gap-1.5">
                    <Eye size={14} /> Screen Guidance & Navigation
                  </p>
                  <p className="text-slate-300">
                    "Where am I?" • "Go to dashboard" • "Go to chats" • "Open face to face"
                  </p>
                </div>
              </div>

              {/* Eyes-Free Mode Callout */}
              <div className="rounded-2xl bg-cyan-950/40 border border-cyan-500/30 p-3.5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">Eyes-Free Blind Mode</p>
                  <p className="text-[11px] text-cyan-300/80">
                    Makes your whole screen a touch trigger
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowHelpModal(false);
                    setEyesFreeMode(true);
                  }}
                  className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black px-3.5 py-2 font-bold text-xs transition"
                >
                  Enter
                </button>
              </div>

              {/* Master Toggle */}
              <div className="pt-2 flex justify-between items-center border-t border-slate-800">
                <span className="text-slate-400">Assistant Power:</span>
                <button
                  type="button"
                  onClick={toggleAssistant}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    isAssistantEnabled
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  }`}
                >
                  {isAssistantEnabled ? "Pause Assistant" : "Enable Assistant"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

