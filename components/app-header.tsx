import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";
import Link from "next/link";

export async function AppHeader({ variant }: { variant: "partner" | "admin" }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The organization (e.g. "Softcat") the signed-in user belongs to -
  // shown next to the wordmark so it's clear which partner's customers
  // are in view.
  let orgName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("partner_organizations(name)")
      .eq("id", user.id)
      .single();
    orgName = profile?.partner_organizations?.[0]?.name ?? null;
  }

  const homeHref = variant === "admin" ? "/admin" : "/partner";

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link
            href={homeHref}
            className="flex items-center gap-2"
            title="Cyber Resilience Intelligence & Scoring Platform"
          >
            <span className="font-display text-base leading-tight text-foreground sm:text-lg">
              C.R.I.S.P
            </span>
            {variant === "admin" && (
              <span className="rounded-full border border-border px-2 py-0.5 text-xs uppercase tracking-wide text-muted">
                Admin
              </span>
            )}
          </Link>
          {orgName && (
            <span className="hidden rounded-full border border-border px-2 py-0.5 text-xs text-muted sm:inline">
              {orgName}
            </span>
          )}
          <Link href={homeHref} className="text-sm text-muted transition-colors hover:text-foreground">
            Home
          </Link>
        </div>
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
