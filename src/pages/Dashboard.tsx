import { useNavigate } from "react-router-dom";
import { logoutUser } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";
import {
  Users2,
  LogOut,
  Sparkles,
  ArrowRight,
  Mic,
  Video,
  BookOpen,
  Bot,
  MessageSquare,
  Users,
  Eye,
} from "lucide-react";
import NetworkStatusBanner from "../components/common/NetworkStatusBanner";
import AccessibilityToolbar from "../components/accessibility/AccessibilityToolbar";
import { useVoiceAssistant } from "../contexts/VoiceAssistantContext";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setEyesFreeMode } = useVoiceAssistant();

  async function handleLogout() {
    await logoutUser();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-emerald-500 selection:text-black">
      <NetworkStatusBanner />

      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 px-6 py-4 flex items-center justify-between sticky top-0 z-30 bg-slate-950/85 backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500/30 to-cyan-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-2xl shadow-lg shadow-emerald-500/10">
            🤟
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-xl tracking-tight leading-none bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                Convo
              </h1>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 tracking-wider uppercase">
                v2.0 Pro
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Multimodal Assistive Communication Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl px-3.5 py-1.5 text-xs text-slate-300 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium">{user?.email}</span>
          </div>

          <button
            type="button"
            onClick={() => setEyesFreeMode(true)}
            title="Open Eyes-Free Mode for Blind Users"
            className="flex items-center gap-1.5 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 px-3.5 py-2 text-xs font-bold transition duration-150 active:scale-95 shadow-sm"
          >
            <Eye size={14} />
            <span className="hidden sm:inline">Eyes-Free Mode</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/80 hover:bg-rose-500/10 hover:border-rose-500/40 hover:text-rose-400 px-4 py-2 text-xs font-bold transition duration-150 active:scale-95 shadow-sm"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8">
        {/* Hero Welcome Banner */}
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/95 to-emerald-950/40 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="max-w-2xl relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1 text-xs text-emerald-400 font-bold shadow-inner">
              <Sparkles size={13} className="animate-spin-slow" />
              <span>4-Way Multimodal Engine Ready</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Welcome back, <span className="text-emerald-400">{user?.displayName || "Friend"}</span> 👋
            </h2>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
              Seamlessly bridge conversations between <strong>Speech</strong>, <strong>Text</strong>, and <strong>Sign Language</strong>. Choose a mode below or start a live session:
            </p>

            {/* Engine Readiness Status Pills */}
            <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5 rounded-xl bg-slate-950/80 border border-cyan-500/40 text-cyan-300 px-3 py-1 font-mono">
                <Mic size={12} className="text-cyan-400" /> "Hey Convo" Voice Assistant: Active
              </span>
              <span className="flex items-center gap-1.5 rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-1 font-mono">
                <Mic size={12} className="text-blue-400" /> STT Speech: 16 Languages
              </span>
              <span className="flex items-center gap-1.5 rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-1 font-mono">
                <Video size={12} className="text-emerald-400" /> Vision AI: 100% Local WASM
              </span>
              <span className="flex items-center gap-1.5 rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-1 font-mono">
                <span>🧏</span> Articulated 2D Avatar: Active
              </span>
            </div>
          </div>

          {/* Decorative Subtle Icon Background */}
          <div className="absolute -right-4 -bottom-6 text-9xl opacity-5 pointer-events-none select-none hidden lg:block">
            🤟
          </div>
        </div>

        {/* Feature Navigation Grid (4 Core Pillars) */}
        <div className="grid sm:grid-cols-2 gap-6">
          {/* 1. Live Remote Conversations */}
          <div
            onClick={() => navigate("/chats")}
            className="group cursor-pointer rounded-3xl border border-emerald-500/20 bg-slate-900/70 hover:bg-slate-900 hover:border-emerald-500/50 p-6 sm:p-7 transition-all duration-200 shadow-xl hover:-translate-y-1 flex flex-col justify-between relative overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 text-3xl shadow-inner border border-emerald-500/30 group-hover:scale-105 transition">
                  <MessageSquare size={28} />
                </div>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
                  Remote Live
                </span>
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition">
                Conversations & Friends
              </h3>
              <p className="text-slate-400 text-sm mt-2.5 leading-relaxed">
                Real-time synchronized messaging with friends. Send and receive messages with live Speech-to-Text, Sign Language Camera, and Animated Sign Avatar popups.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition">
              <span>Open Messages</span>
              <ArrowRight size={14} />
            </div>
          </div>

          {/* 2. Face-to-Face Split Screen Communicator */}
          <div
            onClick={() => navigate("/face-to-face")}
            className="group cursor-pointer rounded-3xl border border-blue-500/20 bg-slate-900/70 hover:bg-slate-900 hover:border-blue-500/50 p-6 sm:p-7 transition-all duration-200 shadow-xl hover:-translate-y-1 flex flex-col justify-between relative overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 text-3xl shadow-inner border border-blue-500/30 group-hover:scale-105 transition">
                  <Users size={28} />
                </div>
                <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-3 py-1 text-xs font-bold text-blue-400">
                  In-Person / Offline
                </span>
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition">
                Face-to-Face Interpreter
              </h3>
              <p className="text-slate-400 text-sm mt-2.5 leading-relaxed">
                Two-way split screen for two people standing or sitting across a table. One side for voice input & audio speaker; opposite side for deaf/non-verbal with sign camera & avatar.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-blue-400 group-hover:translate-x-1 transition">
              <span>Start In-Person Session</span>
              <ArrowRight size={14} />
            </div>
          </div>

          {/* 3. Convo AI Assistant & Sign Tutor */}
          <div
            onClick={() => navigate("/convo")}
            className="group cursor-pointer rounded-3xl border border-purple-500/20 bg-slate-900/70 hover:bg-slate-900 hover:border-purple-500/50 p-6 sm:p-7 transition-all duration-200 shadow-xl hover:-translate-y-1 flex flex-col justify-between relative overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-400 text-3xl shadow-inner border border-purple-500/30 group-hover:scale-105 transition">
                  <Bot size={28} />
                </div>
                <span className="rounded-full bg-purple-500/10 border border-purple-500/30 px-3 py-1 text-xs font-bold text-purple-400">
                  AI Tutor & Practice
                </span>
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition">
                Talk to Convo AI Tutor
              </h3>
              <p className="text-slate-400 text-sm mt-2.5 leading-relaxed">
                Practice sign language gestures with live camera feedback, ask communication questions, test speech synthesis, and watch the avatar explain expressions.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-purple-400 group-hover:translate-x-1 transition">
              <span>Open AI Companion</span>
              <ArrowRight size={14} />
            </div>
          </div>

          {/* 4. Visual Sign Dictionary & Avatar */}
          <div
            onClick={() => navigate("/dictionary")}
            className="group cursor-pointer rounded-3xl border border-amber-500/20 bg-slate-900/70 hover:bg-slate-900 hover:border-amber-500/50 p-6 sm:p-7 transition-all duration-200 shadow-xl hover:-translate-y-1 flex flex-col justify-between relative overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 text-3xl shadow-inner border border-amber-500/30 group-hover:scale-105 transition">
                  <BookOpen size={28} />
                </div>
                <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-400">
                  Gesture Library
                </span>
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition">
                Sign Language Dictionary
              </h3>
              <p className="text-slate-400 text-sm mt-2.5 leading-relaxed">
                Explore 30+ everyday gestures, conversational phrases (*"How are you?"*, *"Nice to meet you"*), A-Z fingerspelling, and magnified Hand Close-Up inspector.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition">
              <span>Browse Dictionary</span>
              <ArrowRight size={14} />
            </div>
          </div>
        </div>

        {/* Quick Contacts Bar */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 border border-slate-700 text-slate-300">
              <Users2 size={22} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Contacts & Directory</h4>
              <p className="text-xs text-slate-400">Search for friends and start instant barrier-free conversations</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/contacts")}
            className="rounded-2xl bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-xs font-bold text-slate-200 transition active:scale-95 border border-slate-700/80 shadow"
          >
            Manage Contacts
          </button>
        </div>
      </main>

      <AccessibilityToolbar />
    </div>
  );
}