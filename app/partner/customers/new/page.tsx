import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssessmentFormFields, readAssessmentData } from "@/components/assessment-form-fields";

async function createCustomer(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyName = formData.get("company_name") as string;

  const { data: customer, error } = await supabase
    .from("customers")
    .insert({ partner_id: user.id, company_name: companyName })
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

  redirect(`/partner/customers/${customer.id}`);
}

export default function NewCustomerPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 font-display text-2xl text-foreground">New customer</h1>
      <form action={createCustomer} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
          <legend className="px-1 font-display text-lg text-foreground">Company</legend>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Company name
            <input
              name="company_name"
              required
              className="rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none"
            />
          </label>
        </fieldset>

        <AssessmentFormFields />

        <button
          type="submit"
          className="mt-2 rounded-full bg-accent px-4 py-2 font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          Save and continue
        </button>
      </form>
    </main>
  );
}
