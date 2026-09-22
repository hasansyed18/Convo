import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { loginUser } from "../services/authService";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const user = await loginUser(email, password);

      if (!user.emailVerified) {
        navigate("/verify-email");
        return;
      }

      navigate("/chats");
    } catch (error: any) {
  console.error("Login error:", error);

  let message: string;

  switch (error?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      message = "Incorrect email or password.";
      break;

    case "auth/user-not-found":
      message = "No account exists with this email.";
      break;

    case "auth/invalid-email":
      message = "Please enter a valid email address.";
      break;

    case "auth/too-many-requests":
      message =
        "Too many unsuccessful attempts. Please try again later.";
      break;

    case "auth/user-disabled":
      message =
        "This account has been disabled. Please contact support.";
      break;

    case "auth/network-request-failed":
      message =
        "Network error. Please check your internet connection.";
      break;

    default:
      message =
        error?.message ||
        "Unable to sign in. Please try again.";
  }

  setError(message);
} finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">
            🤖
          </div>

          <h1 className="text-4xl font-bold">
            Welcome back
          </h1>

          <p className="text-slate-400 mt-2">
            Sign in to continue with Convo.
          </p>
        </div>

        {/* Login Card */}
        <form
          onSubmit={handleLogin}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5"
        >

          {/* Email */}
          <div>
            <label className="block mb-2 text-sm text-slate-300">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block mb-2 text-sm text-slate-300">
              Password
            </label>

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="Your password"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 p-3 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-3 font-semibold transition"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          {/* Register */}
          <p className="text-center text-sm text-slate-400">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-blue-400 hover:text-blue-300"
            >
              Create one
            </Link>
          </p>

        </form>
      </div>
    </div>
  );
}