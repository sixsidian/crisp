import { scoreBand } from "@/lib/score";

// Shown at the top of the new/edit customer assessment pages: the
// customer's name (if known) and their readiness score (if a report
// has already been generated for the submission being edited).
export function AssessmentPageHeader({
  title,
  companyName,
  readinessScore,
}: {
  title: string;
  companyName?: string;
  readinessScore?: number | null;
}) {
  return (
    <div className="mb-6 flex items-center justify-between gap-3">
      <div>
        <h1 className="page-title">{companyName ?? title}</h1>
        {companyName && <p className="text-sm text-muted">{title}</p>}
      </div>
      {typeof readinessScore === "number" && (
        <div className={`score-ring score-ring-${scoreBand(readinessScore)} h-14 w-14 shrink-0 text-lg`}>
          {readinessScore}
        </div>
      )}
    </div>
  );
}
