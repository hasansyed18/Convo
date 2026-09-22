// Production-grade Hands-Free Voice Assistant Service for Convo
// Supports wake-word detection ("Hey Convo"), multilingual native language detection,
// real Firestore querying for today's messages, chat navigation, reading messages aloud, and hands-free replies.

import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { sendMessage } from "./messageService";
import { textToSpeechService } from "./speech/textToSpeechService";
import { getAssistantStrings } from "./voiceAssistantTranslations";

export type AssistantState =
  | "OFF"
  | "LISTENING_FOR_WAKE"
  | "ACTIVE_LISTENING"
  | "THINKING"
  | "SPEAKING";

export interface ParsedVoiceIntent {
  intent:
    | "WAKE"
    | "COUNT_TODAY_MESSAGES"
    | "READ_MESSAGES"
    | "OPEN_CHAT"
    | "REPLY_CHAT"
    | "SEND_MESSAGE"
    | "NAVIGATE"
    | "WHERE_AM_I"
    | "HELP"
    | "SWITCH_LANGUAGE"
    | "TOGGLE_EYES_FREE"
    | "UNKNOWN";
  params?: {
    targetName?: string;
    text?: string;
    targetRoute?: string;
    targetLanguage?: string;
  };
  detectedLanguage: string;
}

export class VoiceAssistantService {
  private audioCtx: AudioContext | null = null;

  // --------------------------------------------------------------------------
  // AUDIO EARCONS (Web Audio API Synthesizer - 100% Client-Side & Asset-Free)
  // --------------------------------------------------------------------------
  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const win = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const AudioCtx = win.AudioContext || win.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.audioCtx) {
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === "suspended") {
      void this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public playEarcon(type: "wake" | "success" | "error" | "click"): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === "wake") {
        // Ascending pleasant chord (C5 - E5 - G5)
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          gain.gain.setValueAtTime(0, now + i * 0.08);
          gain.gain.linearRampToValueAtTime(0.18, now + i * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.24);
        });
      } else if (type === "success") {
        // Bright confirmation chime (G5 -> C6)
        [783.99, 1046.5].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + i * 0.1);
          gain.gain.setValueAtTime(0, now + i * 0.1);
          gain.gain.linearRampToValueAtTime(0.15, now + i * 0.1 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.28);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.3);
        });
      } else if (type === "error") {
        // Soft descending alert (E5 -> C5)
        [659.25, 523.25].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + i * 0.12);
          gain.gain.setValueAtTime(0.12, now + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.24);
        });
      } else if (type === "click") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch {
      // Audio context silenced or blocked
    }
  }

  // --------------------------------------------------------------------------
  // MULTILINGUAL NATIVE LANGUAGE DETECTOR
  // --------------------------------------------------------------------------
  public detectLanguage(text: string, currentFallback = "en-IN"): string {
    const trimmed = text.trim();
    if (!trimmed) return currentFallback;

    // 1. Unicode Script Matching
    if (/[\u0900-\u097F]/.test(trimmed)) {
      // Devanagari script: Hindi (default) or Marathi
      if (/\b(आहे|नाही|कसे|माझे|माझा|करू|सांगा)\b/i.test(trimmed)) {
        return "mr-IN";
      }
      return "hi-IN";
    }
    if (/[\u0B80-\u0BFF]/.test(trimmed)) return "ta-IN"; // Tamil
    if (/[\u0C00-\u0C7F]/.test(trimmed)) return "te-IN"; // Telugu
    if (/[\u0980-\u09FF]/.test(trimmed)) return "bn-IN"; // Bengali
    if (/[\u0600-\u06FF]/.test(trimmed)) {
      // Arabic / Urdu
      if (/\b(کیا|کیسے|آپ|پیغام|شکریہ)\b/i.test(trimmed)) return "ur-IN";
      return "ar-SA";
    }
    if (/[\u0A80-\u0AFF]/.test(trimmed)) return "gu-IN"; // Gujarati
    if (/[\u0C80-\u0CFF]/.test(trimmed)) return "kn-IN"; // Kannada
    if (/[\u0D00-\u0D7F]/.test(trimmed)) return "ml-IN"; // Malayalam
    if (/[\u0A00-\u0A7F]/.test(trimmed)) return "pa-IN"; // Punjabi

    // 2. Lexical & Marker Matching for Latin alphabets
    const lower = trimmed.toLowerCase();

    // Spanish markers
    if (
      /\b(hola|mensajes?|abrir|cu[aá]ntos?|ayuda|responder|leer|gracias|por favor|qui[eé]n)\b/i.test(
        lower
      )
    ) {
      return "es-ES";
    }

    // French markers
    if (
      /\b(bonjour|messages?|ouvrir|combien|aide|r[eé]pondre|lire|merci|s'il vous pla[iî]t)\b/i.test(
        lower
      )
    ) {
      return "fr-FR";
    }

    // German markers
    if (
      /\b(hallo|nachrichten?|wieviele|hilfe|antworten|lesen|danke|bitte|[oö]ffnen)\b/i.test(
        lower
      )
    ) {
      return "de-DE";
    }

    // Hinglish (Romanized Hindi)
    if (
      /\b(namaste|kaise|kitne|sandesh|khol|bolo|batao|kripya|madad|jawab|karo)\b/i.test(
        lower
      )
    ) {
      return "hi-IN";
    }

    // Default to current fallback or English (India)
    return currentFallback || "en-IN";
  }

  // --------------------------------------------------------------------------
  // WAKE WORD DETECTION
  // --------------------------------------------------------------------------
  public isWakeWord(rawText: string): boolean {
    const text = rawText.toLowerCase().trim();
    // Wake phrases: Hey Convo, OK Convo, Convo, Hello Convo, Listen Convo
    const wakePatterns = [
      /\b(hey|ok|okay|hi|hello|listen)\s+convo\b/i,
      /\bconvo\b/i,
      /\b(hey|ok|okay|hi|hello)\s+kombo\b/i,
      /\bkombo\b/i,
      /\b(अरे|सुनो|हे)\s+कॉन्वो\b/i,
      /\bकॉन्वो\b/i,
      /\b(oye|hola)\s+convo\b/i,
      /\b(dis|salut)\s+convo\b/i,
    ];
    return wakePatterns.some((regex) => regex.test(text));
  }

  public stripWakeWord(rawText: string): string {
    return rawText
      .replace(/\b(hey|ok|okay|hi|hello|listen|oye|hola|dis|salut)\s+(convo|kombo)\b/gi, "")
      .replace(/\b(convo|kombo)\b/gi, "")
      .replace(/\b(अरे|सुनो|हे)\s+कॉन्वो\b/gi, "")
      .replace(/\bकॉन्वो\b/gi, "")
      .trim();
  }

  // --------------------------------------------------------------------------
  // INTENT PARSER & COMMAND MATCHER
  // --------------------------------------------------------------------------
  public parseIntent(rawInput: string, fallbackLang = "en-IN"): ParsedVoiceIntent {
    const detectedLanguage = this.detectLanguage(rawInput, fallbackLang);
    const text = this.stripWakeWord(rawInput).toLowerCase().trim();

    // If input was ONLY the wake word (e.g. user just said "Hey Convo")
    if (!text || text === "") {
      return { intent: "WAKE", detectedLanguage };
    }

    // 1. COUNT TODAY'S MESSAGES
    if (
      /\b(how many|count|check|any)\b.*\bmessages?\b/i.test(text) ||
      /\bmessages?\s+(today|received|new)\b/i.test(text) ||
      /\b(kitne|aaj ke)\s+(messages?|sandesh)\b/i.test(text) ||
      /\b(कितने|आज)\s*(मैसेज|संदेश)\b/i.test(text) ||
      /\bcu[aá]ntos?\s+mensajes?\b/i.test(text) ||
      /\bcombien\s+de\s+messages?\b/i.test(text) ||
      /\bwieviel.*\bnachrichten?\b/i.test(text) ||
      /\bكم\s+عدد\s+الرسائل\b/i.test(text) ||
      /\bஎத்தனை\s+செய்தி\b/i.test(text) ||
      /\bఎన్ని\s+మెసేజ్\b/i.test(text)
    ) {
      return { intent: "COUNT_TODAY_MESSAGES", detectedLanguage };
    }

    // 2. READ MESSAGES
    if (
      /\b(read|speak|listen to|what did.*say)\b.*\bmessages?\b/i.test(text) ||
      /\bread\s+(the\s+)?(chat|latest|last|un?read)\b/i.test(text) ||
      /\b(मैसेज|संदेश|बातचीत)\s*(पढ़ो|सुनाओ)\b/i.test(text) ||
      /\b(kya likha|padho|sunao)\b/i.test(text) ||
      /\blee(r)?\s+(los\s+)?mensajes?\b/i.test(text) ||
      /\blis(e)?\s+(les\s+)?messages?\b/i.test(text) ||
      /\blies\s+(die\s+)?nachrichten?\b/i.test(text) ||
      /\bاقرأ\s+الرسائل\b/i.test(text) ||
      /\bசெய்திகளைப்\s*படி\b/i.test(text) ||
      /\bమెసేజ్‌లు\s*చదువు\b/i.test(text)
    ) {
      return { intent: "READ_MESSAGES", detectedLanguage };
    }

    // 3. REPLY WITH [TEXT]
    const replyRegex =
      /^(?:reply|respond|answer|say|tell them)(?:\s+with|\s+that|\s+saying)?\s+(.+)$/i;
    const hindiReplyRegex = /^(?:जवाब दो|रिप्लाई करो|कहो)\s*(.+)$/i;
    const spanishReplyRegex = /^(?:responder|responde)(?:\s+con)?\s+(.+)$/i;
    const frenchReplyRegex = /^(?:r[eé]pondre|r[eé]ponds)(?:\s+avec)?\s+(.+)$/i;
    const germanReplyRegex = /^(?:antworte|antworten)(?:\s+mit)?\s+(.+)$/i;

    const replyMatch =
      text.match(replyRegex) ||
      text.match(hindiReplyRegex) ||
      text.match(spanishReplyRegex) ||
      text.match(frenchReplyRegex) ||
      text.match(germanReplyRegex);

    if (replyMatch && replyMatch[1]) {
      return {
        intent: "REPLY_CHAT",
        params: { text: replyMatch[1].trim() },
        detectedLanguage,
      };
    }

    // 4. OPEN CHAT WITH [NAME]
    const openChatRegex =
      /\b(?:open|show|start|go to)(?:\s+chat|\s+conversation)?\s+(?:with\s+)?([a-z0-9_\s]+?)(?:'s\s+chat)?$/i;
    const hindiOpenChatRegex =
      /([\p{L}\p{N}_\s]+?)\s*(?:की|का|से)?\s*(?:चैट|बातचीत)\s*(?:खोलो|दिखाओ)/iu;
    const spanishOpenChatRegex = /\b(?:abrir|abre)\s+(?:el\s+)?chat\s+(?:con|de)\s+([a-z0-9_\s]+)$/i;

    const openMatch =
      text.match(openChatRegex) ||
      text.match(hindiOpenChatRegex) ||
      text.match(spanishOpenChatRegex);

    if (openMatch && openMatch[1]) {
      const candidateName = openMatch[1].trim();
      // Filter out commands misidentified as names
      if (!/^(messages?|chats?|dashboard|home|contacts?)$/i.test(candidateName)) {
        return {
          intent: "OPEN_CHAT",
          params: { targetName: candidateName },
          detectedLanguage,
        };
      }
    }

    // 5. SEND MESSAGE TO [NAME] SAYING [TEXT]
    const sendToRegex =
      /\bsend\s+(?:a\s+)?message\s+to\s+([a-z0-9_\s]+?)\s+(?:saying|with|that)\s+(.+)$/i;
    const sendToMatch = text.match(sendToRegex);
    if (sendToMatch && sendToMatch[1] && sendToMatch[2]) {
      return {
        intent: "SEND_MESSAGE",
        params: {
          targetName: sendToMatch[1].trim(),
          text: sendToMatch[2].trim(),
        },
        detectedLanguage,
      };
    }

    // 6. NAVIGATION
    if (/\b(dashboard|home|main screen)\b/i.test(text) || /\b(डैशबोर्ड|होम)\b/i.test(text)) {
      return {
        intent: "NAVIGATE",
        params: { targetRoute: "/dashboard", targetName: "Dashboard" },
        detectedLanguage,
      };
    }
    if (/\b(chats?|messages? list|conversations)\b/i.test(text) || /\b(चैट्स|बातचीत)\b/i.test(text)) {
      return {
        intent: "NAVIGATE",
        params: { targetRoute: "/chats", targetName: "Chats" },
        detectedLanguage,
      };
    }
    if (/\b(face to face|interpreter|in person)\b/i.test(text) || /\bआमने सामने\b/i.test(text)) {
      return {
        intent: "NAVIGATE",
        params: { targetRoute: "/face-to-face", targetName: "Face-to-Face Interpreter" },
        detectedLanguage,
      };
    }
    if (/\b(dictionary|signs?)\b/i.test(text) || /\bडिक्शनरी\b/i.test(text)) {
      return {
        intent: "NAVIGATE",
        params: { targetRoute: "/dictionary", targetName: "Sign Dictionary" },
        detectedLanguage,
      };
    }
    if (/\b(contacts?|friends?)\b/i.test(text) || /\b(कॉन्टैक्ट्स|मित्र)\b/i.test(text)) {
      return {
        intent: "NAVIGATE",
        params: { targetRoute: "/contacts", targetName: "Contacts" },
        detectedLanguage,
      };
    }

    // 7. WHERE AM I / SCREEN DESCRIPTION
    if (
      /\b(where am i|what screen|what page|what is on the screen|describe)\b/i.test(text) ||
      /\b(कहाँ हूँ|स्क्रीन पर क्या है|स्क्रीन बताओ)\b/i.test(text) ||
      /\bd[oó]nde estoy\b/i.test(text)
    ) {
      return { intent: "WHERE_AM_I", detectedLanguage };
    }

    // 8. SWITCH LANGUAGE
    if (/\b(speak|switch to)\s+hindi\b/i.test(text) || /\bहिन्दी में\b/i.test(text)) {
      return { intent: "SWITCH_LANGUAGE", params: { targetLanguage: "hi-IN" }, detectedLanguage: "hi-IN" };
    }
    if (/\b(speak|switch to)\s+spanish\b/i.test(text) || /\ben espa[ñn]ol\b/i.test(text)) {
      return { intent: "SWITCH_LANGUAGE", params: { targetLanguage: "es-ES" }, detectedLanguage: "es-ES" };
    }
    if (/\b(speak|switch to)\s+english\b/i.test(text) || /\bin english\b/i.test(text)) {
      return { intent: "SWITCH_LANGUAGE", params: { targetLanguage: "en-IN" }, detectedLanguage: "en-IN" };
    }
    if (/\b(speak|switch to)\s+french\b/i.test(text) || /\ben fran[çc]ais\b/i.test(text)) {
      return { intent: "SWITCH_LANGUAGE", params: { targetLanguage: "fr-FR" }, detectedLanguage: "fr-FR" };
    }

    // 9. TOGGLE EYES-FREE / BLIND MODE
    if (/\b(eyes free|blind mode|accessible mode)\b/i.test(text) || /\bआँख-मुक्त\b/i.test(text)) {
      return { intent: "TOGGLE_EYES_FREE", detectedLanguage };
    }

    // 10. HELP
    if (/\b(help|commands|what can you do|how to use)\b/i.test(text) || /\b(मदद|सहायता|क्या कर सकते हो)\b/i.test(text)) {
      return { intent: "HELP", detectedLanguage };
    }

    return { intent: "UNKNOWN", detectedLanguage };
  }

  // --------------------------------------------------------------------------
  // FIRESTORE OPERATIONS: COUNT TODAY'S MESSAGES
  // --------------------------------------------------------------------------
  public async getTodayReceivedMessagesCount(
    userId: string
  ): Promise<{ count: number; senders: string[] }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfToday = Timestamp.fromDate(today);

      // 1. Fetch user's active conversations
      const convQuery = query(
        collection(db, "conversations"),
        where("participants", "array-contains", userId)
      );
      const convSnap = await getDocs(convQuery);

      let totalCount = 0;
      const sendersSet = new Set<string>();

      // 2. Check each conversation for messages received today
      for (const convDoc of convSnap.docs) {
        const convData = convDoc.data();
        const convId = convDoc.id;

        const messagesQuery = query(
          collection(db, "conversations", convId, "messages"),
          where("createdAt", ">=", startOfToday),
          orderBy("createdAt", "desc")
        );

        const msgSnap = await getDocs(messagesQuery);
        for (const mDoc of msgSnap.docs) {
          const mData = mDoc.data();
          if (mData.senderId && mData.senderId !== userId) {
            totalCount++;
            // Find sender name from conversation participantNames
            const senderName =
              convData.participantNames?.[mData.senderId] || "A contact";
            sendersSet.add(senderName);
          }
        }
      }

      return { count: totalCount, senders: Array.from(sendersSet) };
    } catch (err) {
      console.warn("Error fetching today's messages:", err);
      return { count: 0, senders: [] };
    }
  }

  // --------------------------------------------------------------------------
  // FIRESTORE OPERATIONS: FETCH MESSAGES FROM ACTIVE CONVERSATION
  // --------------------------------------------------------------------------
  public async getRecentMessagesForChat(
    conversationId: string,
    currentUserId: string,
    limitCount = 4
  ): Promise<{ chatName: string; messages: Array<{ sender: string; text: string; time: string }> }> {
    try {
      // 1. Fetch conversation metadata
      const convRef = doc(db, "conversations", conversationId);
      const convSnap = await getDoc(convRef);
      if (!convSnap.exists()) {
        return { chatName: "Chat", messages: [] };
      }

      const convData = convSnap.data();
      const otherUserId = convData.participants?.find((p: string) => p !== currentUserId);
      const chatName = (otherUserId && convData.participantNames?.[otherUserId]) || "Friend";

      // 2. Fetch last messages
      const msgQuery = query(
        collection(db, "conversations", conversationId, "messages"),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
      const msgSnap = await getDocs(msgQuery);

      const items: Array<{ sender: string; text: string; time: string }> = [];

      for (const mDoc of msgSnap.docs) {
        const mData = mDoc.data();
        const sender =
          mData.senderId === currentUserId
            ? "You"
            : convData.participantNames?.[mData.senderId] || "Your friend";

        let timeStr = "recently";
        if (mData.createdAt?.toDate) {
          const d = mData.createdAt.toDate();
          timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }

        items.push({
          sender,
          text: mData.text || "",
          time: timeStr,
        });
      }

      // Chronological order (oldest first)
      items.reverse();
      return { chatName, messages: items };
    } catch (err) {
      console.warn("Error reading chat messages:", err);
      return { chatName: "Chat", messages: [] };
    }
  }

  // --------------------------------------------------------------------------
  // FIRESTORE OPERATIONS: FIND CONVERSATION BY CONTACT NAME
  // --------------------------------------------------------------------------
  public async findConversationByName(
    userId: string,
    targetName: string
  ): Promise<{ conversationId: string; contactName: string; otherUserId: string } | null> {
    try {
      const q = query(
        collection(db, "conversations"),
        where("participants", "array-contains", userId)
      );
      const snap = await getDocs(q);
      const searchClean = targetName.toLowerCase().replace(/['"’]/g, "").trim();

      for (const cDoc of snap.docs) {
        const data = cDoc.data();
        const otherId = data.participants?.find((p: string) => p !== userId);
        const name = (otherId && data.participantNames?.[otherId]) || "";

        if (name.toLowerCase().includes(searchClean) || searchClean.includes(name.toLowerCase())) {
          return {
            conversationId: cDoc.id,
            contactName: name,
            otherUserId: otherId || "",
          };
        }
      }

      return null;
    } catch (err) {
      console.warn("Error finding conversation:", err);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // FIRESTORE OPERATIONS: SEND HANDS-FREE REPLY
  // --------------------------------------------------------------------------
  public async sendReply(
    conversationId: string,
    currentUserId: string,
    text: string
  ): Promise<{ success: boolean; recipientName: string }> {
    try {
      const convRef = doc(db, "conversations", conversationId);
      const convSnap = await getDoc(convRef);
      if (!convSnap.exists()) {
        return { success: false, recipientName: "Contact" };
      }

      const convData = convSnap.data();
      const otherUserId = convData.participants?.find((p: string) => p !== currentUserId) || "";
      const recipientName = convData.participantNames?.[otherUserId] || "Contact";

      await sendMessage(conversationId, currentUserId, otherUserId, text, "speech");
      return { success: true, recipientName };
    } catch (err) {
      console.warn("Error sending voice reply:", err);
      return { success: false, recipientName: "Contact" };
    }
  }

  // --------------------------------------------------------------------------
  // SPEAK RESPONSE (Text-to-Speech Output in Native Language)
  // --------------------------------------------------------------------------
  public speak(text: string, lang = "en-IN", onEnd?: () => void): void {
    textToSpeechService.speak(text, {
      lang,
      rate: 0.95, // comfortable pace for blind users
      pitch: 1.0,
      onEnd,
    });
  }

  public stopSpeaking(): void {
    textToSpeechService.cancel();
  }

  public getLocalizedStrings(langCode: string) {
    return getAssistantStrings(langCode);
  }
}

export const voiceAssistantService = new VoiceAssistantService();
