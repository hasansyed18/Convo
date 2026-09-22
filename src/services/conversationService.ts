import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";

export function createConversationId(
  uid1: string,
  uid2: string
) {
  return [uid1, uid2]
    .sort()
    .join("_");
}

export async function getOrCreateConversation(
  currentUserId: string,
  otherUserId: string,
  currentUserName: string,
  otherUserName: string
) {
  if (
    !currentUserId ||
    !otherUserId
  ) {
    throw new Error(
      "Invalid conversation participants."
    );
  }

  const conversationId =
    createConversationId(
      currentUserId,
      otherUserId
    );

  const conversationRef =
    doc(
      db,
      "conversations",
      conversationId
    );

  const existing =
    await getDoc(
      conversationRef
    );

  if (existing.exists()) {
    console.log(
      "Conversation already exists:",
      conversationId
    );

    return {
      id: conversationId,
      ...existing.data(),
    };
  }

  const conversationData = {
    participants: [
      currentUserId,
      otherUserId,
    ],

    participantNames: {
      [currentUserId]:
        currentUserName,

      [otherUserId]:
        otherUserName,
    },

    lastMessage: "",
    lastMessageSenderId: "",

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp(),
  };

  await setDoc(
    conversationRef,
    conversationData
  );

  console.log(
    "🔥 NEW CONVERSATION:",
    conversationId
  );

  return {
    id: conversationId,
    ...conversationData,
  };
}