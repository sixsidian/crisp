"use client";

import { useMemo, useState } from "react";
import { ASSESSMENT_SECTIONS, AssessmentField, getQuestionNumbers, isFieldVisible } from "@/lib/assessment-questions";

const fieldClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none";

type Values = Record<string, string | string[]>;

interface Step {
  id: string;
  title: string;
  description?: string;
  fields: AssessmentField[];
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

  // Native `required` only protects the currently-visible step (every
  // other step's fields are carried as unrequired hidden inputs), so a
  // step reached via "Next" or the sidebar with unanswered required
  // fields wouldn't otherwise block a save. This checks every step,
  // not just the active one.
  function firstIncompleteStepIndex(): number {
    return steps.findIndex((step) =>
      visibleFields(step).some((f) => f.required && !isAnswered(values[f.name]))
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const badIndex = firstIncompleteStepIndex();
    if (badIndex !== -1) {
      e.preventDefault();
      setActiveIndex(badIndex);
      setSubmitError("Please answer every required question before saving - highlighted step needs attention.");
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
      <nav className="flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-6 lg:w-64 lg:shrink-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
        <div className="mb-2 hidden lg:block">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted">Progress</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
            <div className="h-full bg-accent transition-all" style={{ width: `${overallProgress}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">{overallProgress}% complete</p>
        </div>
        {steps.map((step, index) => {
          const progress = stepProgress(step);
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`flex shrink-0 items-center justify-between gap-2 rounded-full border px-3 py-1.5 text-left text-sm transition-colors lg:rounded-lg ${
                activeIndex === index
                  ? "border-accent bg-surface text-foreground"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              <span>{step.title}</span>
              {progress.total > 0 && (
                <span className="text-xs text-muted">
                  {progress.answered}/{progress.total}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <form action={action} onSubmit={handleSubmit} className="min-w-0 flex-1">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-display text-lg text-foreground">{activeStep.title}</h2>
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
              />
            ))}
          </div>
        </div>

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

        {submitError && <p className="mt-4 text-sm text-accent">{submitError}</p>}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
            disabled={activeIndex === 0}
            className="rounded-full border border-border px-4 py-2 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-40"
          >
            Back
          </button>

          {activeIndex < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                const missing = visibleFields(activeStep).some(
                  (f) => f.required && !isAnswered(values[f.name])
                );
                if (missing) {
                  setSubmitError("Please answer every required question on this step before moving on.");
                  return;
                }
                setSubmitError(null);
                setActiveIndex((i) => Math.min(steps.length - 1, i + 1));
              }}
              className="rounded-full bg-accent px-4 py-2 font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              className="rounded-full bg-accent px-4 py-2 font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
            >
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
}: {
  field: AssessmentField;
  number?: number;
  value: string | string[] | undefined;
  noteValue?: string | string[];
  onChange: (name: string, value: string | string[]) => void;
}) {
  const labelText = number ? `${number}. ${field.label}` : field.label;
  const notesBox = field.allowNotes && (
    <label className="flex flex-col gap-1 text-xs text-muted">
      Add detail (optional)
      <textarea
        name={`${field.name}__note`}
        value={typeof noteValue === "string" ? noteValue : ""}
        onChange={(e) => onChange(`${field.name}__note`, e.target.value)}
        rows={2}
        className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
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
            required={field.required}
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
                  required={field.required}
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
            required={field.required}
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
            required={field.required}
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
