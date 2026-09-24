export interface Conversation {
  id: string;
  participants: string[];
  participantNames: {
    [uid: string]: string;
  };
  lastMessage?: string;
  lastMessageCiphertext?: string;
  lastMessageIv?: string;
  lastMessageSenderId?: string;
  e2eeEnabled?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}