"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const supabase = createClient();
  const [currentEmail, setCurrentEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setCurrentEmail(data.user.email);
        setEmail(data.user.email);
      }
    });
  }, [supabase]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailLoading(true);
    setEmailStatus(null);

    const { error } = await supabase.auth.updateUser({ email });

    setEmailLoading(false);
    if (error) {
      setEmailStatus(error.message);
      return;
    }
    setEmailStatus("Check your inbox to confirm the email change.");
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordStatus(null);

    const { error } = await supabase.auth.updateUser({ password });

    setPasswordLoading(false);
    if (error) {
      setPasswordStatus(error.message);
      return;
    }
    setPassword("");
    setPasswordStatus("Password updated.");
  }

  const fieldClass =
    "rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none";

  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="mb-6 font-display text-2xl text-foreground">Account settings</h1>

      <form
        onSubmit={handleEmailSubmit}
        className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6"
      >
        <h2 className="font-display text-lg text-foreground">Email</h2>
        {currentEmail && <p className="text-xs text-muted">Current: {currentEmail}</p>}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
        />
        {emailStatus && <p className="text-sm text-accent">{emailStatus}</p>}
        <button
          type="submit"
          disabled={emailLoading}
          className="mt-1 self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {emailLoading ? "Saving..." : "Update email"}
        </button>
      </form>

      <form
        onSubmit={handlePasswordSubmit}
        className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6"
      >
        <h2 className="font-display text-lg text-foreground">Password</h2>
        <input
          type="password"
          required
          minLength={6}
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
        />
        {passwordStatus && <p className="text-sm text-accent">{passwordStatus}</p>}
        <button
          type="submit"
          disabled={passwordLoading}
          className="mt-1 self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {passwordLoading ? "Saving..." : "Update password"}
        </button>
      </form>
    </main>
  );
}
