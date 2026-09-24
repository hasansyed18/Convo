/**
 * Cryptographic Core Types for End-to-End Encryption (E2EE) in Convo
 *
 * ARCHITECTURAL CLARIFICATION:
 * This implementation uses Web Crypto primitives:
 * - ECDH (NIST P-256 / secp256r1) for Asymmetric Identity & Key Agreement
 * - HKDF-SHA256 (RFC 5869) for Conversation-Specific Session Key Derivation
 * - AES-GCM-256 for Authenticated Symmetric Message Encryption (96-bit IV, 128-bit Tag)
 *
 * NOTE: This is NOT the Signal Protocol (no double ratcheting is implemented).
 * It provides client-side zero-knowledge end-to-end encryption where the server
 * never stores or receives plaintext message content.
 */

export interface EncryptedPayload {
  ciphertext: string; // Base64 encoded AES-GCM ciphertext + auth tag
  iv: string;         // Base64 encoded 96-bit (12-byte) initialization vector
  keyEpoch: number;   // Epoch counter for key rotations
  isEncrypted: true;
}

export interface UserKeyBundle {
  uid: string;
  publicKeyJWK: JsonWebKey;
  updatedAt?: unknown;
  algorithm: "ECDH-P256-HKDF-AES-GCM-256";
}

export interface LocalIdentityRecord {
  uid: string;
  publicKeyJWK: JsonWebKey;
  privateKeyJWK: JsonWebKey;
  createdAt: number;
}

export interface ConversationSessionKey {
  conversationId: string;
  key: CryptoKey;
  derivedAt: number;
}

export interface E2EESecurityMetadata {
  identityAlgorithm: "ECDH-P256";
  keyDerivationAlgorithm: "HKDF-SHA256";
  cipherAlgorithm: "AES-GCM-256";
  ivLengthBits: 96;
  authTagLengthBits: 128;
  serverPlaintextAccess: false;
  ratchetingProtocol: false;
}

