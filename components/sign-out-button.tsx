"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-full border border-border px-4 py-1.5 text-sm text-muted transition-colors hover:border-accent hover:text-foreground"
    >
      Sign out
    </button>
  );
}
