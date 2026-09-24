import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import {
  Bell,
  Plus,
  Search,
  UserPlus,
  X,
  LayoutDashboard,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";
import NetworkStatusBanner from "../components/common/NetworkStatusBanner";
import AccessibilityToolbar from "../components/accessibility/AccessibilityToolbar";

import {
  getIncomingFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
} from "../services/friendRequestService";

import {
  getOrCreateConversation,
} from "../services/conversationService";
import { decryptLastMessageSnippet } from "../services/messageService";

interface Conversation {
  id: string;

  participants: string[];

  participantNames: {
    [uid: string]: string;
  };

  lastMessage?: string;
  lastMessageCiphertext?: string;
  lastMessageIv?: string;
  lastMessageSenderId?: string;

  createdAt?: { seconds: number; nanoseconds: number } | null;
  updatedAt?: { seconds: number; nanoseconds: number } | null;
}

function ConversationSnippet({
  conversation,
  currentUserId,
}: {
  conversation: Conversation;
  currentUserId: string;
}) {
  const [decryptedText, setDecryptedText] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (conversation.lastMessageCiphertext && conversation.lastMessageIv && currentUserId) {
      const otherUserId =
        conversation.participants.find((id) => id !== currentUserId) || "";
      decryptLastMessageSnippet(
        conversation.id,
        currentUserId,
        otherUserId,
        conversation.lastMessageCiphertext,
        conversation.lastMessageIv
      )
        .then((res) => {
          if (isMounted) setDecryptedText(res);
        })
        .catch(() => {
          if (isMounted) setDecryptedText("🔒 Encrypted message");
        });
    }
    return () => {
      isMounted = false;
    };
  }, [conversation, currentUserId]);

  if (decryptedText) {
    return <span className="flex items-center gap-1">🔒 {decryptedText}</span>;
  }

  return <span>{conversation.lastMessage || "Start a conversation"}</span>;
}

interface FriendRequest {
  id: string;

  senderId: string;
  senderName: string;
  senderEmail: string;

  receiverId: string;
  receiverName: string;
  receiverEmail: string;

  status: "pending" | "accepted" | "declined";

  createdAt?: { seconds: number; nanoseconds: number } | null;
  updatedAt?: { seconds: number; nanoseconds: number } | null;
}

interface UserProfile {
  id?: string;
  uid: string;
  name: string;
  email: string;
  photoURL?: string | null;
  [key: string]: unknown;
}

export default function Chats() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [requestCount, setRequestCount] =
    useState(0);

  const [showAddFriend, setShowAddFriend] =
    useState(false);

  const [showRequests, setShowRequests] =
    useState(false);

  const [searchText, setSearchText] =
    useState("");

  /*
   * ========================================
   * CONVERSATIONS
   * ========================================
   */

  useEffect(() => {
    if (!user) return;

    const conversationsRef =
      collection(db, "conversations");

    const conversationsQuery = query(
      conversationsRef,
      where(
        "participants",
        "array-contains",
        user.uid
      )
    );

    const unsubscribe = onSnapshot(
      conversationsQuery,
      (snapshot) => {
        const data =
          snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          })) as Conversation[];

        data.sort((a, b) => {
          const aTime =
            a.updatedAt?.seconds ?? 0;

          const bTime =
            b.updatedAt?.seconds ?? 0;

          return bTime - aTime;
        });

        setConversations(data);

        console.log(
          "🔥 Conversations:",
          data
        );
      },
      (error) => {
        console.error(
          "❌ Conversation listener:",
          error
        );
      }
    );

    return unsubscribe;
  }, [user]);

  /*
   * ========================================
   * FRIEND REQUEST COUNT
   * ========================================
   */

  useEffect(() => {
    const currentUid = user?.uid;
    if (!currentUid) return;

    async function loadRequests(uid: string) {
      try {
        const requests =
          await getIncomingFriendRequests(
            uid
          );

        setRequestCount(
          requests.length
        );
      } catch (error) {
        console.error(
          "❌ Request count error:",
          error
        );
      }
    }

    loadRequests(currentUid);
  }, [user, showRequests]);

  /*
   * ========================================
   * FILTER CHAT LIST
   * ========================================
   */


   const filteredConversations =
    conversations.filter(
      (conversation) => {
        const otherUserId =
          conversation.participants.find(
            (id) => id !== user?.uid
          );

        const otherUserName =
          otherUserId
            ? conversation
                .participantNames[
                otherUserId
              ] || ""
            : "";

        return otherUserName
          .toLowerCase()
          .includes(
            searchText.toLowerCase()
          );
      }
    );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <NetworkStatusBanner />

      {/* HEADER */}

      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/95 backdrop-blur">

        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="rounded-xl p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
              title="Return to Dashboard"
            >
              <LayoutDashboard size={19} />
            </button>

            <div>
              <h1 className="text-xl font-bold">
                Convo Chats
              </h1>

              <p className="text-xs text-emerald-400">
                Speech • Text • Sign Language
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* IN-PERSON SHORTCUT */}
            <button
              onClick={() => navigate("/face-to-face")}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 transition"
              title="Face-to-Face Split Screen Mode"
            >
              <span>👥</span> In-Person
            </button>

            {/* REQUESTS */}

            <button
              onClick={() =>
                setShowRequests(true)
              }
              className="relative rounded-full p-3 hover:bg-white/10"
              title="Friend Requests"
            >
              <Bell size={20} />

              {requestCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-black">
                  {requestCount}
                </span>
              )}
            </button>

            {/* ADD FRIEND */}

            <button
              onClick={() =>
                setShowAddFriend(true)
              }
              className="rounded-full bg-emerald-500 p-3 text-black hover:bg-emerald-400 shadow-md"
              title="Add a Friend"
            >
              <Plus size={21} />
            </button>

          </div>

        </div>

        {/* SEARCH CHATS */}

        <div className="mx-auto max-w-3xl px-4 pb-3">

          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">

            <Search
              size={18}
              className="text-slate-400"
            />

            <input
              value={searchText}
              onChange={(event) =>
                setSearchText(
                  event.target.value
                )
              }
              placeholder="Search chats..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
            />

          </div>

        </div>

      </header>

      {/* CHAT LIST */}

      <main className="mx-auto max-w-3xl">

        {filteredConversations.length ===
        0 ? (

          <div className="flex min-h-[65vh] flex-col items-center justify-center px-6 text-center">

            <div className="mb-5 rounded-full bg-emerald-500/10 p-5">

              <UserPlus
                size={36}
                className="text-emerald-400"
              />

            </div>

            <h2 className="text-xl font-semibold">
              {searchText
                ? "No chats found"
                : "No conversations yet"}
            </h2>

            <p className="mt-2 max-w-sm text-sm text-slate-400">
              {searchText
                ? "Try another name."
                : "Add a friend to start chatting."}
            </p>

            {!searchText && (
              <button
                onClick={() =>
                  setShowAddFriend(true)
                }
                className="mt-6 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-black"
              >
                Add a friend
              </button>
            )}

          </div>

        ) : (

          <div className="divide-y divide-white/5">

            {filteredConversations.map(
              (conversation) => {

                const otherUserId =
                  conversation.participants.find(
                    (id) =>
                      id !== user.uid
                  );

                const otherUserName =
                  otherUserId
                    ? conversation
                        .participantNames[
                        otherUserId
                      ] ||
                      "Convo User"
                    : "Convo User";

                return (
                  <button
                    key={conversation.id}
                    onClick={() =>
                      navigate(
                        `/chat/${conversation.id}`
                      )
                    }
                    className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-white/5"
                  >

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-lg font-bold text-black">
                      {otherUserName
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">

                      <div className="flex items-center justify-between">

                        <h3 className="font-semibold">
                          {otherUserName}
                        </h3>

                        <span className="text-xs text-slate-500">
                          {formatTime(
                            conversation.updatedAt
                          )}
                        </span>

                      </div>

                      <p className="mt-1 truncate text-sm text-slate-400">
                        <ConversationSnippet
                          conversation={conversation}
                          currentUserId={user.uid}
                        />
                      </p>

                    </div>

                  </button>
                );
              }
            )}

          </div>

        )}

      </main>

      {/* ADD FRIEND */}

      {showAddFriend && (
        <AddFriendModal
          currentUserId={user.uid}
          currentUserName={
            user.displayName ||
            "Convo User"
          }
          currentUserEmail={
            user.email || ""
          }
          onClose={() =>
            setShowAddFriend(false)
          }
        />
      )}

      {/* REQUESTS */}

      {showRequests && (
        <FriendRequestsModal
          currentUserId={user.uid}
          onClose={() =>
            setShowRequests(false)
          }
        />
      )}

      <AccessibilityToolbar />

    </div>
  );
}


/* ============================================
   ADD FRIEND
============================================ */

function AddFriendModal({
  currentUserId,
  currentUserName,
  currentUserEmail,
  onClose,
}: {
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
  onClose: () => void;
}) {
  const [email, setEmail] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [result, setResult] =
    useState<UserProfile | null>(null);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState(false);

  async function searchUser() {
    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    if (!normalizedEmail) {
      setMessage(
        "Enter an email address."
      );
      setError(true);
      return;
    }

    setLoading(true);
    setResult(null);
    setMessage("");

    try {
      console.log(
        "🔎 Searching:",
        normalizedEmail
      );

      const usersRef =
        collection(db, "users");

      /*
       * FIRST:
       * Search emailLower.
       */

      let foundUser: UserProfile | null = null;

      const lowerQuery = query(
        usersRef,
        where(
          "emailLower",
          "==",
          normalizedEmail
        )
      );

      const lowerSnapshot =
        await getDocs(
          lowerQuery
        );

      if (!lowerSnapshot.empty) {
        const document =
          lowerSnapshot.docs[0];

        foundUser = {
          uid: document.id,
          name: document.data().name || "User",
          email: document.data().email || "",
          ...document.data(),
        } as UserProfile;
      }

      /*
       * SECOND:
       * Search old email field.
       */

      if (!foundUser) {
        const emailQuery =
          query(
            usersRef,
            where(
              "email",
              "==",
              normalizedEmail
            )
          );

        const emailSnapshot =
          await getDocs(
            emailQuery
          );

        if (!emailSnapshot.empty) {
          const document =
            emailSnapshot.docs[0];

          foundUser = {
            uid: document.id,
            name: document.data().name || "User",
            email: document.data().email || "",
            ...document.data(),
          } as UserProfile;
        }
      }

      /*
       * THIRD:
       * Development fallback.
       * Handles old profiles whose email
       * was stored with different casing.
       */

      if (!foundUser) {
        const allUsers =
          await getDocs(
            usersRef
          );

        for (
          const document of allUsers.docs
        ) {
          const data =
            document.data();

          const storedEmail =
            String(
              data.email || ""
            )
              .trim()
              .toLowerCase();

          if (
            storedEmail ===
            normalizedEmail
          ) {
            foundUser = {
              uid: document.id,
              name: data.name || "User",
              email: data.email || "",
              ...data,
            } as UserProfile;

            break;
          }
        }
      }

      if (!foundUser) {
        setMessage(
          "No Convo user found with this email."
        );

        setError(true);
        return;
      }

      if (
        foundUser.uid ===
        currentUserId
      ) {
        setMessage(
          "You cannot add yourself."
        );

        setError(true);
        return;
      }

      console.log(
        "✅ Found user:",
        foundUser
      );

      setResult(foundUser);

      setMessage(
        "Convo user found ✓"
      );

      setError(false);

    } catch (error: unknown) {

      console.error(
        "🔥 SEARCH ERROR:",
        error
      );

      const errMessage =
        error instanceof Error
          ? error.message
          : "Unable to search users.";

      setMessage(errMessage);
      setError(true);

    } finally {
      setLoading(false);
    }
  }

  async function handleSendRequest() {
    if (!result) return;

    setLoading(true);

    try {

      await sendFriendRequest(
        currentUserId,
        currentUserName,
        currentUserEmail,
        result.uid,
        result.name,
        result.email
      );

      setMessage(
        "Friend request sent ✓"
      );

      setError(false);

      setTimeout(
        onClose,
        1000
      );

    } catch (error: unknown) {

      console.error(
        "Request error:",
        error
      );

      const errMessage =
        error instanceof Error
          ? error.message
          : "Could not send request.";

      setMessage(errMessage);
      setError(true);

    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">

      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">

        <div className="mb-6 flex items-center justify-between">

          <h2 className="text-xl font-bold">
            Add a friend
          </h2>

          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-white/10"
          >
            <X size={20} />
          </button>

        </div>

        <div className="space-y-4">

          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            onKeyDown={(event) => {
              if (
                event.key ===
                "Enter"
              ) {
                searchUser();
              }
            }}
            placeholder="Friend's email"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-emerald-400"
          />

          <button
            onClick={searchUser}
            disabled={
              loading ||
              !email.trim()
            }
            className="w-full rounded-xl bg-white/10 py-3 font-semibold hover:bg-white/15 disabled:opacity-50"
          >
            {loading
              ? "Searching..."
              : "Search"}
          </button>

          {result && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 font-bold text-black">
                  {result.name
                    ?.charAt(0)
                    ?.toUpperCase()}
                </div>

                <div>
                  <p className="font-semibold">
                    {result.name}
                  </p>

                  <p className="text-sm text-slate-400">
                    {result.email}
                  </p>
                </div>

              </div>

              <button
                onClick={
                  handleSendRequest
                }
                disabled={loading}
                className="mt-4 w-full rounded-xl bg-emerald-500 py-3 font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
              >
                {loading
                  ? "Sending..."
                  : "Send request"}
              </button>

            </div>
          )}

          {message && (
            <p
              className={`text-center text-sm ${
                error
                  ? "text-red-400"
                  : "text-emerald-400"
              }`}
            >
              {message}
            </p>
          )}

        </div>

      </div>

    </div>
  );
}


/* ============================================
   FRIEND REQUESTS
============================================ */

function FriendRequestsModal({
  currentUserId,
  onClose,
}: {
  currentUserId: string;
  onClose: () => void;
}) {
  const [requests, setRequests] =
    useState<FriendRequest[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadRequests() {
      try {
        const data =
          await getIncomingFriendRequests(
            currentUserId
          );

        setRequests(
          data as FriendRequest[]
        );

      } catch (error) {
        console.error(
          "❌ Load requests:",
          error
        );

      } finally {
        setLoading(false);
      }
    }

    loadRequests();
  }, [currentUserId]);

  /*
   * ========================================
   * ACCEPT
   * ========================================
   */

  async function handleAccept(
    request: FriendRequest
  ) {
    if (processingId) return;

    setProcessingId(
      request.id
    );

    try {

      console.log(
        "🤝 Accepting request:",
        request
      );

      /*
       * STEP 1:
       * Create conversation FIRST.
       *
       * If this fails, the request
       * remains pending.
       */

      const conversation =
        await getOrCreateConversation(
          currentUserId,
          request.senderId,
          request.receiverName,
          request.senderName
        );

      console.log(
        "✅ Conversation created:",
        conversation
      );

      /*
       * STEP 2:
       * Mark request accepted.
       */

      await acceptFriendRequest(
        request.id
      );

      console.log(
        "✅ Friend request accepted"
      );

      /*
       * STEP 3:
       * Remove from modal.
       */

      setRequests(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              request.id
          )
      );

    } catch (error: unknown) {

      console.error(
        "🔥 ACCEPT REQUEST ERROR:",
        error
      );

      const errMessage =
        error instanceof Error
          ? error.message
          : "Unable to accept request.";

      alert(errMessage);

    } finally {
      setProcessingId(null);
    }
  }

  /*
   * ========================================
   * DECLINE
   * ========================================
   */

  async function handleDecline(
    request: FriendRequest
  ) {
    if (processingId) return;

    setProcessingId(
      request.id
    );

    try {

      await declineFriendRequest(
        request.id
      );

      setRequests(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              request.id
          )
      );

    } catch (error) {

      console.error(
        "❌ Decline request:",
        error
      );

    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">

      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6">

        <div className="mb-6 flex items-center justify-between">

          <h2 className="text-xl font-bold">
            Friend requests
          </h2>

          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-white/10"
          >
            <X size={20} />
          </button>

        </div>

        {loading ? (

          <p className="py-8 text-center text-slate-400">
            Loading...
          </p>

        ) : requests.length ===
          0 ? (

          <p className="py-8 text-center text-slate-400">
            No pending requests.
          </p>

        ) : (

          <div className="space-y-3">

            {requests.map(
              (request) => {

                const processing =
                  processingId ===
                  request.id;

                return (
                  <div
                    key={request.id}
                    className="rounded-xl border border-white/5 bg-white/5 p-4"
                  >

                    <div className="flex items-center gap-3">

                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 font-bold text-black">
                        {request.senderName
                          ?.charAt(0)
                          ?.toUpperCase()}
                      </div>

                      <div>

                        <p className="font-semibold">
                          {
                            request.senderName
                          }
                        </p>

                        <p className="text-sm text-slate-400">
                          {
                            request.senderEmail
                          }
                        </p>

                      </div>

                    </div>

                    <div className="mt-4 flex gap-2">

                      <button
                        onClick={() =>
                          handleAccept(
                            request
                          )
                        }
                        disabled={processing}
                        className="flex-1 rounded-lg bg-emerald-500 py-2 font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
                      >
                        {processing
                          ? "Accepting..."
                          : "Accept"}
                      </button>

                      <button
                        onClick={() =>
                          handleDecline(
                            request
                          )
                        }
                        disabled={processing}
                        className="flex-1 rounded-lg bg-white/10 py-2 hover:bg-white/15 disabled:opacity-50"
                      >
                        Decline
                      </button>

                    </div>

                  </div>
                );
              }
            )}

          </div>

        )}

      </div>

    </div>
  );
}


/* ============================================
   TIME
============================================ */

function formatTime(
  timestamp?: { seconds: number; nanoseconds?: number } | null
) {
  if (!timestamp?.seconds) {
    return "";
  }

  return new Date(
    timestamp.seconds * 1000
  ).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}