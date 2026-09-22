import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";

import { db } from "./firebase";

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

export function subscribeToMessages(
  conversationId: string,
  callback: (messages: any[]) => void
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

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    }));

    callback(messages);
  });
}