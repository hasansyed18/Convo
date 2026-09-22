// VoiceAssistantContext: Global Hands-Free Multilingual Voice Assistant Provider for Convo
// Powers continuous voice listening, "Hey Convo" wake detection, Firestore queries, and Eyes-Free Blind Mode

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import {
  voiceAssistantService,
  type AssistantState,
} from "../services/voiceAssistantService";
import { BrowserSpeechRecognitionProvider } from "../services/speech/providers/BrowserSpeechRecognitionProvider";

interface VoiceAssistantContextType {
  isAssistantEnabled: boolean;
  assistantState: AssistantState;
  detectedLanguage: string;
  transcript: string;
  lastResponse: string;
  isEyesFreeMode: boolean;
  toggleAssistant: () => void;
  startActiveListening: () => void;
  stopListening: () => void;
  setEyesFreeMode: (enabled: boolean) => void;
  speak: (text: string) => void;
  setLanguage: (lang: string) => void;
}

const VoiceAssistantContext = createContext<VoiceAssistantContextType | undefined>(undefined);

export function VoiceAssistantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isAssistantEnabled, setIsAssistantEnabled] = useState(() => {
    return localStorage.getItem("convo_voice_assistant_enabled") !== "false";
  });
  const [assistantState, setAssistantState] = useState<AssistantState>(() => {
    const isEnabled = localStorage.getItem("convo_voice_assistant_enabled") !== "false";
    return isEnabled ? "LISTENING_FOR_WAKE" : "OFF";
  });
  const [detectedLanguage, setDetectedLanguage] = useState("en-IN");
  const [transcript, setTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [isEyesFreeMode, setIsEyesFreeMode] = useState(false);

  // References
  const speechProviderRef = useRef<BrowserSpeechRecognitionProvider | null>(null);
  const isSpeakingRef = useRef(false);
  const activeListeningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingRef = useRef(false);

  // Derive active conversationId from URL if inside `/chat/:conversationId`
  const chatMatch = location.pathname.match(/^\/chat\/([^/]+)$/);
  const activeConversationId = chatMatch ? chatMatch[1] : null;

  // Speak helper that coordinates with mic to prevent audio feedback loop
  const speakResponse = useCallback(
    (text: string, lang = detectedLanguage) => {
      if (!text) return;
      setLastResponse(text);
      setAssistantState("SPEAKING");
      isSpeakingRef.current = true;

      // Halt speech recognition while speaking to avoid hearing ourselves
      if (speechProviderRef.current) {
        void speechProviderRef.current.stop();
      }

      voiceAssistantService.speak(text, lang, () => {
        isSpeakingRef.current = false;
        if (isAssistantEnabled) {
          setAssistantState("LISTENING_FOR_WAKE");
          // Resume background listening after speaking
          setTimeout(() => {
            if (!isSpeakingRef.current && isAssistantEnabled && speechProviderRef.current) {
              void speechProviderRef.current.start({
                language: lang,
                continuous: true,
                interimResults: false,
                callbacks: speechCallbacksRef.current,
              });
            }
          }, 300);
        } else {
          setAssistantState("OFF");
        }
      });
    },
    [detectedLanguage, isAssistantEnabled]
  );

  // --------------------------------------------------------------------------
  // INTENT EXECUTION ENGINE
  // --------------------------------------------------------------------------
  const executeIntent = useCallback(
    async (rawSpeech: string) => {
      if (!user || isProcessingRef.current) return;
      isProcessingRef.current = true;
      setAssistantState("THINKING");

      const parsed = voiceAssistantService.parseIntent(rawSpeech, detectedLanguage);
      const currentLang = parsed.detectedLanguage || detectedLanguage;
      setDetectedLanguage(currentLang);
      const strings = voiceAssistantService.getLocalizedStrings(currentLang);

      try {
        switch (parsed.intent) {
          case "WAKE": {
            // User said "Hey Convo" with no following command
            voiceAssistantService.playEarcon("wake");
            speakResponse(strings.wakeGreeting, currentLang);
            break;
          }

          case "COUNT_TODAY_MESSAGES": {
            const { count, senders } =
              await voiceAssistantService.getTodayReceivedMessagesCount(user.uid);
            voiceAssistantService.playEarcon("success");
            const reply = strings.todayMessagesCount(count, senders);
            speakResponse(reply, currentLang);
            break;
          }

          case "READ_MESSAGES": {
            const targetName = parsed.params?.targetName;
            if (targetName) {
              // User specifically asked: "read the last message from Sarah"
              const lastMsg = await voiceAssistantService.getLastMessageFromContact(
                user.uid,
                targetName
              );
              if (!lastMsg) {
                voiceAssistantService.playEarcon("error");
                speakResponse(strings.chatNotFound(targetName), currentLang);
              } else if (!lastMsg.text) {
                voiceAssistantService.playEarcon("success");
                navigate(`/chat/${lastMsg.conversationId}`);
                speakResponse(
                  `Opened conversation with ${lastMsg.contactName}, but there are no messages yet.`,
                  currentLang
                );
              } else {
                voiceAssistantService.playEarcon("success");
                navigate(`/chat/${lastMsg.conversationId}`);
                const readout = `The last message from ${lastMsg.contactName} was at ${lastMsg.timeStr}: "${lastMsg.text}". Would you like to reply?`;
                speakResponse(readout, currentLang);
              }
              break;
            }

            if (activeConversationId) {
              // Inside an active conversation -> read latest messages
              const { chatName, messages } =
                await voiceAssistantService.getRecentMessagesForChat(
                  activeConversationId,
                  user.uid
                );
              if (messages.length === 0) {
                speakResponse(strings.noMessagesInChat, currentLang);
              } else {
                voiceAssistantService.playEarcon("success");
                let readout = strings.readingMessagesHeader(chatName, messages.length) + " ";
                messages.forEach((m) => {
                  readout += strings.messageItem(m.sender, m.text, m.time) + " ";
                });
                speakResponse(readout, currentLang);
              }
            } else {
              // Outside conversation -> summarize today's messages and offer to open
              const { count, senders } =
                await voiceAssistantService.getTodayReceivedMessagesCount(user.uid);
              if (count === 0) {
                speakResponse(strings.noMessagesToday, currentLang);
              } else {
                voiceAssistantService.playEarcon("success");
                const summary =
                  strings.todayMessagesCount(count, senders) +
                  " Say 'Open chat with' or 'Read the last message from' followed by a name.";
                speakResponse(summary, currentLang);
              }
            }
            break;
          }

          case "OPEN_CHAT": {
            const targetName = parsed.params?.targetName || "";
            const matched = await voiceAssistantService.findConversationByName(
              user.uid,
              targetName
            );
            if (matched) {
              voiceAssistantService.playEarcon("success");
              navigate(`/chat/${matched.conversationId}`);
              speakResponse(strings.chatOpened(matched.contactName), currentLang);
            } else {
              voiceAssistantService.playEarcon("error");
              speakResponse(strings.chatNotFound(targetName), currentLang);
            }
            break;
          }

          case "SEND_MESSAGE": {
            const targetName = parsed.params?.targetName || "";
            const textToSend = parsed.params?.text || "";

            const matched = await voiceAssistantService.findConversationByName(
              user.uid,
              targetName
            );

            if (!matched) {
              voiceAssistantService.playEarcon("error");
              speakResponse(strings.chatNotFound(targetName), currentLang);
              break;
            }

            navigate(`/chat/${matched.conversationId}`);

            if (textToSend) {
              // User said "Send message to Sarah saying [text]"
              const res = await voiceAssistantService.sendReply(
                matched.conversationId,
                user.uid,
                textToSend
              );
              if (res.success) {
                voiceAssistantService.playEarcon("success");
                speakResponse(strings.messageSent(matched.contactName, textToSend), currentLang);
              } else {
                voiceAssistantService.playEarcon("error");
                speakResponse(strings.sendFailed, currentLang);
              }
            } else {
              // User said "Send message to Sarah" without message text -> prompt user!
              voiceAssistantService.playEarcon("wake");
              const prompt = `Opened conversation with ${matched.contactName}. What would you like to send?`;
              speakResponse(prompt, currentLang);
            }
            break;
          }

          case "REPLY_CHAT": {
            const replyText = parsed.params?.text || "";
            if (!activeConversationId) {
              voiceAssistantService.playEarcon("error");
              speakResponse(strings.sendFailed, currentLang);
            } else if (!replyText) {
              speakResponse("What would you like me to say?", currentLang);
            } else {
              const res = await voiceAssistantService.sendReply(
                activeConversationId,
                user.uid,
                replyText
              );
              if (res.success) {
                voiceAssistantService.playEarcon("success");
                speakResponse(strings.messageSent(res.recipientName, replyText), currentLang);
              } else {
                voiceAssistantService.playEarcon("error");
                speakResponse(strings.sendFailed, currentLang);
              }
            }
            break;
          }

          case "NAVIGATE": {
            const route = parsed.params?.targetRoute || "/dashboard";
            const pageName = parsed.params?.targetName || "Page";
            voiceAssistantService.playEarcon("success");
            navigate(route);
            speakResponse(strings.navigatedTo(pageName), currentLang);
            break;
          }

          case "WHERE_AM_I": {
            let pageName = "Dashboard";
            let details = "You can view quick stats and shortcuts.";
            if (location.pathname.startsWith("/chat/")) {
              pageName = "Active Chat";
              details = "Say 'Read messages' to hear the latest conversation, or 'Reply with' to send a message.";
            } else if (location.pathname === "/chats") {
              pageName = "Conversations List";
              details = "Say 'Open chat with' followed by a person's name.";
            } else if (location.pathname === "/face-to-face") {
              pageName = "Face-to-Face Interpreter";
            } else if (location.pathname === "/contacts") {
              pageName = "Contacts and Friends";
            } else if (location.pathname === "/dictionary") {
              pageName = "Sign Language Dictionary";
            }
            speakResponse(strings.currentScreenDescription(pageName, details), currentLang);
            break;
          }

          case "SWITCH_LANGUAGE": {
            const newLang = parsed.params?.targetLanguage || "en-IN";
            setDetectedLanguage(newLang);
            const newStrings = voiceAssistantService.getLocalizedStrings(newLang);
            voiceAssistantService.playEarcon("success");
            speakResponse(newStrings.languageSwitched(newLang), newLang);
            break;
          }

          case "TOGGLE_EYES_FREE": {
            setIsEyesFreeMode((prev) => {
              const next = !prev;
              voiceAssistantService.playEarcon("success");
              speakResponse(next ? strings.eyesFreeEnabled : strings.eyesFreeDisabled, currentLang);
              return next;
            });
            break;
          }

          case "HELP": {
            voiceAssistantService.playEarcon("success");
            speakResponse(strings.helpMenu, currentLang);
            break;
          }

          case "UNKNOWN":
          default: {
            voiceAssistantService.playEarcon("error");
            speakResponse(strings.commandNotUnderstood, currentLang);
            break;
          }
        }
      } catch (err) {
        console.error("Voice assistant error:", err);
        voiceAssistantService.playEarcon("error");
        speakResponse(strings.commandNotUnderstood, currentLang);
      } finally {
        isProcessingRef.current = false;
      }
    },
    [user, detectedLanguage, activeConversationId, location.pathname, navigate, speakResponse]
  );

  // --------------------------------------------------------------------------
  // SPEECH RECOGNITION CALLBACKS
  // --------------------------------------------------------------------------
  const speechCallbacksRef = useRef({
    onStateChange: (state: string) => {
      if (state === "LISTENING" && !isSpeakingRef.current && !isProcessingRef.current) {
        setAssistantState("LISTENING_FOR_WAKE");
      }
    },
    onInterimResult: (text: string) => {
      setTranscript(text);
    },
    onFinalResult: (text: string) => {
      setTranscript(text);
      if (!text.trim() || isSpeakingRef.current || isProcessingRef.current) return;

      const trimmed = text.trim();

      // Check if wake word present or if in active listening mode
      const isWake = voiceAssistantService.isWakeWord(trimmed);
      const stripped = voiceAssistantService.stripWakeWord(trimmed);

      if (isWake || stripped) {
        void executeIntent(trimmed);
      }
    },
    onError: (code: string, message: string) => {
      // Benign mobile pauses
      if (code === "no-speech" || code === "aborted") return;
      console.warn("Voice assistant recognition warning:", code, message);
    },
    onEnd: () => {
      // Auto-restart if assistant is active and not currently speaking
      if (isAssistantEnabled && !isSpeakingRef.current && !isProcessingRef.current) {
        setTimeout(() => {
          if (isAssistantEnabled && !isSpeakingRef.current && speechProviderRef.current) {
            void speechProviderRef.current.start({
              language: detectedLanguage,
              continuous: true,
              interimResults: false,
              callbacks: speechCallbacksRef.current,
            });
          }
        }, 120);
      }
    },
  });

  // --------------------------------------------------------------------------
  // ASSISTANT LIFECYCLE & INITIALIZATION
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!speechProviderRef.current) {
      speechProviderRef.current = new BrowserSpeechRecognitionProvider();
    }

    if (!isAssistantEnabled || !user) {
      if (speechProviderRef.current) {
        void speechProviderRef.current.stop();
      }
      return;
    }

    // Start background listening
    void speechProviderRef.current.start({
      language: detectedLanguage,
      continuous: true,
      interimResults: false,
      callbacks: speechCallbacksRef.current,
    });

    const activeTimeout = activeListeningTimeoutRef.current;

    return () => {
      if (speechProviderRef.current) {
        void speechProviderRef.current.stop();
      }
      if (activeTimeout) {
        clearTimeout(activeTimeout);
      }
    };
  }, [isAssistantEnabled, user, detectedLanguage]);

  // Public control methods
  const toggleAssistant = useCallback(() => {
    setIsAssistantEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("convo_voice_assistant_enabled", String(next));
      voiceAssistantService.playEarcon(next ? "wake" : "click");
      if (!next) {
        voiceAssistantService.stopSpeaking();
        if (speechProviderRef.current) void speechProviderRef.current.stop();
        setAssistantState("OFF");
      }
      return next;
    });
  }, []);

  const startActiveListening = useCallback(() => {
    voiceAssistantService.playEarcon("wake");
    setAssistantState("ACTIVE_LISTENING");
    if (speechProviderRef.current) {
      void speechProviderRef.current.start({
        language: detectedLanguage,
        continuous: false,
        interimResults: true,
        callbacks: speechCallbacksRef.current,
      });
    }
  }, [detectedLanguage]);

  const stopListening = useCallback(() => {
    voiceAssistantService.playEarcon("click");
    voiceAssistantService.stopSpeaking();
    if (speechProviderRef.current) {
      void speechProviderRef.current.stop();
    }
    setAssistantState("LISTENING_FOR_WAKE");
  }, []);

  const setEyesFreeMode = useCallback((enabled: boolean) => {
    setIsEyesFreeMode(enabled);
    voiceAssistantService.playEarcon(enabled ? "wake" : "click");
  }, []);

  const setLanguage = useCallback((lang: string) => {
    setDetectedLanguage(lang);
    if (speechProviderRef.current) {
      speechProviderRef.current.setLanguage(lang);
    }
  }, []);

  return (
    <VoiceAssistantContext.Provider
      value={{
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
        speak: speakResponse,
        setLanguage,
      }}
    >
      {children}
    </VoiceAssistantContext.Provider>
  );
}

export function useVoiceAssistant() {
  const context = useContext(VoiceAssistantContext);
  if (!context) {
    throw new Error("useVoiceAssistant must be used within a VoiceAssistantProvider");
  }
  return context;
}
