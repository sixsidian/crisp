import { createClient } from "@/lib/supabase/server";
import { AccountMenu } from "./account-menu";
import Link from "next/link";

export async function AppHeader({ variant }: { variant: "partner" | "admin" }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The organisation (e.g. "Commvault") the signed-in user belongs to -
  // shown in the account menu in place of their email. Two plain queries
  // instead of a PostgREST relationship embed (profiles -> partner_
  // organisations) - an embed depends on PostgREST's schema cache having
  // picked up the partner_organisation_id foreign key, which can lag
  // behind a migration run straight through the SQL editor rather than
  // Supabase's own migration tooling.
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

  const menuLinks = [
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
    { href: "/partner/settings", label: "Settings" },
  ];

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={homeHref} className="btn btn-ghost btn-sm shrink-0">
            Home
          </Link>
          {variant === "admin" && <span className="chip">Admin</span>}
        </div>

        {user && <AccountMenu label={orgName ?? user.email ?? "Account"} links={menuLinks} />}
      </div>
    </header>
  );
}
