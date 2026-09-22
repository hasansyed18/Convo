import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "./firebase";

export async function registerUser(
  name: string,
  email: string,
  password: string
) {
  const result = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  const user = result.user;

  await updateProfile(user, {
    displayName: name,
  });

  /*
   * Create user profile in Firestore
   */
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name,
    email: email.trim(),
emailLower: email.trim().toLowerCase(),
    photoURL: user.photoURL ?? null,

    communicationMode: "text",
    preferredLanguage: "en",

    accessibility: {
      blind: false,
      deaf: false,
      nonVerbal: false,
    },

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await sendEmailVerification(user);

  return user;
}

export async function loginUser(
  email: string,
  password: string
) {
  const result = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  return result.user;
}

export async function logoutUser() {
  await signOut(auth);
}