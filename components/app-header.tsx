import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";
import Link from "next/link";

export async function AppHeader({ variant }: { variant: "partner" | "admin" }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href={variant === "admin" ? "/admin" : "/partner"} className="flex items-center gap-2">
          <span className="font-display text-base leading-tight text-foreground sm:text-lg">
            Cyber Resilience Intelligence &amp; Scoring Platform
          </span>
          {variant === "admin" && (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs uppercase tracking-wide text-muted">
              Admin
            </span>
          )}
        </Link>
        <div className="flex items-center gap-4">
          {user && <span className="hidden text-sm text-muted lg:inline">{user.email}</span>}
          <Link
            href="/partner/settings"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            Settings
          </Link>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
