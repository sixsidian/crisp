"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";

// 12 random bytes -> 16-char base64url string (upper/lower/digits/-/_).
// Well above Supabase's default minimum password length (6). Shown once
// to the admin (see CreateUserState.success) to relay to the new user
// out-of-band - this app deliberately doesn't email login links yet.
function generateTempPassword(): string {
  return randomBytes(12).toString("base64url");
}

export type CreateUserState = {
  error?: string;
  success?: { email: string; tempPassword: string };
};

export async function createUser(
  _prevState: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Admin access required." };
  }

  const email = (formData.get("email") as string)?.trim();
  const fullName = (formData.get("full_name") as string)?.trim();
  const orgId = formData.get("partner_org_id") as string;

  if (!email) return { error: "Email is required." };
  if (!orgId) return { error: "Select a partner organization." };

  const tempPassword = generateTempPassword();
  const serviceClient = createServiceRoleClient();

  // Raw SQL can't safely create an auth user - GoTrue has to hash the
  // password and populate its own internal columns. This is Supabase's
  // documented Admin API for exactly that:
  // https://supabase.com/docs/reference/javascript/auth-admin-createuser
  const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return { error: createError?.message ?? "Failed to create user." };
  }

  // handle_new_user() (migration 0002) already fired and inserted a bare
  // profiles row (role defaults to 'partner') for this new auth user -
  // fill in the rest of it.
  const { error: profileError } = await serviceClient
    .from("profiles")
    .update({
      full_name: fullName || null,
      partner_org_id: orgId,
      must_change_password: true,
    })
    .eq("id", created.user.id);

  if (profileError) {
    return {
      error: `User account created, but setting up their profile failed: ${profileError.message}. Fix this in Supabase directly - the auth user already exists.`,
    };
  }

  revalidatePath("/admin/users");
  return { success: { email, tempPassword } };
}

export async function reassignUser(formData: FormData) {
  await requireAdmin();

  const userId = formData.get("user_id") as string;
  const orgId = formData.get("partner_org_id") as string;

  if (!userId) throw new Error("Missing user.");
  if (!orgId) throw new Error("Select a partner organization.");

  // Service role, not the normal client: this needs to update ANOTHER
  // user's profile row. (Migration 0005 also adds an "admin update" RLS
  // policy so an admin's own session could do this too, but using the
  // service client here matches the create-user action above and keeps
  // this action working even if that policy is ever removed.)
  //
  // No extra bookkeeping needed for "loses access to the old org's
  // customers" - that's just what org-based RLS (migration 0003) already
  // enforces the moment partner_org_id changes.
  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient
    .from("profiles")
    .update({ partner_org_id: orgId })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
}
