import { createClient } from "@/lib/supabase/server";
import { GenerateReportButton } from "./generate-report-button";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("id, company_name")
    .eq("id", id)
    .single();

  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, status, data, created_at, reports(id, readiness_score, report, generated_at)")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  if (!customer) {
    return <main className="mx-auto max-w-2xl px-4 py-8">Customer not found.</main>;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">{customer.company_name}</h1>

      {submissions?.map((submission) => (
        <div key={submission.id} className="mb-6 rounded border p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Submission - {submission.status}
            </span>
            {submission.status !== "complete" && (
              <GenerateReportButton submissionId={submission.id} />
            )}
          </div>

          <pre className="mb-3 overflow-x-auto rounded bg-gray-50 p-3 text-xs">
            {JSON.stringify(submission.data, null, 2)}
          </pre>

          {submission.reports?.map((report) => (
            <div key={report.id} className="rounded border-t pt-3">
              <p className="font-medium">
                Readiness score: {report.readiness_score}/100
              </p>
              <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-3 text-xs">
                {JSON.stringify(report.report, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      ))}
    </main>
  );
}
