import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GenerateReportButton } from "./generate-report-button";
import { SubmissionDataView } from "@/components/submission-data-view";
import { ReportView, type Report } from "@/components/report-view";
import { describeActivity } from "@/lib/activity-log";

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

  const { data: history } = await supabase
    .from("activity_log")
    .select("id, action, created_at, profiles(full_name)")
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
            <div className="flex items-center gap-3">
              {submission.status !== "complete" && (
                <Link
                  href={`/partner/customers/${id}/submissions/${submission.id}/edit`}
                  className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
                >
                  Edit
                </Link>
              )}
              {submission.status !== "complete" && (
                <GenerateReportButton submissionId={submission.id} />
              )}
            </div>
          </div>

          <SubmissionDataView data={(submission.data as Record<string, unknown>) ?? {}} />

          {submission.reports?.map((report) => (
            <div key={report.id} className="mt-4 border-t border-border pt-4">
              <ReportView report={report.report as unknown as Report} />
            </div>
          ))}
        </div>
      ))}

      {!!history?.length && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm uppercase tracking-wide text-muted">History</h2>
          <ul className="flex flex-col gap-2">
            {history.map((entry) => {
              const actorName = entry.profiles?.[0]?.full_name;
              return (
                <li key={entry.id} className="flex items-baseline justify-between text-sm">
                  <span className="text-foreground">
                    {describeActivity(entry.action)}
                    {actorName && <span className="text-muted"> by {actorName}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {new Date(entry.created_at).toLocaleString("en-GB")}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </main>
  );
}
