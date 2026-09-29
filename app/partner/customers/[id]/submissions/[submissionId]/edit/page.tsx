import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readAssessmentData } from "@/lib/assessment-questions";
import { AssessmentForm } from "@/components/assessment-form";
import { AssessmentPageHeader } from "@/components/assessment-page-header";

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
    .select("id, data, status, customers(company_name), reports(readiness_score)")
    .eq("id", submissionId)
    .single();

  if (!submission) {
    notFound();
  }

  if (submission.status === "complete") {
    redirect(`/partner/customers/${customerId}`);
  }

  const companyName = submission.customers?.[0]?.company_name;
  const readinessScore = submission.reports?.[0]?.readiness_score ?? null;

  const boundUpdate = updateSubmission.bind(null, customerId, submissionId);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <AssessmentPageHeader
        title="Edit assessment"
        companyName={companyName}
        readinessScore={readinessScore}
      />
      <AssessmentForm
        action={boundUpdate}
        existingData={submission.data as Record<string, unknown>}
        submitLabel="Save changes"
      />
    </main>
  );
}
