/**
 * Client-Side Persistent Key Storage using IndexedDB
 *
 * Stores the user's private ECDH identity key and public key locally in the browser.
 * The private key NEVER leaves the local device and is never transmitted to the server.
 */

import type { LocalIdentityRecord } from "./types";

const DB_NAME = "convo_crypto_vault";
const DB_VERSION = 1;
const STORE_NAME = "identity_keys";

class CryptoKeyStore {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryFallback: Map<string, LocalIdentityRecord> = new Map();

  private isIndexedDBAvailable(): boolean {
    return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
  }

  private async getDB(): Promise<IDBDatabase> {
    if (!this.isIndexedDBAvailable()) {
      throw new Error("IndexedDB is not supported in this environment");
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "uid" });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.warn("IndexedDB open error in CryptoKeyStore, using in-memory store:", request.error);
          reject(request.error);
        };
      } catch (err) {
        reject(err);
      }
    });

    return this.dbPromise;
  }

  /**
   * Retrieves the stored ECDH identity record for a given user UID.
   */
  public async getIdentityKey(uid: string): Promise<LocalIdentityRecord | null> {
    try {
      const db = await this.getDB();
      return new Promise<LocalIdentityRecord | null>((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(uid);

        req.onsuccess = () => {
          resolve(req.result || null);
        };

        req.onerror = () => {
          console.warn("Failed to retrieve identity key from IndexedDB:", req.error);
          resolve(this.memoryFallback.get(uid) || null);
        };
      });
    } catch {
      return this.memoryFallback.get(uid) || null;
    }
  }

  /**
   * Stores the ECDH identity record (public & private JWKs) for a given user UID.
   */
  public async storeIdentityKey(record: LocalIdentityRecord): Promise<void> {
    this.memoryFallback.set(record.uid, record);

    try {
      const db = await this.getDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(record);

        req.onsuccess = () => resolve();
        req.onerror = () => {
          console.warn("Failed to persist identity key to IndexedDB:", req.error);
          reject(req.error);
        };
      });
    } catch (err) {
      console.warn("Could not write to IndexedDB, fallback stored in memory:", err);
    }
  }

  /**
   * Clears stored cryptographic keys for the given UID (or all keys on logout).
   */
  public async removeIdentityKey(uid: string): Promise<void> {
    this.memoryFallback.delete(uid);

    try {
      const db = await this.getDB();
      return new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(uid);

        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    } catch {
      // Ignored
    }
  }
}

export const cryptoKeyStore = new CryptoKeyStore();

