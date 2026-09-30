"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";

export async function createOrganisation(formData: FormData) {
  await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Organisation name is required.");

  const supabase = await createClient();
  const { error } = await supabase.from("partner_organisations").insert({ name });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/organisations");
  revalidatePath("/admin/users");
}

export async function renameOrganisation(formData: FormData) {
  await requireAdmin();

  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  if (!id) throw new Error("Missing organisation.");
  if (!name) throw new Error("Organisation name is required.");

  const supabase = await createClient();
  const { error } = await supabase.from("partner_organisations").update({ name }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/organisations");
  revalidatePath("/admin/users");
}
