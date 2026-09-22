export interface Conversation {
  id: string;

  participants: string[];

  participantNames: {
    [uid: string]: string;
  };

  lastMessage?: string;

  lastMessageSenderId?: string;

  createdAt?: unknown;

  updatedAt?: unknown;
}