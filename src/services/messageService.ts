import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  getDocs,
  where,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";

import { auth, db } from "./firebase";
import { e2eeService } from "./crypto/e2eeService";

export type MessageStatus = "sent" | "delivered" | "read";

export interface StoredMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  ciphertext?: string;
  iv?: string;
  keyEpoch?: number;
  isEncrypted?: boolean;
  inputType: "text" | "speech" | "sign";
  status?: MessageStatus;
  deliveredAt?: Timestamp | { seconds: number; nanoseconds: number } | null;
  readAt?: Timestamp | { seconds: number; nanoseconds: number } | null;
  createdAt?: Timestamp | { seconds: number; nanoseconds: number } | null;
}

/**
 * Sends a message with End-to-End Encryption (E2EE).
 * The plaintext text is encrypted on-device via Web Crypto (ECDH + HKDF + AES-GCM-256).
 * Only ciphertext and the initialization vector (IV) are written to Firestore.
 * The server NEVER receives or stores the plaintext content.
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  receiverId: string,
  text: string,
  inputType: "text" | "speech" | "sign"
) {
  // Encrypt payload client-side before transmission
  const encrypted = await e2eeService.encryptForConversation(
    conversationId,
    senderId,
    receiverId,
    text
  );

  const messagesRef = collection(
    db,
    "conversations",
    conversationId,
    "messages"
  );

  // Store ONLY CIPHERTEXT on Firestore; no plaintext 'text' field is written
  await addDoc(messagesRef, {
    senderId,
    receiverId,
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    keyEpoch: encrypted.keyEpoch,
    isEncrypted: true,
    inputType,
    status: "sent",
    deliveredAt: serverTimestamp(),
    readAt: null,
    createdAt: serverTimestamp(),
  });

  // Update conversation metadata without revealing plaintext message content
  await updateDoc(
    doc(db, "conversations", conversationId),
    {
      lastMessageCiphertext: encrypted.ciphertext,
      lastMessageIv: encrypted.iv,
      lastMessage: "🔒 Encrypted message", // Placeholder for server view
      lastMessageSenderId: senderId,
      updatedAt: serverTimestamp(),
    }
  );
}

export async function markConversationMessagesAsRead(
  conversationId: string,
  currentUserId: string
) {
  try {
    const messagesRef = collection(
      db,
      "conversations",
      conversationId,
      "messages"
    );

    const q = query(
      messagesRef,
      where("receiverId", "==", currentUserId)
    );

    const snapshot = await getDocs(q);
    const unreadDocs = snapshot.docs.filter((d) => {
      const data = d.data();
      return data.status !== "read";
    });

    if (unreadDocs.length === 0) return;

    const batch = writeBatch(db);
    for (const d of unreadDocs) {
      batch.update(d.ref, {
        status: "read",
        readAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (err) {
    console.warn("Could not mark messages as read:", err);
  }
}

/**
 * Subscribes to real-time messages in a conversation.
 * Automatically decrypts incoming ciphertext payloads locally on the client using the
 * conversation's derived AES-GCM-256 session key.
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (messages: StoredMessage[]) => void,
  onError?: (error: Error) => void,
  currentUserId?: string
) {
  const messagesRef = collection(
    db,
    "conversations",
    conversationId,
    "messages"
  );

  const q = query(
    messagesRef,
    orderBy("createdAt", "asc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const rawDocs = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      })) as Array<StoredMessage & { ciphertext?: string; iv?: string; keyEpoch?: number }>;

      const resolvedUid = currentUserId || auth.currentUser?.uid;

      // Decrypt all messages asynchronously on the client
      Promise.all(
        rawDocs.map(async (msg) => {
          if (msg.ciphertext && msg.iv && resolvedUid) {
            const otherUid = msg.senderId === resolvedUid ? msg.receiverId : msg.senderId;
            try {
              const decrypted = await e2eeService.decryptFromConversation(
                conversationId,
                resolvedUid,
                otherUid,
                msg.ciphertext,
                msg.iv
              );
              return {
                ...msg,
                text: decrypted,
                isEncrypted: true,
              };
            } catch (err) {
              console.warn("Failed to decrypt message:", msg.id, err);
              return {
                ...msg,
                text: "🔒 [Encrypted message - key unavailable on this device]",
                isEncrypted: true,
              };
            }
          }

          // Legacy unencrypted message
          return {
            ...msg,
            text: msg.text || "",
            isEncrypted: false,
          };
        })
      )
        .then((decryptedList) => {
          callback(decryptedList);
        })
        .catch((err) => {
          console.warn("Error resolving decrypted messages:", err);
          callback(rawDocs as StoredMessage[]);
        });
    },
    (error) => {
      console.warn("Firestore message subscription notice:", error);
      onError?.(error);
    }
  );
}

/**
 * Decrypts a conversation's last message snippet for the client-side chat list.
 */
export async function decryptLastMessageSnippet(
  conversationId: string,
  currentUserId: string,
  otherUserId: string,
  ciphertext?: string,
  iv?: string
): Promise<string> {
  if (!ciphertext || !iv) {
    return "";
  }
  try {
    return await e2eeService.decryptFromConversation(
      conversationId,
      currentUserId,
      otherUserId,
      ciphertext,
      iv
    );
  } catch {
    return "🔒 Encrypted message";
  }
}