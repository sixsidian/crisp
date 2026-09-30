import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";
import Link from "next/link";

export async function AppHeader({ variant }: { variant: "partner" | "admin" }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The organization (e.g. "Commvault") the signed-in user belongs to -
  // shown top-right in place of their email. Two plain queries instead
  // of a PostgREST relationship embed (profiles -> partner_organisations)
  // - an embed depends on PostgREST's schema cache having picked up the
  // partner_organisation_id foreign key, which can lag behind a migration run
  // straight through the SQL editor rather than Supabase's own
  // migration tooling.
  let orgName: string | null = null;
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("partner_organisation_id, role")
      .eq("id", user.id)
      .single();

    isAdmin = profile?.role === "admin";

    if (profile?.partner_organisation_id) {
      const { data: org } = await supabase
        .from("partner_organisations")
        .select("name")
        .eq("id", profile.partner_organisation_id)
        .single();
      orgName = org?.name ?? null;
    }
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
          <Link href={homeHref} className="text-sm text-muted transition-colors hover:text-foreground">
            Home
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <span className="hidden text-sm text-muted lg:inline">{orgName ?? user.email}</span>
          )}
          {isAdmin && (
            <Link href="/admin" className="text-sm text-muted transition-colors hover:text-foreground">
              Admin
            </Link>
          )}
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
