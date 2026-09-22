import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Mic,
  Volume2,
  Send,
  RefreshCw,
  Sparkles,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import SignAvatar from "../components/sign/SignAvatar";
import SignCameraModal from "../components/sign/SignCameraModal";
import SpeechInputModal from "../components/audio/SpeechInputModal";
import { speechService } from "../services/speechService";
import NetworkStatusBanner from "../components/common/NetworkStatusBanner";
import AccessibilityToolbar from "../components/accessibility/AccessibilityToolbar";

interface DialogueEntry {
  id: string;
  sender: "hearing" | "deaf";
  text: string;
  mode: "speech" | "sign" | "text";
  time: string;
}

const HEARING_QUICK_PHRASES = [
  "Hello, how can I help you?",
  "Take your time, please.",
  "Could you repeat that?",
  "I understand, thank you.",
  "One moment please.",
];

const DEAF_QUICK_PHRASES = [
  { label: "Yes 👍", text: "Yes, I agree." },
  { label: "No ✋", text: "No, thank you." },
  { label: "Thank you 🙏", text: "Thank you so much." },
  { label: "Please 🤲", text: "Could you please help me?" },
  { label: "Need help 🆘", text: "Please, I need some assistance." },
  { label: "Water 💧", text: "Could I please have some water?" },
  { label: "I am deaf 🧏", text: "I am deaf or hard of hearing." },
  { label: "How are you? ❓", text: "How are you doing today?" },
  { label: "Bathroom 🚻", text: "Where is the bathroom, please?" },
  { label: "I love you 🤟", text: "I love you." },
];

export default function FaceToFaceCommunicator() {
  const navigate = useNavigate();
  const dialogueEndRef = useRef<HTMLDivElement | null>(null);

  // In-person conversation dialogue stream
  const [sessionDialogue, setSessionDialogue] = useState<DialogueEntry[]>([
    {
      id: "init-1",
      sender: "hearing",
      text: "Hello! How can I help you today?",
      mode: "speech",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [hearingInput, setHearingInput] = useState("");
  const [deafInput, setDeafInput] = useState("");

  const [showSignCamera, setShowSignCamera] = useState(false);
  const [showSpeechModal, setShowSpeechModal] = useState(false);

  // Active text being demonstrated by the Sign Avatar
  const [avatarText, setAvatarText] = useState("Hello! How can I help you today?");

  useEffect(() => {
    dialogueEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessionDialogue]);

  const entryCounterRef = useRef(2);

  const handleHearingSend = (customText?: string) => {
    const val = (customText !== undefined ? customText : hearingInput).trim();
    if (!val) return;

    const nextId = `h-${entryCounterRef.current++}`;
    const newEntry: DialogueEntry = {
      id: nextId,
      sender: "hearing",
      text: val,
      mode: "speech",
      time: "Just now",
    };

    setSessionDialogue((prev) => [...prev, newEntry]);
    setAvatarText(val); // Sign avatar performs gesture for the deaf person
    if (customText === undefined) setHearingInput("");
    speechService.playAudioCue("sent");
  };

  const handleDeafSend = (customText?: string) => {
    const val = (customText !== undefined ? customText : deafInput).trim();
    if (!val) return;

    const nextId = `d-${entryCounterRef.current++}`;
    const newEntry: DialogueEntry = {
      id: nextId,
      sender: "deaf",
      text: val,
      mode: "sign",
      time: "Just now",
    };

    setSessionDialogue((prev) => [...prev, newEntry]);
    setAvatarText(val);
    if (customText === undefined) setDeafInput("");

    // Speaks out loud for the hearing person
    speechService.speak(val);
    speechService.playAudioCue("sent");
  };

  const handleClear = () => {
    setSessionDialogue([]);
    setAvatarText("");
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white select-none selection:bg-emerald-500 selection:text-black">
      <NetworkStatusBanner />

      {/* Top Header Bar */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl px-5 py-3.5 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="rounded-2xl p-2 text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
            title="Return to Dashboard"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg text-white leading-none">
                Face-to-Face Live Interpreter
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                <Sparkles size={10} /> Tabletop Mode
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Two-Way In-Person Communication (Voice $\leftrightarrow$ Sign Language $\leftrightarrow$ Text)
            </p>
          </div>
        </div>

        <button
          onClick={handleClear}
          title="Reset session dialogue"
          className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95 shadow-sm"
        >
          <RefreshCw size={13} />
          <span className="hidden sm:inline">Reset Session</span>
        </button>
      </header>

      {/* Main Two-Way Split Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-3 sm:p-5 max-w-7xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* SIDE A: HEARING / SPEAKING PERSON (BLUE THEME)                            */}
        {/* ========================================================================= */}
        <div className="flex flex-col rounded-3xl border border-blue-500/30 bg-gradient-to-b from-slate-900/95 to-slate-950 p-4 sm:p-5 shadow-2xl justify-between">
          <div className="space-y-4">
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30 text-lg">
                  🗣️
                </span>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base leading-tight">
                    Hearing / Speaking Partner
                  </h3>
                  <p className="text-[11px] text-slate-400">Microphone Input & Audio Speaker</p>
                </div>
              </div>

              <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-2.5 py-0.5 text-[11px] text-blue-400 font-mono font-semibold">
                Voice ↔ Text
              </span>
            </div>

            {/* Conversation Log (Hearing View) */}
            <div className="h-72 overflow-y-auto space-y-2.5 pr-1.5 rounded-2xl bg-slate-950/80 p-3.5 border border-slate-800/80 scrollbar-thin">
              {sessionDialogue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center p-4">
                  <p>No messages yet.</p>
                  <p className="text-[11px] mt-1 text-slate-600">
                    Click "Speak Now" or type below to start the conversation!
                  </p>
                </div>
              ) : (
                sessionDialogue.map((item) => (
                  <div
                    key={item.id}
                    className={`flex flex-col ${
                      item.sender === "hearing" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl p-3 text-xs sm:text-sm shadow-md ${
                        item.sender === "hearing"
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-slate-900 text-slate-100 border border-slate-800 rounded-bl-none"
                      }`}
                    >
                      <p className="leading-relaxed">{item.text}</p>
                      <div className="flex items-center justify-between gap-3 mt-1.5 text-[10px] opacity-75">
                        <span className="font-medium">
                          {item.sender === "hearing" ? "You (Spoke)" : "Partner (Signed)"} • {item.time}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* Speak Aloud Button */}
                          <button
                            type="button"
                            onClick={() => speechService.speak(item.text)}
                            title="Read message aloud"
                            className="hover:text-blue-300 transition"
                          >
                            <Volume2 size={13} />
                          </button>
                          {/* Watch Avatar Button */}
                          <button
                            type="button"
                            onClick={() => setAvatarText(item.text)}
                            title="Demonstrate on Sign Avatar"
                            className="hover:text-emerald-400 transition"
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={dialogueEndRef} />
            </div>

            {/* Quick Speech Suggestions for Hearing Person */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Quick Phrases:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {HEARING_QUICK_PHRASES.map((phrase, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleHearingSend(phrase)}
                    className="rounded-xl bg-slate-900/90 hover:bg-blue-600/20 hover:border-blue-500/40 border border-slate-800 px-2.5 py-1 text-[11px] text-slate-300 transition active:scale-95"
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Hearing Input Action Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex gap-2">
            <button
              type="button"
              onClick={() => setShowSpeechModal(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 font-bold text-xs transition shadow-lg shadow-blue-600/20 shrink-0 active:scale-95"
            >
              <Mic size={16} />
              <span>Speak Now</span>
            </button>

            <input
              value={hearingInput}
              onChange={(e) => setHearingInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleHearingSend()}
              placeholder="Or type what you want to say..."
              className="flex-1 rounded-2xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs outline-none focus:border-blue-500 text-white placeholder:text-slate-500"
            />

            <button
              type="button"
              onClick={() => handleHearingSend()}
              disabled={!hearingInput.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 transition shrink-0 shadow active:scale-95"
            >
              <Send size={15} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SIDE B: DEAF / NON-VERBAL PERSON (EMERALD THEME)                          */}
        {/* ========================================================================= */}
        <div className="flex flex-col rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-slate-900/95 to-slate-950 p-4 sm:p-5 shadow-2xl justify-between">
          <div className="space-y-4">
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 text-lg">
                  🤟
                </span>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base leading-tight">
                    Deaf / Non-Verbal Partner
                  </h3>
                  <p className="text-[11px] text-slate-400">Sign Camera & Kinematic Avatar</p>
                </div>
              </div>

              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] text-emerald-400 font-mono font-semibold">
                Sign ↔ Voice
              </span>
            </div>

            {/* Visual Animated Avatar Demonstration */}
            <div className="flex flex-col items-center justify-center bg-slate-950/80 rounded-2xl p-3 border border-slate-800/80">
              <SignAvatar text={avatarText || "Hello"} size="md" autoPlay={true} loop={true} />
              <p className="text-[11px] text-slate-400 mt-2 text-center">
                Active Demonstration: <strong className="text-emerald-400">"{avatarText || "Ready"}"</strong>
              </p>
            </div>

            {/* Quick Response Chips for Deaf Partner */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Instant Assistive Responses (Tap to Sign & Speak):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DEAF_QUICK_PHRASES.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleDeafSend(item.text)}
                    className="rounded-xl bg-slate-900/90 hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-slate-800 px-2.5 py-1 text-[11px] text-slate-200 transition active:scale-95"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Deaf Input Action Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex gap-2">
            <button
              type="button"
              onClick={() => setShowSignCamera(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 font-bold text-xs transition shadow-lg shadow-emerald-500/20 shrink-0 active:scale-95"
            >
              <span>🤟</span>
              <span>Camera Sign</span>
            </button>

            <input
              value={deafInput}
              onChange={(e) => setDeafInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDeafSend()}
              placeholder="Or type what you want to say..."
              className="flex-1 rounded-2xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500 text-white placeholder:text-slate-500"
            />

            <button
              type="button"
              onClick={() => handleDeafSend()}
              disabled={!deafInput.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-40 transition shrink-0 shadow active:scale-95"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSignCamera && (
        <SignCameraModal
          onInsertText={(txt) => handleDeafSend(txt)}
          onClose={() => setShowSignCamera(false)}
        />
      )}

      {showSpeechModal && (
        <SpeechInputModal
          onInsertText={(txt) => handleHearingSend(txt)}
          onClose={() => setShowSpeechModal(false)}
        />
      )}

      <AccessibilityToolbar />
    </div>
  );
}
