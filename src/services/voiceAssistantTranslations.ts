// Multilingual responses, intent patterns, and localization dictionary for the Convo Voice Assistant

export interface LocalizedAssistantStrings {
  wakeGreeting: string;
  listeningPrompt: string;
  todayMessagesCount: (count: number, senders: string[]) => string;
  noMessagesToday: string;
  readingMessagesHeader: (chatName: string, count: number) => string;
  messageItem: (sender: string, text: string, time: string) => string;
  noMessagesInChat: string;
  chatOpened: (name: string) => string;
  chatNotFound: (name: string) => string;
  messageSent: (recipient: string, text: string) => string;
  sendFailed: string;
  navigatedTo: (pageName: string) => string;
  currentScreenDescription: (pageName: string, details?: string) => string;
  helpMenu: string;
  languageSwitched: (langName: string) => string;
  commandNotUnderstood: string;
  eyesFreeEnabled: string;
  eyesFreeDisabled: string;
}

export const ASSISTANT_TRANSLATIONS: Record<string, LocalizedAssistantStrings> = {
  "en-IN": {
    wakeGreeting: "Hello! I am Convo, your hands-free voice assistant. How can I help you?",
    listeningPrompt: "I'm listening...",
    todayMessagesCount: (count, senders) => {
      if (count === 0) return "You haven't received any new messages today.";
      const senderText = senders.length > 0 ? ` from ${senders.join(", ")}` : "";
      return `You have received ${count} ${count === 1 ? "message" : "messages"} today${senderText}.`;
    },
    noMessagesToday: "You have no messages received today.",
    readingMessagesHeader: (chatName, count) =>
      `Reading the last ${count} messages from ${chatName}:`,
    messageItem: (sender, text, time) => `${sender} said at ${time}: "${text}".`,
    noMessagesInChat: "There are no messages in this conversation yet.",
    chatOpened: (name) => `Opened conversation with ${name}. What would you like to say or hear?`,
    chatNotFound: (name) => `Could not find a conversation with ${name}. Please check your contacts or say 'Go to chats'.`,
    messageSent: (recipient, text) => `Your message has been sent to ${recipient}: "${text}".`,
    sendFailed: "Sorry, I could not send the message. Please ensure you are inside a conversation.",
    navigatedTo: (pageName) => `Navigated to ${pageName}.`,
    currentScreenDescription: (pageName, details) =>
      `You are currently on the ${pageName} screen. ${details || ""}`,
    helpMenu:
      "You can say: 'How many messages did I receive today?', 'Read messages', 'Open chat with someone', 'Reply with your message', or 'Go to dashboard'.",
    languageSwitched: (langName) => `Language switched to ${langName}. I am now listening in ${langName}.`,
    commandNotUnderstood: "I didn't quite catch that. You can say 'Help' to hear what I can do.",
    eyesFreeEnabled: "Eyes-Free Mode activated. Tap anywhere on the screen to talk to me, or double tap to cancel.",
    eyesFreeDisabled: "Eyes-Free Mode disabled.",
  },
  "en-US": {
    wakeGreeting: "Hi! I am Convo. How can I assist you?",
    listeningPrompt: "I'm listening...",
    todayMessagesCount: (count, senders) => {
      if (count === 0) return "You have not received any new messages today.";
      const senderText = senders.length > 0 ? ` from ${senders.join(", ")}` : "";
      return `You received ${count} ${count === 1 ? "message" : "messages"} today${senderText}.`;
    },
    noMessagesToday: "No messages received today.",
    readingMessagesHeader: (chatName, count) =>
      `Reading the last ${count} messages from ${chatName}:`,
    messageItem: (sender, text, time) => `${sender} at ${time}: "${text}".`,
    noMessagesInChat: "No messages in this chat yet.",
    chatOpened: (name) => `Opened chat with ${name}. What would you like to do?`,
    chatNotFound: (name) => `Could not find a chat with ${name}.`,
    messageSent: (recipient, text) => `Message sent to ${recipient}: "${text}".`,
    sendFailed: "Unable to send message right now.",
    navigatedTo: (pageName) => `Switched to ${pageName}.`,
    currentScreenDescription: (pageName, details) =>
      `You are on the ${pageName} page. ${details || ""}`,
    helpMenu:
      "Try saying: 'How many messages did I receive today?', 'Read messages', 'Open chat with name', or 'Reply with text'.",
    languageSwitched: (langName) => `Language set to ${langName}.`,
    commandNotUnderstood: "Sorry, I didn't understand. Say 'Help' for available commands.",
    eyesFreeEnabled: "Eyes-Free Mode is on. Tap anywhere to talk to Convo.",
    eyesFreeDisabled: "Eyes-Free Mode is off.",
  },
  "hi-IN": {
    wakeGreeting: "नमस्ते! मैं कॉन्वो हूँ, आपकी आवाज़ सहायक। मैं आपकी क्या मदद कर सकता हूँ?",
    listeningPrompt: "मैं सुन रहा हूँ...",
    todayMessagesCount: (count, senders) => {
      if (count === 0) return "आज आपको कोई नया संदेश नहीं मिला है।";
      const senderText = senders.length > 0 ? ` (${senders.join(", ")} से)` : "";
      return `आज आपको कुल ${count} संदेश मिले हैं${senderText}।`;
    },
    noMessagesToday: "आज कोई संदेश नहीं मिला।",
    readingMessagesHeader: (chatName, count) =>
      `${chatName} से पिछले ${count} संदेश पढ़ रहा हूँ:`,
    messageItem: (sender, text, time) => `${time} पर ${sender} ने कहा: "${text}".`,
    noMessagesInChat: "इस बातचीत में अभी कोई संदेश नहीं है।",
    chatOpened: (name) => `${name} की चैट खोल दी गई है। आप क्या कहना या सुनना चाहते हैं?`,
    chatNotFound: (name) => `${name} के साथ कोई चैट नहीं मिली।`,
    messageSent: (recipient, text) => `${recipient} को संदेश भेज दिया गया है: "${text}"।`,
    sendFailed: "क्षमा करें, संदेश नहीं भेजा जा सका। कृपया पहले किसी चैट में जाएँ।",
    navigatedTo: (pageName) => `${pageName} पर पहुँच गए हैं।`,
    currentScreenDescription: (pageName, details) =>
      `आप अभी ${pageName} स्क्रीन पर हैं। ${details || ""}`,
    helpMenu:
      "आप बोल सकते हैं: 'आज कितने मैसेज आए हैं?', 'मैसेज पढ़ो', 'चैट खोलो', 'जवाब दो', या 'डैशबोर्ड पर जाओ'।",
    languageSwitched: (langName) => `भाषा बदलकर ${langName} कर दी गई है। अब मैं ${langName} में सुन रहा हूँ।`,
    commandNotUnderstood: "क्षमा करें, मैं समझ नहीं पाया। सहायता के लिए 'मदद' बोलें।",
    eyesFreeEnabled: "आँख-मुक्त मोड चालू है। बात करने के लिए स्क्रीन पर कहीं भी टैप करें।",
    eyesFreeDisabled: "आँख-मुक्त मोड बंद कर दिया गया है।",
  },
  "es-ES": {
    wakeGreeting: "¡Hola! Soy Convo, tu asistente de voz manos libres. ¿En qué puedo ayudarte?",
    listeningPrompt: "Te escucho...",
    todayMessagesCount: (count, senders) => {
      if (count === 0) return "No has recibido ningún mensaje nuevo hoy.";
      const senderText = senders.length > 0 ? ` de ${senders.join(", ")}` : "";
      return `Has recibido ${count} ${count === 1 ? "mensaje" : "mensajes"} hoy${senderText}.`;
    },
    noMessagesToday: "No tienes mensajes recibidos hoy.",
    readingMessagesHeader: (chatName, count) =>
      `Leyendo los últimos ${count} mensajes de ${chatName}:`,
    messageItem: (sender, text, time) => `${sender} dijo a las ${time}: "${text}".`,
    noMessagesInChat: "No hay mensajes en esta conversación.",
    chatOpened: (name) => `Se abrió el chat con ${name}. ¿Qué deseas hacer?`,
    chatNotFound: (name) => `No se encontró una conversación con ${name}.`,
    messageSent: (recipient, text) => `Mensaje enviado a ${recipient}: "${text}".`,
    sendFailed: "No se pudo enviar el mensaje.",
    navigatedTo: (pageName) => `Navegado a ${pageName}.`,
    currentScreenDescription: (pageName, details) =>
      `Estás en la pantalla de ${pageName}. ${details || ""}`,
    helpMenu:
      "Puedes decir: '¿Cuántos mensajes recibí hoy?', 'Leer mensajes', 'Abrir chat con alguien', o 'Responder con'.",
    languageSwitched: (langName) => `Idioma cambiado a ${langName}.`,
    commandNotUnderstood: "No te entendí bien. Di 'Ayuda' para escuchar los comandos disponibles.",
    eyesFreeEnabled: "Modo sin vista activado. Toca cualquier lugar para hablar.",
    eyesFreeDisabled: "Modo sin vista desactivado.",
  },
  "fr-FR": {
    wakeGreeting: "Bonjour ! Je suis Convo, votre assistant vocal mains libres. Que puis-je faire pour vous ?",
    listeningPrompt: "Je vous écoute...",
    todayMessagesCount: (count, senders) => {
      if (count === 0) return "Vous n'avez reçu aucun message aujourd'hui.";
      const senderText = senders.length > 0 ? ` de ${senders.join(", ")}` : "";
      return `Vous avez reçu ${count} ${count === 1 ? "message" : "messages"} aujourd'hui${senderText}.`;
    },
    noMessagesToday: "Aucun message reçu aujourd'hui.",
    readingMessagesHeader: (chatName, count) =>
      `Lecture des ${count} derniers messages de ${chatName} :`,
    messageItem: (sender, text, time) => `${sender} à ${time} : "${text}".`,
    noMessagesInChat: "Aucun message dans cette discussion.",
    chatOpened: (name) => `Discussion ouverte avec ${name}.`,
    chatNotFound: (name) => `Impossible de trouver une discussion avec ${name}.`,
    messageSent: (recipient, text) => `Message envoyé à ${recipient} : "${text}".`,
    sendFailed: "Échec de l'envoi du message.",
    navigatedTo: (pageName) => `Navigation vers ${pageName}.`,
    currentScreenDescription: (pageName, details) =>
      `Vous êtes sur la page ${pageName}. ${details || ""}`,
    helpMenu:
      "Dites : 'Combien de messages aujourd'hui ?', 'Lire les messages', 'Ouvrir le chat', ou 'Répondre'.",
    languageSwitched: (langName) => `Langue changée en ${langName}.`,
    commandNotUnderstood: "Je n'ai pas compris. Dites 'Aide' pour voir les commandes.",
    eyesFreeEnabled: "Mode sans écran activé. Touchez n'importe où pour parler.",
    eyesFreeDisabled: "Mode sans écran désactivé.",
  },
  "de-DE": {
    wakeGreeting: "Hallo! Ich bin Convo, dein freihändiger Sprachassistent. Wie kann ich dir helfen?",
    listeningPrompt: "Ich höre zu...",
    todayMessagesCount: (count, senders) => {
      if (count === 0) return "Du hast heute keine neuen Nachrichten erhalten.";
      const senderText = senders.length > 0 ? ` von ${senders.join(", ")}` : "";
      return `Du hast heute ${count} ${count === 1 ? "Nachricht" : "Nachrichten"} erhalten${senderText}.`;
    },
    noMessagesToday: "Heute keine Nachrichten erhalten.",
    readingMessagesHeader: (chatName, count) =>
      `Lese die letzten ${count} Nachrichten von ${chatName}:`,
    messageItem: (sender, text, time) => `${sender} um ${time}: "${text}".`,
    noMessagesInChat: "Noch keine Nachrichten in diesem Chat.",
    chatOpened: (name) => `Chat mit ${name} geöffnet.`,
    chatNotFound: (name) => `Chat mit ${name} nicht gefunden.`,
    messageSent: (recipient, text) => `Nachricht an ${recipient} gesendet: "${text}".`,
    sendFailed: "Nachricht konnte nicht gesendet werden.",
    navigatedTo: (pageName) => `Zu ${pageName} gewechselt.`,
    currentScreenDescription: (pageName, details) =>
      `Du befindest dich auf der Seite ${pageName}. ${details || ""}`,
    helpMenu:
      "Sage: 'Wie viele Nachrichten habe ich heute?', 'Nachrichten vorlesen', oder 'Antworte mit'.",
    languageSwitched: (langName) => `Sprache auf ${langName} geändert.`,
    commandNotUnderstood: "Entschuldigung, das habe ich nicht verstanden. Sage 'Hilfe'.",
    eyesFreeEnabled: "Blind-Modus aktiviert. Tippe irgendwo, um zu sprechen.",
    eyesFreeDisabled: "Blind-Modus deaktiviert.",
  },
  "ar-SA": {
    wakeGreeting: "مرحبًا! أنا كونفو، مساعدك الصوتي بدون استخدام اليدين. كيف يمكنني مساعدتك؟",
    listeningPrompt: "أنا أستمع إليك...",
    todayMessagesCount: (count, senders) => {
      if (count === 0) return "لم تتلق أي رسائل جديدة اليوم.";
      const senderText = senders.length > 0 ? ` من ${senders.join("، ")}` : "";
      return `لقد تلقيت ${count} ${count === 1 ? "رسالة" : "رسائل"} اليوم${senderText}.`;
    },
    noMessagesToday: "لا توجد رسائل واردة اليوم.",
    readingMessagesHeader: (chatName, count) =>
      `قراءة آخر ${count} رسائل من ${chatName}:`,
    messageItem: (sender, text, time) => `قال ${sender} في ${time}: "${text}".`,
    noMessagesInChat: "لا توجد رسائل في هذه المحادثة حتى الآن.",
    chatOpened: (name) => `تم فتح المحادثة مع ${name}. ماذا تريد أن تقول؟`,
    chatNotFound: (name) => `لم يتم العثور على محادثة مع ${name}.`,
    messageSent: (recipient, text) => `تم إرسال الرسالة إلى ${recipient}: "${text}".`,
    sendFailed: "تعذر إرسال الرسالة حاليًا.",
    navigatedTo: (pageName) => `تم الانتقال إلى ${pageName}.`,
    currentScreenDescription: (pageName, details) =>
      `أنت الآن في شاشة ${pageName}. ${details || ""}`,
    helpMenu:
      "يمكنك أن تقول: 'كم عدد الرسائل اليوم؟'، أو 'اقرأ الرسائل'، أو 'افتح المحادثة'، أو 'رد بـ'.",
    languageSwitched: (langName) => `تم تغيير اللغة إلى ${langName}.`,
    commandNotUnderstood: "عذرًا، لم أفهم ذلك. قل 'مساعدة' لسماع الأوامر المتاحة.",
    eyesFreeEnabled: "تم تفعيل وضع المكفوفين. انقر في أي مكان على الشاشة للتحدث.",
    eyesFreeDisabled: "تم إيقاف وضع المكفوفين.",
  },
  "ta-IN": {
    wakeGreeting: "வணக்கம்! நான் கான்வோ, உங்கள் கைகளற்ற குரல் உதவியாளர். உங்களுக்கு எப்படி உதவட்டும்?",
    listeningPrompt: "நான் கவனிக்கிறேன்...",
    todayMessagesCount: (count, senders) => {
      if (count === 0) return "இன்று உங்களுக்கு புதிய செய்திகள் எதுவும் வரவில்லை.";
      const senderText = senders.length > 0 ? ` (${senders.join(", ")} இடமிருந்து)` : "";
      return `இன்று உங்களுக்கு மொத்தம் ${count} செய்திகள் வந்துள்ளன${senderText}.`;
    },
    noMessagesToday: "இன்று எந்த செய்தியும் வரவில்லை.",
    readingMessagesHeader: (chatName, count) =>
      `${chatName} இடமிருந்து வந்த கடைசி ${count} செய்திகளைப் படிக்கிறேன்:`,
    messageItem: (sender, text, time) => `${time} மணிக்கு ${sender} கூறினார்: "${text}".`,
    noMessagesInChat: "இந்த உரையாடலில் இன்னும் செய்திகள் இல்லை.",
    chatOpened: (name) => `${name} உடனான அரட்டை திறக்கப்பட்டது. என்ன பேச விரும்புகிறீர்கள்?`,
    chatNotFound: (name) => `${name} உடனான அரட்டை கிடைக்கவில்லை.`,
    messageSent: (recipient, text) => `${recipient}க்கு செய்தி அனுப்பப்பட்டது: "${text}".`,
    sendFailed: "செய்தியை அனுப்ப முடியவில்லை.",
    navigatedTo: (pageName) => `${pageName} திரைக்கு மாற்றப்பட்டது.`,
    currentScreenDescription: (pageName, details) =>
      `நீங்கள் இப்போது ${pageName} திரையில் உள்ளீர்கள். ${details || ""}`,
    helpMenu:
      "நீங்கள் 'இன்று எத்தனை செய்திகள்?', 'செய்திகளைப் படி', 'அரட்டையைத் திற', அல்லது 'பதிலளி' என்று சொல்லலாம்.",
    languageSwitched: (langName) => `மொழி ${langName} என மாற்றப்பட்டது.`,
    commandNotUnderstood: "மன்னிக்கவும், எனக்கு புரியவில்லை. உதவிகளுக்கு 'உதவி' என கூறவும்.",
    eyesFreeEnabled: "பார்வை அற்றோருக்கான பயன்முறை இயக்கப்பட்டது. பேச திரையில் எங்கு வேண்டுமானாலும் தட்டவும்.",
    eyesFreeDisabled: "பார்வை அற்றோர் பயன்முறை முடக்கப்பட்டது.",
  },
  "te-IN": {
    wakeGreeting: "నమస్కారం! నేను కాన్వో, మీ హ్యాండ్స్-ఫ్రీ వాయిస్ అసిస్టెంట్. నేను మీకు ఎలా సహాయపడగలను?",
    listeningPrompt: "నేను వింటున్నాను...",
    todayMessagesCount: (count, senders) => {
      if (count === 0) return "ఈ రోజు మీకు ఎటువంటి కొత్త సందేశాలు రాలేదు.";
      const senderText = senders.length > 0 ? ` (${senders.join(", ")} నుండి)` : "";
      return `ఈ రోజు మీకు మొత్తం ${count} సందేశాలు వచ్చాయి${senderText}.`;
    },
    noMessagesToday: "ఈ రోజు సందేశాలు ఏవీ రాలేదు.",
    readingMessagesHeader: (chatName, count) =>
      `${chatName} నుండి చివరి ${count} సందేశాలను చదువుతున్నాను:`,
    messageItem: (sender, text, time) => `${time} వద్ద ${sender} ఇలా చెప్పారు: "${text}".`,
    noMessagesInChat: "ఈ సంభాషణలో ఇంకా సందేశాలు లేవు.",
    chatOpened: (name) => `${name}తో చాట్ తెరవబడింది.`,
    chatNotFound: (name) => `${name}తో చాట్ కనుగొనబడలేదు.`,
    messageSent: (recipient, text) => `${recipient}కు సందేశం పంపబడింది: "${text}".`,
    sendFailed: "సందేశం పంపడం విఫలమైంది.",
    navigatedTo: (pageName) => `${pageName}కి మళ్లించబడింది.`,
    currentScreenDescription: (pageName, details) =>
      `మీరు ప్రస్తుతం ${pageName} స్క్రీన్‌లో ఉన్నారు. ${details || ""}`,
    helpMenu:
      "మీరు 'ఈ రోజు ఎన్ని మెసేజ్‌లు వచ్చాయి?', 'మెసేజ్‌లు చదువు', లేదా 'రిప్లై ఇవ్వు' అని చెప్పవచ్చు.",
    languageSwitched: (langName) => `భాష ${langName}కి మార్చబడింది.`,
    commandNotUnderstood: "క్షమించండి, నాకు అర్థం కాలేదు. సహాయం కోసం 'సహాయం' అని చెప్పండి.",
    eyesFreeEnabled: "ఐస్-ఫ్రీ మోడ్ యాక్టివేట్ చేయబడింది. మాట్లాడటానికి స్క్రీన్‌పై ఎక్కడైనా తాకండి.",
    eyesFreeDisabled: "ఐస్-ఫ్రీ మోడ్ డిజేబుల్ చేయబడింది.",
  },
};

export function getAssistantStrings(langCode: string): LocalizedAssistantStrings {
  if (ASSISTANT_TRANSLATIONS[langCode]) {
    return ASSISTANT_TRANSLATIONS[langCode];
  }
  const prefix = langCode.split("-")[0];
  const matchedKey = Object.keys(ASSISTANT_TRANSLATIONS).find((k) =>
    k.startsWith(prefix)
  );
  if (matchedKey) {
    return ASSISTANT_TRANSLATIONS[matchedKey];
  }
  return ASSISTANT_TRANSLATIONS["en-IN"];
}

