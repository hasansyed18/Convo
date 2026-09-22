import { X, Volume2, Sparkles } from "lucide-react";
import SignAvatar from "../sign/SignAvatar";
import { speechService } from "../../services/speechService";

interface SignAvatarModalProps {
  messageText: string;
  senderName?: string;
  onClose: () => void;
}

export default function SignAvatarModal({
  messageText,
  senderName = "Friend",
  onClose,
}: SignAvatarModalProps) {
  const handleSpeak = () => {
    speechService.speak(messageText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl max-h-[95vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-950/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 text-xl shadow-sm">
              🤟
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-none">
                Sign Language Translation
              </h3>
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <Sparkles size={11} />
                <span>Message from {senderName}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Avatar Presentation */}
        <div className="p-4 sm:p-5 flex flex-col items-center overflow-y-auto">
          <SignAvatar text={messageText} size="md" autoPlay={true} loop={true} className="w-full" />

          {/* Original Text & Audio Read Aloud */}
          <div className="w-full mt-4 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 shadow-inner">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Original Message:
              </span>
              <p className="text-sm text-slate-100 font-medium leading-relaxed mt-0.5">
                "{messageText}"
              </p>
            </div>

            <button
              onClick={handleSpeak}
              title="Speak message aloud (Text-to-Speech)"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-300 transition shrink-0 border border-slate-700 active:scale-95 shadow"
            >
              <Volume2 size={18} />
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs sm:text-sm font-bold text-slate-200 transition active:scale-95 shadow"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
