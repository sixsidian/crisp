interface CategoryBreakdown {
  category: string;
  score: number;
  notes: string;
}

interface SuggestedProduct {
  name: string;
  rationale: string;
}

export interface Report {
  readiness_score: number;
  summary: string;
  category_breakdown: CategoryBreakdown[];
  partner_next_steps: string[];
  suggested_products: SuggestedProduct[];
}

function scoreColor(score: number) {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-accent";
  return "bg-red-500";
}

// Renders the Claude-generated report JSON as a proper layout instead
// of a raw JSON dump: score, summary, category bars, next steps,
// suggested products.
export function ReportView({ report }: { report: Report }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-accent">
          <span className="font-display text-2xl text-foreground">{report.readiness_score}</span>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Readiness score</p>
          <p className="text-sm text-foreground">{report.summary}</p>
        </div>
      </div>

      {report.category_breakdown?.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs uppercase tracking-wide text-muted">Category breakdown</h3>
          <div className="flex flex-col gap-3">
            {report.category_breakdown.map((category) => (
              <div key={category.category}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-foreground">{category.category}</span>
                  <span className="text-muted">{category.score}/100</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-background">
                  <div
                    className={`h-full ${scoreColor(category.score)}`}
                    style={{ width: `${Math.max(0, Math.min(100, category.score))}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted">{category.notes}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.partner_next_steps?.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs uppercase tracking-wide text-muted">Partner next steps</h3>
          <ol className="flex flex-col gap-1.5 text-sm text-foreground">
            {report.partner_next_steps.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-accent">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {report.suggested_products?.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs uppercase tracking-wide text-muted">Suggested products</h3>
          <div className="flex flex-col gap-2">
            {report.suggested_products.map((product) => (
              <div key={product.name} className="rounded-xl border border-border bg-background p-3">
                <p className="text-sm font-medium text-foreground">{product.name}</p>
                <p className="text-xs text-muted">{product.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
