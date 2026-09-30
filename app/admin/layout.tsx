import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";

// Every page under /admin (see app/admin/page.tsx and friends) uses
// createServiceRoleClient(), which bypasses Row Level Security
// entirely. This layout is the ONLY thing that checks the caller is
// actually an admin before any of that data is fetched - previously
// there was no check at all here despite a comment on app/admin/page.tsx
// claiming "the middleware already checked profiles.role === 'admin'".
// No middleware.ts exists anywhere in this repo, so that comment was
// false and /admin was reachable by anyone, logged in or not.
//
// This only protects page renders. Every Server Action under /admin
// (app/admin/**/actions.ts) also calls requireAdmin() itself, because
// actions are POST endpoints reachable directly regardless of what
// this layout does - see lib/require-admin.ts.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, must_change_password")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/partner");
  if (profile.must_change_password) redirect("/change-password");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader variant="admin" />
      {children}
    </div>
  );
}
