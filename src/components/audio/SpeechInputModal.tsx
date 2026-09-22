import { useEffect, useState, useCallback, useRef } from "react";
import {
  X,
  Mic,
  Volume2,
  Globe,
  Send,
  AlertCircle,
  RefreshCw,
  Edit3,
  Radio,
  Square,
  Keyboard,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { speechRecognitionManager } from "../../services/speech/SpeechRecognitionManager";
import { textToSpeechService } from "../../services/speech/textToSpeechService";
import {
  type RecognitionState,
  type SpeechErrorCode,
  SUPPORTED_SPEECH_LANGUAGES,
} from "../../services/speech/types";
import {
  audioNoiseService,
  type AudioNoiseStats,
} from "../../services/audioNoiseService";

interface SpeechInputModalProps {
  onInsertText: (text: string, asSpeechInput?: boolean) => void;
  onClose: () => void;
}

export default function SpeechInputModal({
  onInsertText,
  onClose,
}: SpeechInputModalProps) {
  const [state, setState] = useState<RecognitionState>("IDLE");
  const [selectedLanguage, setSelectedLanguage] = useState("en-IN");
  const [activeProviderId, setActiveProviderId] = useState(
    speechRecognitionManager.getActiveProvider().id
  );
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [confidence, setConfidence] = useState(0.9);
  const [errorCode, setErrorCode] = useState<SpeechErrorCode | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLocalVoiceMode, setIsLocalVoiceMode] = useState(false);

  // Audio Recording (Push-to-Talk)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [noiseStats, setNoiseStats] = useState<AudioNoiseStats>({
    volumePercent: 0,
    decibels: -100,
    noiseLevel: "quiet",
    waveform: new Array(32).fill(0),
  });

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isMountedRef = useRef(true);

  // Check if accessing over insecure remote network IP on mobile (which blocks mic in Chrome/Safari)
  const isNonSecureMobile =
    typeof window !== "undefined" &&
    !window.isSecureContext &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1";

  const isListening = state === "LISTENING";

  // Reactive waveform animation while listening to speech recognition
  useEffect(() => {
    if (!isListening || isRecordingAudio) {
      return;
    }

    const interval = setInterval(() => {
      if (!isMountedRef.current) return;
      const isSpeaking = Boolean(interimTranscript);
      const baseAmp = isSpeaking ? 0.75 : 0.35;
      const randVol = Math.floor(baseAmp * 45 + Math.random() * 25);
      const wave = Array.from({ length: 32 }, (_, i) => {
        const sin = Math.sin(Date.now() / 140 + i * 0.45);
        return sin * (baseAmp * 0.65 + Math.random() * 0.25);
      });

      setNoiseStats({
        volumePercent: randVol,
        decibels: -45 + Math.round(randVol * 0.4),
        noiseLevel: randVol > 30 ? "moderate" : "quiet",
        waveform: wave,
      });
    }, 90);

    return () => {
      clearInterval(interval);
      if (isMountedRef.current) {
        setNoiseStats({
          volumePercent: 0,
          decibels: -100,
          noiseLevel: "quiet",
          waveform: new Array(32).fill(0),
        });
      }
    };
  }, [isListening, isRecordingAudio, interimTranscript]);

  const startRecognition = useCallback(async (lang: string) => {
    setErrorCode(null);
    setErrorMessage("");
    setInterimTranscript("");

    speechRecognitionManager.setLanguage(lang);

    await speechRecognitionManager.start({
      onStateChange: (newState) => {
        if (isMountedRef.current) {
          setState(newState);
        }
      },
      onInterimResult: (text, conf) => {
        if (isMountedRef.current) {
          setInterimTranscript(text);
          if (conf > 0) setConfidence(conf);
        }
      },
      onFinalResult: (text, conf) => {
        if (isMountedRef.current) {
          setTranscript((prev) => {
            const cleanText = text.trim();
            if (!cleanText) return prev;
            // Prevent duplicate word appending if text already ends with this phrase
            if (prev.endsWith(cleanText)) return prev;
            return prev ? `${prev} ${cleanText}` : cleanText;
          });
          setInterimTranscript("");
          if (conf > 0) setConfidence(conf);
        }
      },
      onError: (code, message) => {
        if (isMountedRef.current) {
          setErrorCode(code);
          setErrorMessage(message);
          if (code === "network" || code === "not-allowed") {
            // Automatically surface Local Voice & Push-to-Talk Mode so user is not blocked
            setIsLocalVoiceMode(true);
            setState("IDLE");
          }
        }
      },
      onEnd: () => {
        if (isMountedRef.current) {
          setState("IDLE");
        }
      },
    });
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const timer = setTimeout(() => {
      void startRecognition(selectedLanguage);
    }, 0);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state !== "inactive") {
          try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
        }
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        }
        mediaRecorderRef.current = null;
      }
      speechRecognitionManager.stop();
      audioNoiseService.stopAnalyzing();
    };
  }, [selectedLanguage, startRecognition]);

  // Push-to-Talk Hardware Audio Recorder
  const handleStartAudioRecording = async () => {
    try {
      // Pause speech recognition to release any competing audio threads
      speechRecognitionManager.stop();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        setTranscript((prev) =>
          prev ? prev : `[🎤 Voice Message (${recordingSeconds || 2}s)]`
        );
      };

      // Feed the acquired audio stream directly to the local noise analyzer
      void audioNoiseService.startAnalyzing(stream, (stats) => {
        if (isMountedRef.current) {
          setNoiseStats(stats);
        }
      });

      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setIsRecordingAudio(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn("Could not acquire microphone for recording:", err);
    }
  };

  const handleStopAudioRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    audioNoiseService.stopAnalyzing();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
    }
    setIsRecordingAudio(false);
  };

  const handleQuickPhrase = (phraseText: string) => {
    setTranscript(phraseText);
    setInterimTranscript("");
    textToSpeechService.speak(phraseText, { lang: selectedLanguage });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleFocusWindowsTyping = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const currentLanguageObj =
    SUPPORTED_SPEECH_LANGUAGES.find((l) => l.code === selectedLanguage) ||
    SUPPORTED_SPEECH_LANGUAGES[0];

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setSelectedLanguage(newLang);
    speechRecognitionManager.stop();
    startRecognition(newLang);
  };

  const handleProviderChange = (providerId: string) => {
    speechRecognitionManager.stop();
    speechRecognitionManager.setProvider(providerId);
    setActiveProviderId(providerId);
    setIsLocalVoiceMode(false);
    startRecognition(selectedLanguage);
  };

  const handleRetry = () => {
    setIsLocalVoiceMode(false);
    startRecognition(selectedLanguage);
  };

  const handleStopListening = () => {
    speechRecognitionManager.stop();
    setState("IDLE");
  };

  const handleTestTTS = () => {
    const fullText = (transcript + " " + interimTranscript).trim();
    if (fullText) {
      textToSpeechService.speak(fullText, { lang: selectedLanguage });
    }
  };

  const handleSend = () => {
    const fullText = (transcript + " " + interimTranscript).trim();
    if (fullText) {
      onInsertText(fullText, true);
      onClose();
    }
  };

  const providers = speechRecognitionManager.getProviders();
  const confPercent = Math.round(confidence * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-950/90">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={isListening ? handleStopListening : handleRetry}
              title={isListening ? "Tap to pause listening" : "Tap to start listening"}
              className={`relative flex h-10 w-10 items-center justify-center rounded-2xl transition active:scale-95 ${
                isListening
                  ? "bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40"
                  : isLocalVoiceMode
                  ? "bg-cyan-500/20 text-cyan-400"
                  : state === "ERROR"
                  ? "bg-rose-500/20 text-rose-400"
                  : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
              }`}
            >
              <Mic size={20} className={isListening ? "animate-pulse" : ""} />
              {(isListening || isRecordingAudio) && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                Speech-to-Text Voice Input
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                {/* State Badge */}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    isListening
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : isRecordingAudio
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse"
                      : isLocalVoiceMode
                      ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                      : state === "PROCESSING"
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : state === "SUCCESS"
                      ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                      : state === "ERROR"
                      ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  ●{" "}
                  {isRecordingAudio
                    ? `RECORDING (${recordingSeconds}s)`
                    : isLocalVoiceMode
                    ? "LOCAL VOICE ACTIVE"
                    : state}
                </span>

                <span className="text-xs text-slate-400">
                  {isRecordingAudio
                    ? "Capturing microphone..."
                    : isListening
                    ? "Speak into microphone"
                    : isLocalVoiceMode
                    ? "Tap Start or Quick Phrases"
                    : "Ready"}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Non-secure origin / Mobile IP warning banner */}
          {isNonSecureMobile && (
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 space-y-1.5 animate-in fade-in">
              <div className="flex items-start gap-2 text-xs text-amber-200">
                <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-white">
                    Mobile HTTPS Notice ({window.location.hostname})
                  </p>
                  <p className="text-[11px] text-amber-300/85 leading-relaxed">
                    Mobile Chrome & Safari restrict microphone access on plain HTTP over local Wi-Fi IPs. To test voice input on mobile:
                  </p>
                  <ul className="list-disc list-inside text-[11px] text-amber-300/80 space-y-0.5 pl-1">
                    <li>Deploy to <strong>Vercel</strong> for automatic free HTTPS</li>
                    <li>Or use USB port-forwarding (<code className="bg-slate-850 px-1 py-0.5 rounded text-cyan-300 font-mono">chrome://inspect</code>) to access via <code className="bg-slate-850 px-1 py-0.5 rounded text-cyan-300 font-mono">localhost:5173</code></li>
                    <li>Or use the <strong>Quick Speech Soundboard</strong> & <strong>Voice Recording</strong> below</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Controls Bar: Language + Provider Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Language Selector */}
            <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-2xl px-3 py-2">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                <Globe size={14} className="text-blue-400" />
                <span>Lang:</span>
              </div>
              <select
                value={selectedLanguage}
                onChange={handleLanguageChange}
                className="bg-slate-800 text-white text-xs rounded-xl px-2 py-1 border border-slate-700 outline-none focus:border-emerald-500"
              >
                {SUPPORTED_SPEECH_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Provider Selector */}
            <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-2xl px-3 py-2">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                <Radio size={14} className="text-purple-400" />
                <span>Provider:</span>
              </div>
              <select
                value={activeProviderId}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="bg-slate-800 text-white text-xs rounded-xl px-2 py-1 border border-slate-700 outline-none focus:border-emerald-500 truncate max-w-[140px]"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Real-time Hardware Audio Waveform & Level */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                <Volume2 size={14} className="text-emerald-400" />
                Microphone Activity & Spectrum
              </span>

              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  isListening || isRecordingAudio
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {isListening ? "Listening Active" : isRecordingAudio ? "Recording..." : "Idle"}
              </span>
            </div>

            {/* Live Waveform Bars */}
            <div className="flex items-center justify-center gap-1 h-10 px-1">
              {noiseStats.waveform.map((val, idx) => {
                const heightPct = Math.max(
                  8,
                  Math.min(100, Math.abs(val) * 240 + noiseStats.volumePercent * 0.8)
                );
                return (
                  <div
                    key={idx}
                    style={{ height: `${heightPct}%` }}
                    className={`flex-1 rounded-full transition-all duration-75 ${
                      isListening || isRecordingAudio
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                        : "bg-slate-700/60"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Error Message Display (e.g. mic permission denied) */}
          {errorMessage && !isLocalVoiceMode && (
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/25 p-3.5 space-y-2">
              <div className="flex items-start gap-2 text-xs text-rose-300">
                <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p>{errorMessage}</p>
                  {errorCode && (
                    <span className="font-mono text-[10px] text-rose-400/80 uppercase">
                      Code: {errorCode}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Local Voice Mode Notice if Cloud Speech is firewalled/offline */}
          {isLocalVoiceMode && (
            <div className="rounded-2xl bg-cyan-950/40 border border-cyan-500/30 p-3.5 space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2 text-xs text-cyan-200">
                <CheckCircle2 size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-white">
                    Local Voice Suite Active (No Network Required)
                  </p>
                  <p className="text-[11px] text-cyan-300/80 leading-relaxed">
                    Browser cloud speech recognition is unreachable on this connection.
                    Use <strong>Record Voice Audio Note</strong>,{" "}
                    <strong>Windows Voice Typing (Win + H)</strong>, or the{" "}
                    <strong>Quick Speech Soundboard</strong> below.
                  </p>
                </div>
              </div>

              {/* Push-to-Talk Audio Clip Button */}
              <div className="flex items-center gap-2 pt-1">
                {!isRecordingAudio ? (
                  <button
                    type="button"
                    onClick={handleStartAudioRecording}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white py-2 text-xs font-bold transition shadow active:scale-98"
                  >
                    <Mic size={14} /> Record Voice Audio Note
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopAudioRecording}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black py-2 text-xs font-bold transition shadow animate-pulse active:scale-98"
                  >
                    <Square size={14} /> Stop Recording ({recordingSeconds}s)
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleRetry}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 text-xs font-semibold transition active:scale-98"
                >
                  <RefreshCw size={12} /> Retry Speech STT
                </button>
              </div>

              {/* Audio Playback if recorded */}
              {recordedAudioUrl && (
                <div className="pt-1.5">
                  <audio controls src={recordedAudioUrl} className="w-full h-8" />
                </div>
              )}
            </div>
          )}

          {/* Windows Voice Typing Tip Card */}
          <div
            onClick={handleFocusWindowsTyping}
            className="rounded-2xl bg-slate-950/70 border border-slate-800/90 p-3 flex items-center justify-between cursor-pointer hover:border-cyan-500/40 transition group"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 group-hover:scale-105 transition-transform">
                <Keyboard size={16} />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">
                  Windows / Mobile Neural Voice Typing
                </p>
                <p className="text-[10px] text-slate-400">
                  Tap text box & press <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300 font-mono">Win + H</kbd> or mobile keyboard 🎙️ mic icon
                </p>
              </div>
            </div>
          </div>

          {/* Quick Spoken Phrases Soundboard (Localized) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Volume2 size={13} className="text-cyan-400" />
                Quick Assistive Speech ({currentLanguageObj.flag} {currentLanguageObj.label}):
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Tap to dictate & speak
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {currentLanguageObj.quickPhrases.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickPhrase(p.label)}
                  className="flex items-center gap-2 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 p-2.5 text-left text-xs text-slate-200 hover:text-white transition active:scale-98"
                >
                  <span className="text-base shrink-0">{p.emoji}</span>
                  <span className="truncate">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Transcript & Editable Composer */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 relative">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <Edit3 size={13} className="text-cyan-400" />
                Candidate Message (Editable):
              </span>

              {(transcript || interimTranscript) && (
                <button
                  type="button"
                  onClick={handleTestTTS}
                  title="Test Text-to-Speech playback"
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold transition"
                >
                  <Volume2 size={13} /> 🔊 Listen
                </button>
              )}
            </div>

            <textarea
              ref={textareaRef}
              value={
                interimTranscript
                  ? transcript
                    ? `${transcript} ${interimTranscript}`
                    : interimTranscript
                  : transcript
              }
              onChange={(e) => {
                setTranscript(e.target.value);
                setInterimTranscript("");
              }}
              placeholder="Speak into microphone, use mobile keyboard mic, or tap a quick phrase..."
              rows={3}
              className="w-full bg-transparent text-white text-sm sm:text-base leading-relaxed outline-none resize-none placeholder:text-slate-500 placeholder:italic"
            />

            {/* Interim Results Tag & Confidence */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/60">
              <div className="flex items-center gap-2">
                <span>Confidence:</span>
                <span
                  className={`font-mono font-bold ${
                    confPercent >= 80
                      ? "text-emerald-400"
                      : confPercent >= 60
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {confPercent}%
                </span>
                {interimTranscript && (
                  <span className="text-[10px] text-amber-400 italic">
                    (transcribing...)
                  </span>
                )}
              </div>

              {transcript && (
                <button
                  type="button"
                  onClick={() => {
                    setTranscript("");
                    setInterimTranscript("");
                    setRecordedAudioUrl(null);
                  }}
                  className="text-slate-400 hover:text-slate-200 text-[11px] transition"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex gap-2">
            {isListening ? (
              <button
                type="button"
                onClick={handleStopListening}
                className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 py-3 text-xs sm:text-sm font-semibold text-slate-200 transition border border-slate-700 active:scale-98"
              >
                Stop Listening
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRetry}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 py-3 text-xs sm:text-sm font-bold text-white transition shadow-lg shadow-blue-600/20 active:scale-98"
              >
                <Mic size={14} /> Start Listening
              </button>
            )}

            <button
              type="button"
              onClick={handleSend}
              disabled={!transcript.trim() && !interimTranscript.trim()}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed py-3 text-xs sm:text-sm font-bold text-black transition shadow-lg active:scale-98"
            >
              <Send size={15} /> Confirm & Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
