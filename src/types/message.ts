export type MessageInputType =
  | "text"
  | "speech"
  | "sign";

export type MessageStatus = "sent" | "delivered" | "read";

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  ciphertext?: string;
  iv?: string;
  keyEpoch?: number;
  isEncrypted?: boolean;
  inputType: MessageInputType;
  status?: MessageStatus;
  createdAt?: unknown;
  deliveredAt?: unknown;
  readAt?: unknown;
}