"use client";

import { useMemo, useState } from "react";
import { ASSESSMENT_SECTIONS, AssessmentField, getQuestionNumbers, isFieldVisible } from "@/lib/assessment-questions";

const fieldClass = "field";

type Values = Record<string, string | string[]>;

interface Step {
  id: string;
  title: string;
  description?: string;
  fields: AssessmentField[];
  // Only the "Company" step is hard-gated: company_name is a NOT NULL
  // column on customers, so an empty value would fail at the database
  // rather than just save as an incomplete answer. Every other step is
  // free to save incomplete - a partner may not finish the whole
  // assessment in one visit, and getMissingRequiredFields() gates
  // report generation instead of blocking saves here.
  hardRequired?: boolean;
}

function isAnswered(value: string | string[] | undefined): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === "string" && value.length > 0;
}

interface AssessmentFormProps {
  action: (formData: FormData) => void;
  existingData?: Record<string, unknown>;
  submitLabel: string;
  // When set, adds a "Company" step with a plain text input for the
  // customer's company name (used only on the "new customer" flow -
  // company_name lives on the customers table, not in submission data).
  companyNameField?: boolean;
}

export function AssessmentForm({ action, existingData, submitLabel, companyNameField }: AssessmentFormProps) {
  const steps: Step[] = companyNameField
    ? [
        {
          id: "company",
          title: "Company",
          fields: [{ name: "company_name", label: "Company name", type: "text", required: true }],
          hardRequired: true,
        },
        ...ASSESSMENT_SECTIONS,
      ]
    : ASSESSMENT_SECTIONS;

  const [values, setValues] = useState<Values>(() => {
    const initial: Values = {};
    for (const step of steps) {
      for (const field of step.fields) {
        const existing = existingData?.[field.name];
        if (field.type === "checkbox-group") {
          initial[field.name] = Array.isArray(existing) ? (existing as string[]) : [];
        } else {
          initial[field.name] = typeof existing === "string" ? existing : "";
        }
      }
    }
    return initial;
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const activeStep = steps[activeIndex];
  const questionNumbers = useMemo(() => getQuestionNumbers(), []);

  function setValue(name: string, value: string | string[]) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setSubmitError(null);
  }

  function visibleFields(step: Step) {
    return step.fields.filter((f) => isFieldVisible(f, values));
  }

  // A partner may not finish the whole assessment in one visit, so
  // only the "Company" step (company_name is a NOT NULL database
  // column) blocks saving. Every other step can be saved incomplete -
  // report generation is what actually enforces the required
  // questionnaire fields (see getMissingRequiredFields).
  function firstIncompleteStepIndex(): number {
    return steps.findIndex(
      (step) => step.hardRequired && visibleFields(step).some((f) => f.required && !isAnswered(values[f.name]))
    );
  }

  function goToStep(index: number) {
    setSubmitError(null);
    setActiveIndex(index);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const badIndex = firstIncompleteStepIndex();
    if (badIndex !== -1) {
      e.preventDefault();
      setActiveIndex(badIndex);
      setSubmitError("Enter a company name before saving.");
    }
  }

  function stepProgress(step: Step) {
    const required = visibleFields(step).filter((f) => f.required);
    if (!required.length) return { answered: 0, total: 0 };
    return { answered: required.filter((f) => isAnswered(values[f.name])).length, total: required.length };
  }

  const allRequired = steps.flatMap((s) => visibleFields(s).filter((f) => f.required));
  const overallAnswered = allRequired.filter((f) => isAnswered(values[f.name])).length;
  const overallProgress = allRequired.length ? Math.round((overallAnswered / allRequired.length) * 100) : 100;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <nav className="flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-20 lg:w-60 lg:shrink-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
        <div className="mb-2 hidden lg:block">
          <p className="section-label mb-1">Progress</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
            <div className="h-full bg-accent transition-all" style={{ width: `${overallProgress}%` }} />
          </div>
          <p className="data-value mt-1 text-xs text-muted">{overallProgress}% complete</p>
        </div>
        {steps.map((step, index) => {
          const progress = stepProgress(step);
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => goToStep(index)}
              className={`flex shrink-0 items-center justify-between gap-2 rounded-[var(--radius-sm)] border px-3 py-1.5 text-left text-sm transition-colors ${
                activeIndex === index
                  ? "border-accent bg-surface text-foreground"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              <span>{step.title}</span>
              {progress.total > 0 && (
                <span className="data-value text-xs text-muted">
                  {progress.answered}/{progress.total}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <form action={action} onSubmit={handleSubmit} className="min-w-0 flex-1">
        <div className="panel">
          <h2 className="font-display text-lg font-semibold text-foreground">{activeStep.title}</h2>
          {activeStep.description && <p className="mt-1 text-xs text-muted">{activeStep.description}</p>}
          <div className="mt-4 flex flex-col gap-4">
            {visibleFields(activeStep).map((field) => (
              <Field
                key={field.name}
                field={field}
                number={questionNumbers[field.name]}
                value={values[field.name]}
                noteValue={values[`${field.name}__note`]}
                onChange={setValue}
                nativeRequired={Boolean(activeStep.hardRequired) && Boolean(field.required)}
              />
            ))}
          </div>
        </div>

        {!activeStep.hardRequired && (
          <p className="mt-3 text-xs text-muted">
            You don&apos;t need to finish everything now - click through to the last step and
            select &quot;{submitLabel}&quot; to save your progress, then come back to finish the
            rest later. Fields marked * are needed before a report can be generated.
          </p>
        )}

        {/* Carry every other step's answers as hidden inputs so a single
            submit captures the whole form, not just the visible step.
            Fields hidden by dependsOn are skipped entirely, so an
            inapplicable answer never gets submitted. */}
        {steps
          .filter((_, index) => index !== activeIndex)
          .flatMap((step) => visibleFields(step))
          .flatMap((field) => {
            const inputs: { key: string; name: string; value: string }[] = [];
            const value = values[field.name];
            if (Array.isArray(value)) {
              value.forEach((v) => inputs.push({ key: `${field.name}-${v}`, name: field.name, value: v }));
            } else {
              inputs.push({ key: field.name, name: field.name, value: value ?? "" });
            }
            if (field.allowNotes) {
              const note = values[`${field.name}__note`];
              inputs.push({
                key: `${field.name}__note`,
                name: `${field.name}__note`,
                value: typeof note === "string" ? note : "",
              });
            }
            return inputs;
          })
          .map((input) => <input key={input.key} type="hidden" name={input.name} value={input.value} />)}

        {submitError && <p className="text-error mt-4 text-sm">{submitError}</p>}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => goToStep(Math.max(0, activeIndex - 1))}
            disabled={activeIndex === 0}
            className="btn btn-ghost"
          >
            Back
          </button>

          {activeIndex < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                if (activeStep.hardRequired) {
                  const missing = visibleFields(activeStep).some(
                    (f) => f.required && !isAnswered(values[f.name])
                  );
                  if (missing) {
                    setSubmitError("Enter a company name before continuing.");
                    return;
                  }
                }
                goToStep(Math.min(steps.length - 1, activeIndex + 1));
              }}
              className="btn btn-primary"
            >
              Next
            </button>
          ) : (
            <button type="submit" className="btn btn-primary">
              {submitLabel}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({
  field,
  number,
  value,
  noteValue,
  onChange,
  nativeRequired,
}: {
  field: AssessmentField;
  number?: number;
  value: string | string[] | undefined;
  noteValue?: string | string[];
  onChange: (name: string, value: string | string[]) => void;
  // Whether the browser should enforce this field via the native
  // `required` attribute. Only true on the hard-gated "Company" step -
  // everywhere else, `field.required` just marks a question as needed
  // before a report can be generated (see the * suffix below), not as
  // something that blocks saving the form.
  nativeRequired: boolean;
}) {
  const labelText = `${number ? `${number}. ` : ""}${field.label}${field.required ? " *" : ""}`;
  const notesBox = field.allowNotes && (
    <label className="flex flex-col gap-1 text-xs text-muted">
      Add detail (optional)
      <textarea
        name={`${field.name}__note`}
        value={typeof noteValue === "string" ? noteValue : ""}
        onChange={(e) => onChange(`${field.name}__note`, e.target.value)}
        rows={2}
        className="field text-sm"
      />
    </label>
  );

  let control: React.ReactNode;

  switch (field.type) {
    case "select":
      control = (
        <label className="flex flex-col gap-1 text-sm text-muted">
          {labelText}
          <select
            name={field.name}
            required={nativeRequired}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(field.name, e.target.value)}
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
      break;

    case "radio":
      control = (
        <fieldset className="flex flex-col gap-2 text-sm text-muted">
          <legend>{labelText}</legend>
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
                  required={nativeRequired}
                  checked={value === option}
                  onChange={() => onChange(field.name, option)}
                />
                {option}
              </label>
            ))}
          </div>
          {field.helpText && <span className="text-xs text-muted">{field.helpText}</span>}
        </fieldset>
      );
      break;

    case "checkbox-group": {
      const selected = Array.isArray(value) ? value : [];
      control = (
        <fieldset className="flex flex-col gap-2 text-sm text-muted">
          <legend>{labelText}</legend>
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
                  checked={selected.includes(option)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selected, option]
                      : selected.filter((o) => o !== option);
                    onChange(field.name, next);
                  }}
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>
      );
      break;
    }

    case "textarea":
      control = (
        <label className="flex flex-col gap-1 text-sm text-muted">
          {labelText}
          <textarea
            name={field.name}
            required={nativeRequired}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(field.name, e.target.value)}
            rows={3}
            className={fieldClass}
          />
          {field.helpText && <span className="text-xs text-muted">{field.helpText}</span>}
        </label>
      );
      break;

    case "text":
    default:
      control = (
        <label className="flex flex-col gap-1 text-sm text-muted">
          {labelText}
          <input
            type="text"
            name={field.name}
            required={nativeRequired}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={fieldClass}
          />
          {field.helpText && <span className="text-xs text-muted">{field.helpText}</span>}
        </label>
      );
      break;
  }

  return (
    <div className="flex flex-col gap-2">
      {control}
      {notesBox}
    </div>
  );
}
