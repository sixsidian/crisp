"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Forced stop for anyone with profiles.must_change_password = true (set
// by app/admin/users/actions.ts when an admin creates a user with a
// temporary password). app/partner/layout.tsx and app/admin/layout.tsx
// both redirect here until this clears itself below. Not gated by
// either of those layouts itself, since a user stuck here by definition
// hasn't cleared the flag yet.
export default function ChangePasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      setChecked(true);
    });
  }, [router, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      setLoading(false);
      router.push("/login");
      return;
    }

    const { error: passwordError } = await supabase.auth.updateUser({ password });
    if (passwordError) {
      setLoading(false);
      setError(passwordError.message);
      return;
    }

    // "profiles: update own" (0001) lets a user update their own row,
    // and the privilege-escalation trigger (0003) only ever reverts
    // role/partner_organisation_id, so this column-only update goes through.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", user.id)
      .select("role")
      .single();

    setLoading(false);

    if (profileError) {
      setError(
        `Password changed, but couldn't clear the "must change password" flag: ${profileError.message}. Try refreshing.`
      );
      return;
    }

    router.push(profile?.role === "admin" ? "/admin" : "/partner");
    router.refresh();
  }

  if (!checked) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="panel w-full max-w-sm">
        <h1 className="font-display text-xl font-semibold text-foreground">Set a new password</h1>
        <p className="mt-1 text-sm text-muted">
          You&apos;re signed in with a temporary password. Choose your own before continuing.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <input
            type="password"
            required
            minLength={6}
            placeholder="New password"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Confirm new password"
            className="field"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {error && <p className="text-error text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary mt-2">
            {loading ? "Saving..." : "Set password"}
          </button>
        </form>
      </div>
    </main>
  );
}
