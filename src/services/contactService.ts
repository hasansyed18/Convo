import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";

export async function searchUsers(
  searchText: string
) {
  const usersRef = collection(db, "users");

  const q = query(
    usersRef,
    where("email", "==", searchText)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
}

export async function addContact(
  currentUserId: string,
  contact: {
    uid: string;
    name: string;
    email: string;
  }
) {
  const contactRef = doc(
    db,
    "contacts",
    currentUserId,
    "items",
    contact.uid
  );

  await setDoc(contactRef, {
    uid: contact.uid,
    name: contact.name,
    email: contact.email,
    addedAt: serverTimestamp(),
  });
}

export async function getContacts(
  currentUserId: string
) {
  const contactsRef = collection(
    db,
    "contacts",
    currentUserId,
    "items"
  );

  const snapshot = await getDocs(contactsRef);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
}