// Offline storage and network status management for low-connectivity environments

export interface CachedMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  inputType: "text" | "speech" | "sign";
  createdAt: number;
  isSynced: boolean;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  visualAlerts: boolean;
  audioCues: boolean;
  autoSpeakIncoming: boolean;
  speechRate?: number;
  speechLanguage?: string;
}

class OfflineStorageService {
  private isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  private onlineListeners: Array<(online: boolean) => void> = [];

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.isOnline = true;
        this.notifyListeners();
      });

      window.addEventListener("offline", () => {
        this.isOnline = false;
        this.notifyListeners();
      });
    }
  }

  public getIsOnline(): boolean {
    return this.isOnline;
  }

  public addNetworkListener(callback: (online: boolean) => void): () => void {
    this.onlineListeners.push(callback);
    callback(this.isOnline);
    return () => {
      this.onlineListeners = this.onlineListeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners() {
    this.onlineListeners.forEach((fn) => fn(this.isOnline));
  }

  public getCachedMessages(conversationId: string): CachedMessage[] {
    try {
      const data =
        localStorage.getItem(`convo_messages_${conversationId}`) ||
        localStorage.getItem(`kombo_messages_${conversationId}`);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public saveCachedMessages(conversationId: string, messages: CachedMessage[]) {
    try {
      localStorage.setItem(`convo_messages_${conversationId}`, JSON.stringify(messages));
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }
  }

  public appendCachedMessage(conversationId: string, message: CachedMessage) {
    const list = this.getCachedMessages(conversationId);
    list.push(message);
    this.saveCachedMessages(conversationId, list);
  }

  // Accessibility Settings Cache
  public getAccessibilitySettings(): AccessibilitySettings {
    try {
      const data =
        localStorage.getItem("convo_accessibility") ||
        localStorage.getItem("kombo_accessibility");
      if (data) return JSON.parse(data);
    } catch {
      // Ignore localStorage read errors
    }
    return {
      highContrast: false,
      largeText: false,
      visualAlerts: true,
      audioCues: true,
      autoSpeakIncoming: false,
      speechRate: 1.0,
      speechLanguage: "en-US",
    };
  }

  public saveAccessibilitySettings(settings: AccessibilitySettings) {
    try {
      localStorage.setItem("convo_accessibility", JSON.stringify(settings));
    } catch {
      // Ignore localStorage write errors
    }
  }
}

export const offlineStorageService = new OfflineStorageService();

