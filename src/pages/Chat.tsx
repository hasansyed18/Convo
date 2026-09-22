import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  Mic,
  Send,
  Volume2,
} from "lucide-react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  doc,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";
import {
  sendMessage,
  subscribeToMessages,
} from "../services/messageService";
import { speechService } from "../services/speechService";
import SignCameraModal from "../components/sign/SignCameraModal";
import SpeechInputModal from "../components/audio/SpeechInputModal";
import SignAvatarModal from "../components/chat/SignAvatarModal";
import AccessibilityToolbar from "../components/accessibility/AccessibilityToolbar";
import NetworkStatusBanner from "../components/common/NetworkStatusBanner";
import { offlineStorageService } from "../services/offlineStorageService";

interface ConversationData {
  participants: string[];
  participantNames: {
    [uid: string]: string;
  };
}

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  inputType: "text" | "speech" | "sign";
  createdAt?: any;
}

const QUICK_ASSISTIVE_PHRASES = [
  { label: "Yes 👍", text: "Yes" },
  { label: "No ✋", text: "No" },
  { label: "Thank you 🙏", text: "Thank you" },
  { label: "Please help 🆘", text: "Please help me" },
  { label: "I am deaf / hard of hearing 🧏", text: "I am deaf or hard of hearing." },
  { label: "Please speak or type clearly 🗣️", text: "Please speak or type clearly." },
  { label: "Please wait a moment ⏳", text: "Please wait a moment." },
  { label: "I love you 🤟", text: "I love you" },
  { label: "Need water 💧", text: "Could I please have some water?" },
];

export default function Chat() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showSignCamera, setShowSignCamera] = useState(false);
  const [showSpeechModal, setShowSpeechModal] = useState(false);
  const [activeAvatarMessage, setActiveAvatarMessage] = useState<ChatMessage | null>(null);

  // Visual alert flash
  const [flashAlert, setFlashAlert] = useState(false);

  // Settings
  const [settings, setSettings] = useState(() =>
    offlineStorageService.getAccessibilitySettings()
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef(0);

  /*
   * Load Conversation Details
   */
  useEffect(() => {
    if (!conversationId || !user) return;

    const conversationRef = doc(db, "conversations", conversationId);
    const unsubscribe = onSnapshot(
      conversationRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setConversation(null);
          setLoading(false);
          return;
        }
        setConversation(snapshot.data() as ConversationData);
        setLoading(false);
      },
      (error) => {
        console.error("Conversation error:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [conversationId, user]);

  /*
   * Load Messages & Sound/Visual Alerts
   */
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = subscribeToMessages(conversationId, (data) => {
      setMessages(data as ChatMessage[]);

      // Check if new incoming message arrived
      if (prevMessagesCountRef.current > 0 && data.length > prevMessagesCountRef.current) {
        const lastMsg = data[data.length - 1] as ChatMessage;
        if (lastMsg && user && lastMsg.senderId !== user.uid) {
          // Play incoming chime
          if (settings.audioCues) {
            speechService.playAudioCue("received");
          }

          // Visual Flash for deaf users
          if (settings.visualAlerts) {
            setFlashAlert(true);
            setTimeout(() => setFlashAlert(false), 900);
          }

          // Auto-TTS if enabled
          if (settings.autoSpeakIncoming && lastMsg.text) {
            speechService.speak(lastMsg.text);
          }
        }
      }

      prevMessagesCountRef.current = data.length;
    });

    return unsubscribe;
  }, [conversationId, user, settings]);

  /*
   * Auto Scroll
   */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /*
   * Send Message (supports text, speech, sign)
   */
  async function handleSend(customText?: string, inputType: "text" | "speech" | "sign" = "text") {
    const textToSend = (customText !== undefined ? customText : text).trim();

    if (!textToSend || !user || !conversationId || !conversation) {
      return;
    }

    const otherUserId = conversation.participants.find((id) => id !== user.uid);
    if (!otherUserId) {
      console.error("Receiver not found.");
      return;
    }

    if (customText === undefined) {
      setText("");
    }

    try {
      if (settings.audioCues) {
        speechService.playAudioCue("sent");
      }

      await sendMessage(
        conversationId,
        user.uid,
        otherUserId,
        textToSend,
        inputType
      );
    } catch (error) {
      console.error("Failed to send message:", error);
      if (customText === undefined) {
        setText(textToSend);
      }
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSend();
    }
  }

  const handleSpeakMessage = (msgText: string) => {
    speechService.speak(msgText);
  };

  const handleWatchSignAvatar = (msg: ChatMessage) => {
    setActiveAvatarMessage(msg);
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white font-medium">
        Loading Assistive Chat...
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-white text-center">
        <h2 className="text-xl font-bold">Conversation not found</h2>
        <p className="text-sm text-slate-400 mt-2">This chat may have been removed or is inaccessible.</p>
        <button
          onClick={() => navigate("/chats")}
          className="mt-5 rounded-2xl bg-emerald-500 px-6 py-3 font-bold text-black hover:bg-emerald-400 transition"
        >
          Back to chats
        </button>
      </div>
    );
  }

  const otherUserId = conversation.participants.find((id) => id !== user.uid);
  const otherUserName = otherUserId
    ? conversation.participantNames[otherUserId] || "Convo Friend"
    : "Convo Friend";

  return (
    <div
      className={`relative flex h-screen flex-col bg-slate-950 text-white transition-all ${
        flashAlert ? "ring-8 ring-inset ring-emerald-400" : ""
      }`}
    >
      <NetworkStatusBanner />

      {/* HEADER */}
      <header className="flex items-center justify-between border-b border-white/10 bg-slate-950/90 backdrop-blur px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/chats")}
            className="rounded-full p-2 transition hover:bg-white/10 text-slate-300"
            title="Back to chats"
          >
            <ArrowLeft size={21} />
          </button>

          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 font-bold text-black text-lg">
            {otherUserName.charAt(0).toUpperCase()}
          </div>

          <div>
            <h1 className="font-bold text-base leading-tight flex items-center gap-2">
              <span>{otherUserName}</span>
            </h1>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <span>●</span> Two-Way Assistive Active
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSignCamera(true)}
            title="Sign Language Camera"
            className="flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs text-emerald-300 border border-slate-700 transition"
          >
            <span className="text-base">🤟</span>
            <span className="hidden sm:inline">Sign Camera</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSpeechModal(true)}
            title="Voice Input (Speech to Text)"
            className="flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs text-blue-300 border border-slate-700 transition"
          >
            <Mic size={15} />
            <span className="hidden sm:inline">Voice Input</span>
          </button>
        </div>
      </header>

      {/* MESSAGES LIST */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 text-3xl">
                💬
              </div>
              <h2 className="font-bold text-lg text-white">
                Start assistive chatting with {otherUserName}
              </h2>
              <p className="mt-1 text-sm text-slate-400 max-w-sm">
                Communicate seamlessly via Speech, Text, or Sign Language. Every message can be read aloud or animated in sign language!
              </p>
            </div>
          )}

          {messages.map((message) => {
            const isMine = message.senderId === user.uid;

            return (
              <div
                key={message.id}
                className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
              >
                <div
                  className={`group relative max-w-[85%] sm:max-w-[75%] rounded-3xl px-4 py-3 transition shadow-sm ${
                    isMine
                      ? "rounded-br-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-black"
                      : "rounded-bl-sm bg-slate-900 border border-slate-800 text-white"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {message.text}
                  </p>

                  {/* Message Metadata & Assistive Actions */}
                  <div
                    className={`mt-2 flex items-center justify-between gap-3 text-[11px] pt-1 border-t ${
                      isMine ? "border-black/15 text-black/80" : "border-slate-800 text-slate-400"
                    }`}
                  >
                    <span className="flex items-center gap-1 font-semibold uppercase tracking-wider text-[10px]">
                      {message.inputType === "sign" && "🤟 Sign Language"}
                      {message.inputType === "speech" && "🎙️ Speech-to-Text"}
                      {message.inputType === "text" && "⌨️ Text"}
                    </span>

                    {/* Quick TTS and Sign Avatar Buttons */}
                    <div className="flex items-center gap-1.5">
                      {/* Speak Aloud Button */}
                      <button
                        type="button"
                        onClick={() => handleSpeakMessage(message.text)}
                        title="Read aloud (Text → Speech)"
                        className={`rounded-lg p-1.5 transition ${
                          isMine
                            ? "hover:bg-black/15 text-black"
                            : "hover:bg-slate-800 text-slate-300"
                        }`}
                      >
                        <Volume2 size={14} />
                      </button>

                      {/* Sign Avatar Play Button */}
                      <button
                        type="button"
                        onClick={() => handleWatchSignAvatar(message)}
                        title="Watch Animated Sign Avatar (Text → Sign)"
                        className={`rounded-lg p-1.5 transition ${
                          isMine
                            ? "hover:bg-black/15 text-black font-bold"
                            : "hover:bg-slate-800 text-emerald-400"
                        }`}
                      >
                        🤟
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* QUICK ASSISTIVE PHRASES BAR */}
      <div className="border-t border-slate-800/80 bg-slate-950/95 px-3 py-2">
        <div className="mx-auto flex max-w-3xl items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider shrink-0">
            Quick:
          </span>
          {QUICK_ASSISTIVE_PHRASES.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(chip.text, "text")}
              className="shrink-0 rounded-xl bg-slate-900 hover:bg-slate-800 hover:border-emerald-500/50 border border-slate-800 px-3 py-1.5 text-xs text-slate-200 transition"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* COMPOSER FOOTER */}
      <footer className="border-t border-white/10 bg-slate-950 px-3 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          {/* SIGN CAMERA BUTTON */}
          <button
            type="button"
            onClick={() => setShowSignCamera(true)}
            title="Sign language camera recognition"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-xl hover:bg-emerald-500/25 border border-emerald-500/30 transition text-emerald-300"
          >
            🤟
          </button>

          {/* SPEECH BUTTON */}
          <button
            type="button"
            onClick={() => setShowSpeechModal(true)}
            title="Voice input (Speech to text)"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 transition"
          >
            <Mic size={20} />
          </button>

          {/* TEXT INPUT */}
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type, speak, or sign a message..."
            className="min-w-0 flex-1 rounded-2xl bg-white/5 border border-slate-800 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />

          {/* SEND BUTTON */}
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!text.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-30 font-bold shadow-lg"
          >
            <Send size={18} />
          </button>
        </div>

        {/* Feature summary indicators */}
        <div className="mx-auto mt-2 flex max-w-3xl justify-center gap-6 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Mic size={12} className="text-blue-400" /> Speech ↔ Text
          </span>
          <span className="flex items-center gap-1">
            <Volume2 size={12} className="text-cyan-400" /> Text ↔ Speech
          </span>
          <span className="flex items-center gap-1">
            <span>🤟</span> Camera Gesture & Avatar
          </span>
        </div>
      </footer>

      {/* MODALS */}
      {showSignCamera && (
        <SignCameraModal
          onInsertText={(recognizedText, asSign) => {
            handleSend(recognizedText, asSign ? "sign" : "text");
          }}
          onClose={() => setShowSignCamera(false)}
        />
      )}

      {showSpeechModal && (
        <SpeechInputModal
          onInsertText={(spokenText, asSpeech) => {
            handleSend(spokenText, asSpeech ? "speech" : "text");
          }}
          onClose={() => setShowSpeechModal(false)}
        />
      )}

      {activeAvatarMessage && (
        <SignAvatarModal
          messageText={activeAvatarMessage.text}
          senderName={
            activeAvatarMessage.senderId === user.uid
              ? "You"
              : otherUserName
          }
          onClose={() => setActiveAvatarMessage(null)}
        />
      )}

      <AccessibilityToolbar onSettingsChange={(s) => setSettings(s)} />
    </div>
  );
}