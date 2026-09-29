// Supabase client for use in Server Components, Route Handlers, and
// Server Actions - reads/writes the auth cookie so the logged-in
// partner's session (and therefore RLS) applies.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component that can't set cookies -
            // safe to ignore if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}

// Service-role client - bypasses RLS entirely. Only ever use this in
// server-side code that has already checked the caller is an admin,
// or for system writes like saving a generated report. Never import
// this into anything that runs in the browser.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
