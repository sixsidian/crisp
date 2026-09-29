"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ASSESSMENT_SECTIONS, AssessmentField, getRequiredFieldNames } from "@/lib/assessment-questions";

const fieldClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none";

type Values = Record<string, string | string[]>;

function isAnswered(value: string | string[] | undefined): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === "string" && value.length > 0;
}

interface AssessmentFormProps {
  action: (formData: FormData) => void;
  existingData?: Record<string, unknown>;
  submitLabel: string;
  // When set, renders an extra "Company" card as the first section with
  // a plain text input for the customer's company name (used only on
  // the "new customer" flow - company_name lives on the customers
  // table, not in submission data).
  companyNameField?: boolean;
}

export function AssessmentForm({ action, existingData, submitLabel, companyNameField }: AssessmentFormProps) {
  const [values, setValues] = useState<Values>(() => {
    const initial: Values = {};
    for (const section of ASSESSMENT_SECTIONS) {
      for (const field of section.fields) {
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

  const [activeSection, setActiveSection] = useState<string>(ASSESSMENT_SECTIONS[0].id);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-10% 0px -70% 0px" }
    );
    for (const section of ASSESSMENT_SECTIONS) {
      const el = sectionRefs.current[section.id];
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const requiredFieldNames = useMemo(() => getRequiredFieldNames(), []);
  const answeredCount = requiredFieldNames.filter((name) => isAnswered(values[name])).length;
  const overallProgress = requiredFieldNames.length
    ? Math.round((answeredCount / requiredFieldNames.length) * 100)
    : 100;

  function sectionProgress(sectionId: string) {
    const section = ASSESSMENT_SECTIONS.find((s) => s.id === sectionId)!;
    const required = section.fields.filter((f) => f.required);
    if (!required.length) return { answered: 0, total: 0 };
    const answered = required.filter((f) => isAnswered(values[f.name])).length;
    return { answered, total: required.length };
  }

  function setValue(name: string, value: string | string[]) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function scrollToSection(id: string) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <nav className="flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-6 lg:w-56 lg:shrink-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
        <div className="mb-2 hidden lg:block">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted">Progress</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
            <div className="h-full bg-accent transition-all" style={{ width: `${overallProgress}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">{overallProgress}% complete</p>
        </div>
        {companyNameField && (
          <button
            type="button"
            onClick={() => scrollToSection("company")}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-left text-sm transition-colors lg:rounded-lg ${
              activeSection === "company"
                ? "border-accent bg-surface text-foreground"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            Company
          </button>
        )}
        {ASSESSMENT_SECTIONS.map((section) => {
          const progress = sectionProgress(section.id);
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className={`flex shrink-0 items-center justify-between gap-2 rounded-full border px-3 py-1.5 text-left text-sm transition-colors lg:rounded-lg ${
                activeSection === section.id
                  ? "border-accent bg-surface text-foreground"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              <span>{section.title}</span>
              {progress.total > 0 && (
                <span className="text-xs text-muted">
                  {progress.answered}/{progress.total}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <form action={action} className="min-w-0 flex-1">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {companyNameField && (
            <fieldset
              id="company"
              ref={(el) => {
                sectionRefs.current["company"] = el;
              }}
              className="flex scroll-mt-6 flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
            >
              <legend className="sr-only">Company</legend>
              <h2 className="font-display text-lg text-foreground">Company</h2>
              <label className="flex flex-col gap-1 text-sm text-muted">
                Company name
                <input name="company_name" required className={fieldClass} />
              </label>
            </fieldset>
          )}

          {ASSESSMENT_SECTIONS.map((section) => (
            <fieldset
              key={section.id}
              id={section.id}
              ref={(el) => {
                sectionRefs.current[section.id] = el;
              }}
              className="flex scroll-mt-6 flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
            >
              <legend className="sr-only">{section.title}</legend>
              <h2 className="font-display text-lg text-foreground">{section.title}</h2>
              {section.description && <p className="-mt-2 text-xs text-muted">{section.description}</p>}
              {section.fields.map((field) => (
                <Field key={field.name} field={field} value={values[field.name]} onChange={setValue} />
              ))}
            </fieldset>
          ))}
        </div>

        <button
          type="submit"
          className="mt-6 rounded-full bg-accent px-4 py-2 font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          {submitLabel}
        </button>
      </form>
    </div>
  );
}

function Field({
  field,
  value,
  onChange,
}: {
  field: AssessmentField;
  value: string | string[] | undefined;
  onChange: (name: string, value: string | string[]) => void;
}) {
  switch (field.type) {
    case "select":
      return (
        <label className="flex flex-col gap-1 text-sm text-muted">
          {field.label}
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
    }

    case "textarea":
      return (
        <label className="flex flex-col gap-1 text-sm text-muted">
          {field.label}
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

    case "text":
    default:
      return (
        <label className="flex flex-col gap-1 text-sm text-muted">
          {field.label}
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
  }
}
