import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";

const friendRequestsRef = collection(db, "friendRequests");

export async function sendFriendRequest(
  senderId: string,
  senderName: string,
  senderEmail: string,
  receiverId: string,
  receiverName: string,
  receiverEmail: string
) {
  // Check if a request already exists
  const existingQuery = query(
    friendRequestsRef,
    where("senderId", "==", senderId),
    where("receiverId", "==", receiverId),
    where("status", "==", "pending")
  );

  const existingSnapshot = await getDocs(existingQuery);

  if (!existingSnapshot.empty) {
    throw new Error("Friend request already sent.");
  }

  await addDoc(friendRequestsRef, {
    senderId,
    senderName,
    senderEmail,

    receiverId,
    receiverName,
    receiverEmail,

    status: "pending",

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getIncomingFriendRequests(
  currentUserId: string
) {
  const q = query(
    friendRequestsRef,
    where("receiverId", "==", currentUserId),
    where("status", "==", "pending")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
}

export async function acceptFriendRequest(requestId: string) {
  await updateDoc(doc(db, "friendRequests", requestId), {
    status: "accepted",
    updatedAt: serverTimestamp(),
  });
}

export async function declineFriendRequest(requestId: string) {
  await updateDoc(doc(db, "friendRequests", requestId), {
    status: "declined",
    updatedAt: serverTimestamp(),
  });
}