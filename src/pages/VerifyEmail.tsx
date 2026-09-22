import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  sendEmailVerification,
  reload,
} from "firebase/auth";

import { auth } from "../services/firebase";

export default function VerifyEmail() {
  const navigate = useNavigate();

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function resendVerification() {
    if (!auth.currentUser) return;

    try {
      setLoading(true);

      await sendEmailVerification(
        auth.currentUser
      );

      setMessage(
        "Verification email sent again."
      );
    } catch {
      setMessage(
        "Unable to send verification email."
      );
    } finally {
      setLoading(false);
    }
  }

  async function checkVerification() {
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }

    await reload(auth.currentUser);

    if (auth.currentUser.emailVerified) {
      navigate("/dashboard");
    } else {
      setMessage(
        "Your email is not verified yet."
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">

      <div className="w-full max-w-md text-center">

        <div className="text-6xl mb-6">
          ✉️
        </div>

        <h1 className="text-3xl font-bold">
          Verify your email
        </h1>

        <p className="text-slate-400 mt-3">
          We've sent a verification link to your
          email address.
        </p>

        <div className="mt-8 space-y-3">

          <button
            onClick={checkVerification}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 py-3 font-semibold"
          >
            I've verified my email
          </button>

          <button
            onClick={resendVerification}
            disabled={loading}
            className="w-full rounded-xl border border-slate-700 hover:bg-slate-900 py-3"
          >
            {loading
              ? "Sending..."
              : "Resend verification email"}
          </button>

        </div>

        {message && (
          <p className="mt-5 text-sm text-blue-400">
            {message}
          </p>
        )}

      </div>
    </div>
  );
}