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

import { db } from "./firebase";

export type MessageStatus = "sent" | "delivered" | "read";

export interface StoredMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  inputType: "text" | "speech" | "sign";
  status?: MessageStatus;
  deliveredAt?: Timestamp | { seconds: number; nanoseconds: number } | null;
  readAt?: Timestamp | { seconds: number; nanoseconds: number } | null;
  createdAt?: Timestamp | { seconds: number; nanoseconds: number } | null;
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  receiverId: string,
  text: string,
  inputType: "text" | "speech" | "sign"
) {
  const messagesRef = collection(
    db,
    "conversations",
    conversationId,
    "messages"
  );

  await addDoc(messagesRef, {
    senderId,
    receiverId,
    text,
    inputType,
    status: "sent",
    deliveredAt: serverTimestamp(),
    readAt: null,
    createdAt: serverTimestamp(),
  });

  await updateDoc(
    doc(db, "conversations", conversationId),
    {
      lastMessage: text,
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

export function subscribeToMessages(
  conversationId: string,
  callback: (messages: StoredMessage[]) => void,
  onError?: (error: Error) => void
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
      const messages = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      })) as StoredMessage[];

      callback(messages);
    },
    (error) => {
      console.warn("Firestore message subscription notice:", error);
      onError?.(error);
    }
  );
}