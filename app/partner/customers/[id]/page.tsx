import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GenerateReportButton } from "./generate-report-button";
import { SubmissionDataView } from "@/components/submission-data-view";
import { ReportView, type Report } from "@/components/report-view";
import { StatusBadge } from "@/components/status-badge";
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
    return <main className="page-shell text-foreground">Customer not found.</main>;
  }

  return (
    <main className="page-shell">
      <h1 className="page-title mb-6">{customer.company_name}</h1>

      {submissions?.map((submission) => (
        <div key={submission.id} className="panel mb-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <StatusBadge status={submission.status} />
            <div className="flex items-center gap-3">
              {submission.status !== "complete" && (
                <Link href={`/partner/customers/${id}/submissions/${submission.id}/edit`} className="btn btn-ghost btn-sm">
                  Edit
                </Link>
              )}
              {submission.status !== "complete" && <GenerateReportButton submissionId={submission.id} />}
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
          <h2 className="section-label mb-3">History</h2>
          <ul className="row-list">
            {history.map((entry) => {
              const actorName = entry.profiles?.[0]?.full_name;
              return (
                <li key={entry.id} className="row-item">
                  <span className="text-sm text-foreground">
                    {describeActivity(entry.action)}
                    {actorName && <span className="text-muted"> · {actorName}</span>}
                  </span>
                  <span className="data-value shrink-0 text-xs text-muted">
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
