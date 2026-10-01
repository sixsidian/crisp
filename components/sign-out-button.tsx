"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ variant = "default" }: { variant?: "default" | "menu" }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (variant === "menu") {
    return (
      <button
        onClick={handleSignOut}
        className="w-full rounded-md px-2.5 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-surface-hover"
      >
        Sign out
      </button>
    );
  }

  return (
    <button onClick={handleSignOut} className="btn btn-secondary btn-sm">
      Sign out
    </button>
  );
}
