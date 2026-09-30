"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";

export async function createOrganization(formData: FormData) {
  await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Organization name is required.");

  // Normal cookie-based client, not service role: "partner_organizations:
  // admin writes" (migration 0004) already lets an admin insert directly.
  const supabase = await createClient();
  const { error } = await supabase.from("partner_organizations").insert({ name });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/organizations");
  revalidatePath("/admin/users");
}
