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
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 text-foreground sm:px-6">
        Customer not found.
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 font-display text-2xl text-foreground">{customer.company_name}</h1>

      {submissions?.map((submission) => (
        <div key={submission.id} className="mb-6 rounded-2xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="rounded-full border border-border px-2 py-0.5 text-xs uppercase tracking-wide text-muted">
              {submission.status}
            </span>
            {submission.status !== "complete" && (
              <GenerateReportButton submissionId={submission.id} />
            )}
          </div>

          <pre className="mb-3 overflow-x-auto rounded-lg border border-border bg-background p-3 text-xs text-muted">
            {JSON.stringify(submission.data, null, 2)}
          </pre>

          {submission.reports?.map((report) => (
            <div key={report.id} className="border-t border-border pt-3">
              <p className="font-medium text-foreground">
                Readiness score: {report.readiness_score}/100
              </p>
              <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-background p-3 text-xs text-muted">
                {JSON.stringify(report.report, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      ))}
    </main>
  );
}
