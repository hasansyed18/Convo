import { useState } from "react";
import { ArrowLeft, Search, Camera, BookOpen, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SignAvatar from "../components/sign/SignAvatar";
import SignCameraModal from "../components/sign/SignCameraModal";
import { SIGN_DICTIONARY, type SignItem } from "../services/signDictionaryService";

const CATEGORIES = [
  { id: "all", label: "All Signs" },
  { id: "phrases", label: "✨ Phrases" },
  { id: "greetings", label: "👋 Greetings" },
  { id: "courtesy", label: "🙏 Courtesy" },
  { id: "needs", label: "💧 Needs" },
  { id: "responses", label: "✊ Responses" },
  { id: "questions", label: "❓ Questions" },
  { id: "common", label: "🤟 Common" },
];

export default function SignDictionary() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedSign, setSelectedSign] = useState<SignItem>(SIGN_DICTIONARY.hello);
  const [customPhrase, setCustomPhrase] = useState("");
  const [showPracticeCamera, setShowPracticeCamera] = useState(false);

  const signs = Object.values(SIGN_DICTIONARY);

  const filteredSigns = signs.filter((s) => {
    const matchesCategory = activeCategory === "all" || s.category === activeCategory;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;

    const matchesSearch =
      s.name.toLowerCase().includes(query) ||
      s.category.toLowerCase().includes(query) ||
      s.aliases.some((a) => a.toLowerCase().includes(query));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/90 backdrop-blur px-6 py-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-slate-900 transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-bold text-lg text-white">Sign Language & Gesture Dictionary</h1>
            <p className="text-xs text-emerald-400">
              Articulated Avatar Kinematics, Hand Anatomy & Conversational Phrases
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowPracticeCamera(true)}
          className="flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 font-bold text-xs transition shadow-lg"
        >
          <Camera size={16} /> Practice with Camera
        </button>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Directory, Category Pills & Search */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* Search bar */}
          <div className="flex items-center gap-3 rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3">
            <Search size={18} className="text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search signs, phrases, words (e.g. 'How are you', 'Water', 'Love')..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500 text-white"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeCategory === cat.id
                    ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                    : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Custom Text Translator Bar */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <BookOpen size={14} className="text-emerald-400" />
              <span>Translate Sentence to Animated Sign Sequence:</span>
            </h3>
            <div className="flex gap-2">
              <input
                value={customPhrase}
                onChange={(e) => setCustomPhrase(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customPhrase.trim()) {
                    setSelectedSign({
                      ...selectedSign,
                      name: customPhrase.trim(),
                    });
                  }
                }}
                placeholder="Type any sentence (e.g. 'How are you doing today?')..."
                className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500 text-white placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (customPhrase.trim()) {
                    setSelectedSign({
                      ...selectedSign,
                      name: customPhrase.trim(),
                    });
                  }
                }}
                className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 text-xs font-bold transition shrink-0"
              >
                Translate
              </button>
            </div>
          </div>

          {/* Gestures Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[550px] overflow-y-auto pr-1">
            {filteredSigns.map((sign) => {
              const isSelected = selectedSign.id === sign.id && !customPhrase;
              const isPhrase = sign.category === "phrases";
              return (
                <button
                  key={sign.id}
                  onClick={() => {
                    setSelectedSign(sign);
                    setCustomPhrase("");
                  }}
                  className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition ${
                    isSelected
                      ? "bg-emerald-500/15 border-emerald-500/60 shadow-md shadow-emerald-500/10"
                      : "bg-slate-900/80 border-slate-800 hover:bg-slate-800/80"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-2xl">{sign.emoji}</span>
                    {isPhrase && (
                      <span className="flex items-center gap-0.5 text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-semibold">
                        <Sparkles size={8} /> Phrase
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-white text-sm line-clamp-1">{sign.name}</span>
                  <span className="text-[10px] text-slate-400 capitalize mt-0.5">
                    {sign.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Col: Interactive Articulated Avatar & Hand Inspector */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full sticky top-24 space-y-4">
            <SignAvatar
              text={customPhrase || selectedSign.name}
              signId={customPhrase ? undefined : selectedSign.id}
              size="lg"
              autoPlay={true}
              loop={true}
            />

            {/* Detailed Gesture Instructions Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <span>Anatomical Guidance:</span>
                  <span className="text-emerald-400">{selectedSign.name}</span>
                </h4>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono uppercase">
                  {selectedSign.handDetails.shape.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedSign.description}
              </p>
              <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Palm Orientation: <strong className="text-emerald-400 uppercase">{selectedSign.handDetails.orientation}</strong></span>
                <span>Category: <strong className="text-slate-300 capitalize">{selectedSign.category}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Practice with Camera Modal */}
      {showPracticeCamera && (
        <SignCameraModal
          onInsertText={(recognized) => {
            alert(`Great job! You signed: "${recognized}"`);
          }}
          onClose={() => setShowPracticeCamera(false)}
        />
      )}
    </div>
  );
}
