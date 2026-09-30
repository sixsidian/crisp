"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";

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
  const role = formData.get("role") === "admin" ? "admin" : "partner";
  const orgId = (formData.get("partner_organisation_id") as string) || null;

  if (!email) return { error: "Email is required." };
  if (role === "partner" && !orgId) return { error: "Select a partner organisation." };

  const tempPassword = generateTempPassword();
  const serviceClient = createServiceRoleClient();

  const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return { error: createError?.message ?? "Failed to create user." };
  }

  const { error: profileError } = await serviceClient
    .from("profiles")
    .update({
      full_name: fullName || null,
      partner_organisation_id: orgId,
      role,
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
  const orgId = formData.get("partner_organisation_id") as string;

  if (!userId) throw new Error("Missing user.");
  if (!orgId) throw new Error("Select a partner organisation.");

  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient
    .from("profiles")
    .update({ partner_organisation_id: orgId })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
}

export async function deleteUser(formData: FormData) {
  const admin = await requireAdmin();

  const userId = formData.get("user_id") as string;
  if (!userId) throw new Error("Missing user.");
  if (userId === admin.id) throw new Error("You can't delete your own account.");

  const serviceClient = createServiceRoleClient();

  const { data: target } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (target?.role === "admin") {
    const { count } = await serviceClient
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if ((count ?? 0) <= 1) throw new Error("Can't delete the last admin account.");
  }

  const { error } = await serviceClient.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
}
