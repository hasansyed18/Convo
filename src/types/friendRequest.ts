export interface FriendRequest {
  id: string;

  senderId: string;
  senderName: string;
  senderEmail: string;

  receiverId: string;
  receiverName: string;
  receiverEmail: string;

  status:
    | "pending"
    | "accepted"
    | "declined";

  createdAt?: unknown;

  updatedAt?: unknown;
}