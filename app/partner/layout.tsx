import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";

// Previously this layout had no auth check at all - individual pages
// relied on RLS quietly returning no rows for a signed-out request
// rather than an explicit redirect. Adding the check here rather than
// leaving it implicit, and also enforcing the forced password change
// (see migration 0005 and app/change-password/page.tsx) at the same
// point so no partner page is reachable with a pending temp password.
export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("must_change_password")
    .eq("id", user.id)
    .single();

  if (profile?.must_change_password) redirect("/change-password");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader variant="partner" />
      {children}
    </div>
  );
}
