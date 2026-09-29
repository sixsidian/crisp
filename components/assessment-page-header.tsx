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
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="font-display text-2xl text-foreground">{companyName ?? title}</h1>
        {companyName && <p className="text-sm text-muted">{title}</p>}
      </div>
      {typeof readinessScore === "number" && (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-accent">
          <span className="font-display text-lg text-foreground">{readinessScore}</span>
        </div>
      )}
    </div>
  );
}
