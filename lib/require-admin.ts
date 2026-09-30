// Re-checks authorization inside the request itself, not just at
// render time. A Server Action is a POST endpoint any client can call
// directly - the admin layout's redirect only gates page renders, it
// does not gate actions. See:
// node_modules/next/dist/docs/01-app/02-guides/server-actions.md#security
// ("Render-time gating ... is not a security boundary").
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    throw new Error("Admin access required.");
  }

  return user;
}
