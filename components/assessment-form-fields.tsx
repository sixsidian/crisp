import { ASSESSMENT_SECTIONS, AssessmentField } from "@/lib/assessment-questions";

const fieldClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none";

// existingData is optional - when present (editing a submission),
// fields are pre-filled from it. When absent (creating a new
// customer), fields render empty/unset.
export function AssessmentFormFields({
  existingData,
}: {
  existingData?: Record<string, unknown>;
}) {
  return (
    <>
      {ASSESSMENT_SECTIONS.map((section) => (
        <fieldset key={section.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
          <legend className="px-1 font-display text-lg text-foreground">{section.title}</legend>
          {section.description && (
            <p className="-mt-2 text-xs text-muted">{section.description}</p>
          )}
          {section.fields.map((field) => (
            <Field key={field.name} field={field} value={existingData?.[field.name]} />
          ))}
        </fieldset>
      ))}
    </>
  );
}

function Field({ field, value }: { field: AssessmentField; value: unknown }) {
  switch (field.type) {
    case "select":
      return (
        <label className="flex flex-col gap-1 text-sm text-muted">
          {field.label}
          <select
            name={field.name}
            required={field.required}
            defaultValue={typeof value === "string" ? value : ""}
            className={fieldClass}
          >
            <option value="" disabled>
              Select...
            </option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      );

    case "radio":
      return (
        <fieldset className="flex flex-col gap-2 text-sm text-muted">
          <legend>{field.label}</legend>
          <div className="flex flex-wrap gap-3">
            {field.options?.map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-foreground has-[:checked]:border-accent"
              >
                <input
                  type="radio"
                  name={field.name}
                  value={option}
                  required={field.required}
                  defaultChecked={value === option}
                />
                {option}
              </label>
            ))}
          </div>
          {field.helpText && <span className="text-xs text-muted">{field.helpText}</span>}
        </fieldset>
      );

    case "checkbox-group": {
      const selected = Array.isArray(value) ? value : [];
      return (
        <fieldset className="flex flex-col gap-2 text-sm text-muted">
          <legend>{field.label}</legend>
          <div className="flex flex-wrap gap-3">
            {field.options?.map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-foreground has-[:checked]:border-accent"
              >
                <input
                  type="checkbox"
                  name={field.name}
                  value={option}
                  defaultChecked={selected.includes(option)}
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>
      );
    }

    case "textarea":
      return (
        <label className="flex flex-col gap-1 text-sm text-muted">
          {field.label}
          <textarea
            name={field.name}
            required={field.required}
            defaultValue={typeof value === "string" ? value : ""}
            rows={3}
            className={fieldClass}
          />
          {field.helpText && <span className="text-xs text-muted">{field.helpText}</span>}
        </label>
      );

    case "text":
    default:
      return (
        <label className="flex flex-col gap-1 text-sm text-muted">
          {field.label}
          <input
            type="text"
            name={field.name}
            required={field.required}
            defaultValue={typeof value === "string" ? value : ""}
            className={fieldClass}
          />
          {field.helpText && <span className="text-xs text-muted">{field.helpText}</span>}
        </label>
      );
  }
}

// Reads all field values back out of a submitted FormData, matching
// the shape each field type needs (checkbox-group -> string[]).
export function readAssessmentData(formData: FormData): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const section of ASSESSMENT_SECTIONS) {
    for (const field of section.fields) {
      if (field.type === "checkbox-group") {
        data[field.name] = formData.getAll(field.name);
      } else {
        const value = formData.get(field.name);
        if (value !== null) data[field.name] = value;
      }
    }
  }
  return data;
}
