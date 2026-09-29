import { ASSESSMENT_SECTIONS } from "@/lib/assessment-questions";

const FIELD_LABELS = new Map(
  ASSESSMENT_SECTIONS.flatMap((section) => section.fields.map((field) => [field.name, field.label]))
);

function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "None selected";
  }
  if (value === null || value === undefined || value === "") {
    return "Not answered";
  }
  return String(value);
}

// Renders a submission's JSONB data as labeled fields grouped by
// section, using the same schema the intake/edit forms are built
// from - instead of a raw JSON dump.
export function SubmissionDataView({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="flex flex-col gap-4">
      {ASSESSMENT_SECTIONS.map((section) => {
        const entries = section.fields.filter((field) => field.name in data);
        if (!entries.length) return null;
        return (
          <div key={section.id}>
            <h3 className="mb-2 text-xs uppercase tracking-wide text-muted">{section.title}</h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {entries.map((field) => (
                <div key={field.name}>
                  <dt className="text-xs text-muted">{FIELD_LABELS.get(field.name) ?? field.label}</dt>
                  <dd className="text-sm text-foreground">{formatValue(data[field.name])}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
