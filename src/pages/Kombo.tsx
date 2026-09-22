import { useState } from "react";
import { ArrowLeft, Mic, Send, Bot, Volume2, Sparkles, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SignAvatar from "../components/sign/SignAvatar";
import SignCameraModal from "../components/sign/SignCameraModal";
import SpeechInputModal from "../components/audio/SpeechInputModal";
import { speechService } from "../services/speechService";
import NetworkStatusBanner from "../components/common/NetworkStatusBanner";

interface AssistantMessage {
  id: number;
  role: "assistant" | "user";
  text: string;
  signableText?: string;
}

const QUICK_TUTOR_PROMPTS = [
  { label: "Water 💧", prompt: "How do I sign 'Water' in ASL?" },
  { label: "Help 🆘", prompt: "How to sign 'Help'?" },
  { label: "Thank You 🙏", prompt: "Teach me how to sign 'Thank you'" },
  { label: "How Are You? ❓", prompt: "How to sign 'How are you?'" },
  { label: "I Love You 🤟", prompt: "Show me the 'I Love You' sign" },
  { label: "Nice to meet you 🤝", prompt: "How to sign 'Nice to meet you'?" },
  { label: "Where is bathroom? 🚻", prompt: "How to ask for the bathroom in sign?" },
];

export default function Kombo() {
  const navigate = useNavigate();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "Hello! I am KOMBO, your intelligent assistive communication partner. I can translate speech to sign language, read text aloud, or help you practice gestures. How can I support your conversation today?",
      signableText: "Hello! How are you doing today?",
    },
  ]);

  const [showSignCamera, setShowSignCamera] = useState(false);
  const [showSpeechModal, setShowSpeechModal] = useState(false);
  const [activeAvatarSign, setActiveAvatarSign] = useState<string>("Hello! How are you doing today?");

  function generateAssistantReply(userMsg: string): { reply: string; signable: string } {
    const lower = userMsg.toLowerCase();

    if (lower.includes("water")) {
      return {
        reply: "To sign 'Water', form a 'W' with your three fingers (index, middle, ring) and tap your chin twice lightly. I am demonstrating it on the avatar right now!",
        signable: "water",
      };
    }
    if (lower.includes("help") || lower.includes("emergency")) {
      return {
        reply: "To sign 'Help', place a closed fist with thumb upright on your flat left palm, then lift them together. Look at the avatar companion!",
        signable: "help",
      };
    }
    if (lower.includes("thank")) {
      return {
        reply: "To sign 'Thank you', touch your flat open fingertips to your chin and extend your palm forward toward the other person with a polite smile.",
        signable: "thank you",
      };
    }
    if (lower.includes("how are you")) {
      return {
        reply: "To sign 'How are you?', cup both hands facing upward at chest height, then rotate and open them outward toward the person with an inquiring expression.",
        signable: "how are you",
      };
    }
    if (lower.includes("love") || lower.includes("ily")) {
      return {
        reply: "The ASL 'I Love You' sign extends your thumb, index, and pinky fingers while holding your middle and ring fingers flat against the palm.",
        signable: "i love you",
      };
    }
    if (lower.includes("nice to meet")) {
      return {
        reply: "To sign 'Nice to meet you', slide your right flat palm across your left palm for 'Nice', then bring both index fingers pointing upward together for 'Meet'.",
        signable: "nice to meet you",
      };
    }
    if (lower.includes("bathroom") || lower.includes("toilet") || lower.includes("restroom")) {
      return {
        reply: "In ASL, form the letter 'T' (thumb poking up between index and middle fingers in a fist) and gently shake your wrist side to side.",
        signable: "where is the bathroom",
      };
    }
    if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
      return {
        reply: "Hello! Welcome to KOMBO. You can speak to me using your microphone, type any sentence, or sign on camera!",
        signable: "hello",
      };
    }

    return {
      reply: `I received: "${userMsg}". I can demonstrate this in sign language, speak it aloud for you, or forward it to your friends in chat!`,
      signable: userMsg,
    };
  }

  function sendMessage(customMsg?: string) {
    const trimmedMessage = (customMsg !== undefined ? customMsg : message).trim();
    if (!trimmedMessage) return;

    const baseId = messages.length + 1;
    const userEntry: AssistantMessage = {
      id: baseId,
      role: "user",
      text: trimmedMessage,
    };

    const { reply, signable } = generateAssistantReply(trimmedMessage);
    const botEntry: AssistantMessage = {
      id: baseId + 1,
      role: "assistant",
      text: reply,
      signableText: signable,
    };

    setMessages((previous) => [...previous, userEntry, botEntry]);
    setActiveAvatarSign(signable);
    if (customMsg === undefined) setMessage("");

    // Read bot reply aloud
    speechService.speak(reply);
    speechService.playAudioCue("sent");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-emerald-500 selection:text-black">
      <NetworkStatusBanner />

      {/* Header */}
      <header className="border-b border-slate-800/80 px-6 py-4 flex items-center justify-between sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-blue-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-sm">
            <Bot size={22} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base sm:text-lg leading-none text-white">
                KOMBO AI Companion & Tutor
              </h1>
              <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                <Sparkles size={10} className="inline mr-1" />
                Live Tutor
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Real-time Gesture Demonstrations & Conversational Assistance
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowSignCamera(true)}
          className="flex items-center gap-1.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 text-xs font-bold transition shadow-lg shadow-emerald-500/15 active:scale-95"
        >
          <span>🤟</span>
          <span className="hidden sm:inline">Camera Practice</span>
        </button>
      </header>

      {/* Split Workspace: Left Chat Stream + Right Avatar Companion */}
      <div className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-6">
        {/* Messages Column */}
        <main className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className="space-y-3.5 overflow-y-auto max-h-[62vh] pr-2 scrollbar-thin">
            {messages.map((item) => (
              <div
                key={item.id}
                className={`flex ${
                  item.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-3xl px-5 py-3.5 shadow-md ${
                    item.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none shadow-blue-600/10"
                      : "bg-slate-900/90 border border-slate-800 text-slate-100 rounded-bl-none shadow-black/20"
                  }`}
                >
                  <p className="text-xs sm:text-sm leading-relaxed">{item.text}</p>

                  <div className="flex items-center justify-end gap-2 mt-2 pt-1.5 border-t border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => speechService.speak(item.text)}
                      title="Read message aloud (Text-to-Speech)"
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 transition"
                    >
                      <Volume2 size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveAvatarSign(item.signableText || item.text)
                      }
                      title="Demonstrate in Sign Avatar"
                      className="flex items-center gap-1 p-1.5 rounded-lg hover:bg-white/10 text-emerald-400 font-bold transition"
                    >
                      <Eye size={13} />
                      <span className="text-[11px]">Watch Sign</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Tutor Prompts Bar */}
          <div className="space-y-1.5 pt-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Quick Practice Prompts:
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {QUICK_TUTOR_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => sendMessage(p.prompt)}
                  className="shrink-0 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/80 text-slate-300 text-xs px-3 py-1.5 transition active:scale-95 shadow-sm"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Action Bar */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
            {/* Sign camera trigger */}
            <button
              type="button"
              onClick={() => setShowSignCamera(true)}
              className="h-11 w-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xl flex items-center justify-center hover:bg-emerald-500/25 transition shrink-0 active:scale-95 shadow-sm"
              title="Sign on camera"
            >
              🤟
            </button>

            {/* Voice input trigger */}
            <button
              type="button"
              onClick={() => setShowSpeechModal(true)}
              className="h-11 w-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center hover:bg-blue-500/25 transition shrink-0 active:scale-95 shadow-sm"
              title="Voice dictation"
            >
              <Mic size={19} />
            </button>

            {/* Text input */}
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask KOMBO, speak, or sign..."
              className="flex-1 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-purple-500 text-white placeholder:text-slate-500 shadow-inner"
            />

            {/* Send */}
            <button
              onClick={() => sendMessage()}
              disabled={!message.trim()}
              className="h-11 w-11 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 flex items-center justify-center text-white transition shrink-0 active:scale-95 shadow-lg shadow-purple-600/20"
            >
              <Send size={16} />
            </button>
          </div>
        </main>

        {/* Right Col: Live Sign Avatar Companion */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full sticky top-24 space-y-3">
            <SignAvatar
              text={activeAvatarSign}
              size="lg"
              autoPlay={true}
              loop={true}
            />
            <p className="text-center text-xs text-slate-400 font-mono">
              Active Demonstration: <strong className="text-emerald-400">"{activeAvatarSign}"</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSignCamera && (
        <SignCameraModal
          onInsertText={(recognized) => sendMessage(recognized)}
          onClose={() => setShowSignCamera(false)}
        />
      )}

      {showSpeechModal && (
        <SpeechInputModal
          onInsertText={(spoken) => sendMessage(spoken)}
          onClose={() => setShowSpeechModal(false)}
        />
      )}
    </div>
  );
}