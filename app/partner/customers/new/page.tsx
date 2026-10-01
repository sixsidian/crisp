import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readAssessmentData } from "@/lib/assessment-questions";
import { AssessmentForm } from "@/components/assessment-form";
import { AssessmentPageHeader } from "@/components/assessment-page-header";

async function createCustomer(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("partner_organisation_id")
    .eq("id", user.id)
    .single();

  if (!profile?.partner_organisation_id) {
    throw new Error(
      "Your account isn't linked to a partner organisation yet - ask your admin to set this up before adding customers."
    );
  }

  const companyName = formData.get("company_name") as string;

  const { data: customer, error } = await supabase
    .from("customers")
    .insert({ partner_id: user.id, organisation_id: profile.partner_organisation_id, company_name: companyName })
    .select()
    .single();

  if (error || !customer) {
    throw new Error(error?.message ?? "Failed to create customer");
  }

  const submissionData = readAssessmentData(formData);

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .insert({
      customer_id: customer.id,
      partner_id: user.id,
      status: "draft",
      data: submissionData,
    })
    .select()
    .single();

  if (submissionError || !submission) {
    throw new Error(submissionError?.message ?? "Failed to create submission");
  }

  await supabase.from("activity_log").insert({
    customer_id: customer.id,
    submission_id: submission.id,
    actor_id: user.id,
    action: "customer_created",
  });

  redirect(`/partner/customers/${customer.id}`);
}

export default function NewCustomerPage() {
  return (
    <main className="page-shell page-shell-wide">
      <AssessmentPageHeader title="New customer" />
      <AssessmentForm action={createCustomer} submitLabel="Save and continue" companyNameField />
    </main>
  );
}
