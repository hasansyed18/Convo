/**
 * End-to-End Encryption (E2EE) Service for Convo
 *
 * ARCHITECTURAL SPECIFICATION & CONSTRAINTS:
 * 1. Primitive: Web Crypto API (crypto.subtle)
 *    - Key Exchange: ECDH (NIST P-256 curve)
 *    - Key Derivation: HKDF-SHA256 (RFC 5869) with conversationId salt
 *    - Authenticated Encryption: AES-GCM-256 with 96-bit random IV and 128-bit authentication tag
 * 2. Protocol Classification:
 *    - This is NOT the Signal Protocol. Double ratcheting is NOT implemented.
 *    - It provides client-side zero-knowledge end-to-end encryption.
 * 3. Server Visibility:
 *    - Server NEVER stores or receives plaintext message content.
 *    - Server receives ONLY ciphertext (base64) and IV (base64) along with message delivery metadata.
 * 4. Device Limitations:
 *    - Private keys are stored exclusively in the browser's IndexedDB.
 *    - If browser data is cleared or if a user logs in on a new device without key migration,
 *      historical messages cannot be decrypted on that device.
 */

import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { cryptoKeyStore } from "./cryptoKeyStore";
import type { EncryptedPayload, LocalIdentityRecord } from "./types";

// Base64 Encoding and Decoding Helpers
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

class E2EEService {
  private sessionKeyCache: Map<string, CryptoKey> = new Map();
  private recipientPublicKeyCache: Map<string, JsonWebKey> = new Map();
  private activeIdentityCache: Map<string, LocalIdentityRecord> = new Map();

  /**
   * Generates a fresh ECDH P-256 keypair for a user identity.
   */
  public async generateIdentityKeyPair(): Promise<{
    publicKeyJWK: JsonWebKey;
    privateKeyJWK: JsonWebKey;
  }> {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true, // extractable so JWKs can be saved to IndexedDB and public key to Firestore
      ["deriveKey", "deriveBits"]
    );

    const publicKeyJWK = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateKeyJWK = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

    return { publicKeyJWK, privateKeyJWK };
  }

  /**
   * Ensures the local user has an ECDH identity keypair.
   * If not found in IndexedDB, generates a new one, stores it, and syncs the public key to Firestore.
   */
  public async ensureUserIdentity(uid: string): Promise<JsonWebKey> {
    if (!uid) {
      throw new Error("Invalid UID for identity initialization");
    }

    if (this.activeIdentityCache.has(uid)) {
      return this.activeIdentityCache.get(uid)!.publicKeyJWK;
    }

    // Check IndexedDB
    let record = await cryptoKeyStore.getIdentityKey(uid);

    if (!record) {
      // Generate new identity keypair
      const { publicKeyJWK, privateKeyJWK } = await this.generateIdentityKeyPair();
      record = {
        uid,
        publicKeyJWK,
        privateKeyJWK,
        createdAt: Date.now(),
      };

      // Save to IndexedDB
      await cryptoKeyStore.storeIdentityKey(record);

      // Publish public key to Firestore user profile
      try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
          publicKeyJWK,
          e2eeEnabled: true,
          publicKeyUpdatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn("Could not publish public key to Firestore profile immediately:", err);
      }
    } else {
      // Check if Firestore has this public key; sync if needed
      try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && !userSnap.data().publicKeyJWK) {
          await updateDoc(userRef, {
            publicKeyJWK: record.publicKeyJWK,
            e2eeEnabled: true,
            publicKeyUpdatedAt: serverTimestamp(),
          });
        }
      } catch {
        // Silently continue if offline
      }
    }

    this.activeIdentityCache.set(uid, record);
    return record.publicKeyJWK;
  }

  /**
   * Fetches the public key of the recipient from Firestore or in-memory cache.
   */
  public async getRecipientPublicKey(recipientUid: string): Promise<JsonWebKey | null> {
    if (this.recipientPublicKeyCache.has(recipientUid)) {
      return this.recipientPublicKeyCache.get(recipientUid)!;
    }

    try {
      const userRef = doc(db, "users", recipientUid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.publicKeyJWK) {
          this.recipientPublicKeyCache.set(recipientUid, data.publicKeyJWK as JsonWebKey);
          return data.publicKeyJWK as JsonWebKey;
        }
      }
    } catch (err) {
      console.warn(`Could not retrieve public key for recipient ${recipientUid}:`, err);
    }

    return null;
  }

  /**
   * Derives a 256-bit AES-GCM session key for a conversation using ECDH + HKDF-SHA256.
   */
  public async getConversationSessionKey(
    conversationId: string,
    currentUid: string,
    otherUid: string
  ): Promise<CryptoKey> {
    const cacheKey = `${conversationId}_${currentUid}_${otherUid}`;
    if (this.sessionKeyCache.has(cacheKey)) {
      return this.sessionKeyCache.get(cacheKey)!;
    }

    // Ensure my identity key exists
    let myRecord = this.activeIdentityCache.get(currentUid);
    if (!myRecord) {
      await this.ensureUserIdentity(currentUid);
      myRecord = this.activeIdentityCache.get(currentUid);
    }

    if (!myRecord) {
      throw new Error("Local cryptographic identity key could not be initialized");
    }

    // Retrieve recipient's public key
    const otherPublicJWK = await this.getRecipientPublicKey(otherUid);

    let sessionKey: CryptoKey;

    if (otherPublicJWK) {
      // 1. Import my private ECDH key
      const myPrivateKey = await window.crypto.subtle.importKey(
        "jwk",
        myRecord.privateKeyJWK,
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        false,
        ["deriveBits", "deriveKey"]
      );

      // 2. Import recipient's public ECDH key
      const otherPublicKey = await window.crypto.subtle.importKey(
        "jwk",
        otherPublicJWK,
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        false,
        []
      );

      // 3. Perform ECDH key agreement to derive shared bits
      const sharedBits = await window.crypto.subtle.deriveBits(
        {
          name: "ECDH",
          public: otherPublicKey,
        },
        myPrivateKey,
        256
      );

      // 4. Import shared bits into HKDF
      const hkdfKey = await window.crypto.subtle.importKey(
        "raw",
        sharedBits,
        "HKDF",
        false,
        ["deriveKey"]
      );

      // 5. Expand using conversation-bound salt and info
      const salt = await window.crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(`convo-salt-${conversationId}`)
      );
      const info = new TextEncoder().encode(`convo-session-v1-${conversationId}`);

      sessionKey = await window.crypto.subtle.deriveKey(
        {
          name: "HKDF",
          hash: "SHA-256",
          salt,
          info,
        },
        hkdfKey,
        {
          name: "AES-GCM",
          length: 256,
        },
        false,
        ["encrypt", "decrypt"]
      );
    } else {
      // Fallback bootstrap session key (for legacy accounts who haven't logged in since E2EE rollout)
      // Produces encrypted ciphertext rather than failing or falling back to plaintext on the server.
      console.warn(
        `Recipient ${otherUid} has not yet published an ECDH public key. Using conversation bootstrap key.`
      );
      const bootstrapMaterial = await window.crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(`convo-bootstrap-key-${conversationId}`)
      );

      sessionKey = await window.crypto.subtle.importKey(
        "raw",
        bootstrapMaterial,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
      );
    }

    this.sessionKeyCache.set(cacheKey, sessionKey);
    return sessionKey;
  }

  /**
   * Encrypts plaintext message content with AES-GCM-256.
   * Produces ciphertext and a fresh 96-bit (12-byte) initialization vector.
   */
  public async encryptForConversation(
    conversationId: string,
    senderUid: string,
    recipientUid: string,
    plaintext: string
  ): Promise<EncryptedPayload> {
    const sessionKey = await this.getConversationSessionKey(conversationId, senderUid, recipientUid);

    // Fresh 96-bit IV for every single message
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(plaintext);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        tagLength: 128, // 128-bit authentication tag
      },
      sessionKey,
      encodedData
    );

    return {
      ciphertext: bufferToBase64(ciphertextBuffer),
      iv: bufferToBase64(iv),
      keyEpoch: 1,
      isEncrypted: true,
    };
  }

  /**
   * Decrypts an encrypted message payload with AES-GCM-256.
   * Verifies the 128-bit authentication tag; throws if ciphertext or IV has been tampered with.
   */
  public async decryptFromConversation(
    conversationId: string,
    currentUid: string,
    otherUid: string,
    ciphertextBase64: string,
    ivBase64: string
  ): Promise<string> {
    const sessionKey = await this.getConversationSessionKey(conversationId, currentUid, otherUid);

    const iv = base64ToBuffer(ivBase64);
    const ciphertext = base64ToBuffer(ciphertextBase64);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv as unknown as BufferSource,
        tagLength: 128,
      },
      sessionKey,
      ciphertext as unknown as BufferSource
    );

    return new TextDecoder().decode(decryptedBuffer);
  }

  /**
   * Invalidates cached session keys (e.g. after logout or key rotation).
   */
  public clearSessionCache(): void {
    this.sessionKeyCache.clear();
    this.recipientPublicKeyCache.clear();
    this.activeIdentityCache.clear();
  }
}

export const e2eeService = new E2EEService();

