export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string | null;

  communicationMode?: "text" | "voice" | "sign";

  preferredLanguage?: string;

  accessibility?: {
    blind: boolean;
    deaf: boolean;
    nonVerbal: boolean;
  };

  createdAt?: unknown;
  updatedAt?: unknown;
}