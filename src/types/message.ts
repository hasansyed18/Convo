export type MessageInputType =
  | "text"
  | "speech"
  | "sign";

export interface Message {
  id: string;

  senderId: string;

  receiverId: string;

  text: string;

  inputType: MessageInputType;

  createdAt?: unknown;
}