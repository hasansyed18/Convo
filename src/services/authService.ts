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
import { e2eeService } from "./crypto/e2eeService";

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

  // Generate & register ECDH identity keypair locally on device
  let publicKeyJWK: JsonWebKey | null = null;
  try {
    publicKeyJWK = await e2eeService.ensureUserIdentity(user.uid);
  } catch (err) {
    console.warn("Could not generate initial cryptographic keypair during registration:", err);
  }

  /*
   * Create user profile in Firestore with public key only
   * (Private key remains safely stored in client-side IndexedDB)
   */
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name,
    email: email.trim(),
    emailLower: email.trim().toLowerCase(),
    photoURL: user.photoURL ?? null,

    publicKeyJWK: publicKeyJWK ?? null,
    e2eeEnabled: true,

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

  // Initialize or restore ECDH identity keys for this device session
  try {
    await e2eeService.ensureUserIdentity(result.user.uid);
  } catch (err) {
    console.warn("Could not verify cryptographic identity on login:", err);
  }

  return result.user;
}

export async function logoutUser() {
  e2eeService.clearSessionCache();
  await signOut(auth);
}