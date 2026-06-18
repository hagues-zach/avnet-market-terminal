"use client";

import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      // full reload so middleware re-evaluates with the new cookie
      window.location.href = "/overview";
    } else {
      setError(true);
      setLoading(false);
      setPassword("");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Wordmark className="h-9" />
          <p className="font-display text-2xs uppercase tracking-widest text-muted">
            Market Intelligence Terminal
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-card border border-line bg-surface p-6 shadow-card"
        >
          <div className="mb-1 flex items-center gap-2">
            <Lock className="h-4 w-4 text-avnet-greenDark" />
            <h1 className="font-display text-sm uppercase tracking-wide text-ink">
              Password Required
            </h1>
          </div>
          <p className="mb-4 text-xs text-muted">
            This is a private internal demo. Enter the password to continue.
          </p>

          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full rounded border border-line px-3 py-2 text-sm focus:border-avnet-green focus:outline-none focus:ring-2 focus:ring-avnet-green/30"
          />

          {error && (
            <p className="mt-2 text-xs text-danger">Incorrect password. Try again.</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded bg-avnet-green px-4 py-2 font-display text-sm uppercase tracking-wide text-white transition-colors duration-200 hover:bg-avnet-greenDark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
              </>
            ) : (
              "Enter"
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-2xs text-gray-medium">
          Avnet · internal demo — mock data
        </p>
      </div>
    </main>
  );
}
