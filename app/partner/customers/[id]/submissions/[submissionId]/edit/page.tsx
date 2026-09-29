import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssessmentFormFields, readAssessmentData } from "@/components/assessment-form-fields";

async function updateSubmission(
  customerId: string,
  submissionId: string,
  formData: FormData
) {
  "use server";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const submissionData = readAssessmentData(formData);

  const { error } = await supabase
    .from("submissions")
    .update({ data: submissionData, updated_at: new Date().toISOString() })
    .eq("id", submissionId);

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/partner/customers/${customerId}`);
}

export default async function EditSubmissionPage({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const { id: customerId, submissionId } = await params;
  const supabase = await createClient();

  const { data: submission } = await supabase
    .from("submissions")
    .select("id, data, status, customers(company_name)")
    .eq("id", submissionId)
    .single();

  if (!submission) {
    notFound();
  }

  if (submission.status === "complete") {
    redirect(`/partner/customers/${customerId}`);
  }

  const companyName = submission.customers?.[0]?.company_name;

  const boundUpdate = updateSubmission.bind(null, customerId, submissionId);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-1 font-display text-2xl text-foreground">Edit assessment</h1>
      {companyName && <p className="mb-6 text-sm text-muted">{companyName}</p>}
      <form action={boundUpdate} className="flex flex-col gap-4">
        <AssessmentFormFields existingData={submission.data as Record<string, unknown>} />

        <button
          type="submit"
          className="mt-2 rounded-full bg-accent px-4 py-2 font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          Save changes
        </button>
      </form>
    </main>
  );
}
