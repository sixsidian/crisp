// Single source of truth for the customer intake / assessment
// questionnaire. Used to render the "new customer" form, the "edit
// submission" form, and to label raw submission data for display.
//
// This is a starting questionnaire, not an official Commvault
// assessment framework - there isn't one wired in here yet. Treat this
// as a draft to correct, not a validated standard. It is built from
// published guidance:
//   - NIST SP 800-184, Guide for Cybersecurity Event Recovery
//     https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-184.pdf
//   - CISA/MS-ISAC #StopRansomware Guide
//     https://www.cisa.gov/stopransomware/ransomware-guide
//   - IBM, "Cyber Recovery vs. Disaster Recovery"
//     https://www.ibm.com/think/topics/cyber-recovery-vs-disaster-recovery
//   - Commvault, "Cyber Recovery and Disaster Recovery - Are They One
//     and the Same?" https://www.commvault.com/blogs/cyber-recovery-and-disaster-recovery
//
// Disaster recovery (DR) and cyber recovery (CR) are deliberately kept
// as separate sections, not merged: DR covers accidental/no-malice
// events (fire, flood, power loss, hardware failure) where the last
// good backup can be trusted and restored to the most recent point in
// time. Cyber recovery assumes an adversary was in the environment, so
// recovery requires an air-gapped/immutable copy, forensic validation
// in an isolated environment before reconnecting anything, and checks
// against re-infection - none of which apply to a DR event.
//
// The "data" JSONB column on submissions accepts any shape, so
// sections/fields can be added, removed or reworded here without a
// database migration - only existing stored answers for a removed
// field name would become orphaned JSON keys.

export type FieldType = "select" | "radio" | "checkbox-group" | "text" | "textarea";

export interface AssessmentField {
  name: string;
  label: string;
  type: FieldType;
  options?: string[];
  helpText?: string;
  required?: boolean;
  // When set, this field is only shown if the named field's current
  // answer is NOT one of hideWhen's values - e.g. "are crown-jewel
  // systems tiered onto faster storage" doesn't make sense if the
  // previous answer was "no minimum viable company is defined".
  dependsOn?: { field: string; hideWhen: string[] };
  // Adds an optional free-text "add detail" box beneath the field, for
  // questions where a partner's extra context materially helps the
  // assessment (e.g. what the crown-jewel systems actually are).
  allowNotes?: boolean;
}

export interface AssessmentSection {
  id: string;
  title: string;
  description?: string;
  fields: AssessmentField[];
}

export const ASSESSMENT_SECTIONS: AssessmentSection[] = [
  {
    id: "company_profile",
    title: "Company profile",
    fields: [
      {
        name: "sector",
        label: "Sector",
        type: "select",
        options: ["Financial services", "Healthcare", "Manufacturing", "Retail", "Public sector", "Other"],
        required: true,
      },
      {
        name: "employee_band",
        label: "Employee count",
        type: "select",
        options: ["1-50", "51-250", "251-1000", "1000+"],
        required: true,
      },
      {
        name: "site_count",
        label: "Number of sites / locations",
        type: "select",
        options: ["Single site", "2-5 sites", "6-20 sites", "20+ sites"],
        required: true,
      },
      {
        name: "it_dependency",
        label: "How dependent is day-to-day operation on IT systems?",
        type: "radio",
        options: ["Low", "Medium", "High", "Critical - can't operate without it"],
        required: true,
      },
      {
        name: "minimum_viable_company_defined",
        label:
          "Have they defined their \"minimum viable company\" - the minimum set of systems and functions needed to keep operating after a major incident?",
        type: "radio",
        options: ["Yes, documented", "Informally, not documented", "No", "Unsure"],
        required: true,
        allowNotes: true,
      },
      {
        name: "mvc_storage_tiering",
        label:
          "Are minimum viable company (\"crown jewel\") systems stored on faster/higher-performance storage than non-critical systems, so they can be recovered quicker while cheaper systems sit on slower tiers?",
        type: "radio",
        options: ["Yes, tiered by criticality", "No, everything is on the same tier", "No tiering strategy in place", "Unsure"],
        required: true,
        helpText:
          "RTO for a given system is largely a function of the storage it's recovered onto. Tiering by criticality lets crown-jewel systems recover fast without paying premium-storage cost for everything.",
        dependsOn: { field: "minimum_viable_company_defined", hideWhen: ["No"] },
        allowNotes: true,
      },
    ],
  },
  {
    id: "backup_practices",
    title: "Backup practices",
    fields: [
      {
        name: "backup_maturity",
        label: "Current backup maturity",
        type: "select",
        options: [
          "No formal backup strategy",
          "Basic backups, untested",
          "Regular backups, tested recovery",
          "Immutable/air-gapped backups in place",
        ],
        required: true,
      },
      {
        name: "follows_3_2_1_rule",
        label: "Do backups follow the 3-2-1 rule (3 copies, 2 media types, 1 offsite)?",
        type: "radio",
        options: ["Yes", "No", "Unsure"],
        required: true,
      },
      {
        name: "backup_frequency",
        label: "Backup frequency for critical systems",
        type: "select",
        options: ["Continuous / near-real-time", "Hourly", "Daily", "Weekly or less frequent", "Unsure"],
        required: true,
      },
    ],
  },
  {
    id: "disaster_recovery",
    title: "Disaster recovery (accidental / no malicious intent)",
    description:
      "Covers physical and infrastructure loss - fire, flood, power failure, hardware failure - where the last good backup can be trusted.",
    fields: [
      {
        name: "dr_plan_documented",
        label: "Is there a documented disaster recovery (DR) plan for physical/infrastructure loss?",
        type: "radio",
        options: ["Yes", "No", "Unsure"],
        required: true,
      },
      {
        name: "dr_last_tested",
        label: "When was the DR plan (failover for site/hardware loss) last tested?",
        type: "select",
        options: ["Within last 6 months", "6-12 months ago", "Over a year ago", "Never tested", "No DR plan"],
        required: true,
        dependsOn: { field: "dr_plan_documented", hideWhen: ["No"] },
      },
      {
        name: "rto_defined",
        label: "Is a Recovery Time Objective (RTO) defined for critical systems?",
        type: "radio",
        options: ["Yes", "No", "Unsure"],
        required: true,
      },
      {
        name: "rpo_defined",
        label: "Is a Recovery Point Objective (RPO) defined for critical systems?",
        type: "radio",
        options: ["Yes", "No", "Unsure"],
        required: true,
      },
      {
        name: "secondary_site_failover",
        label: "Can workloads fail over to a secondary site or region if the primary is lost?",
        type: "radio",
        options: ["Yes", "No", "Unsure"],
        required: true,
      },
    ],
  },
  {
    id: "cyber_recovery",
    title: "Cyber recovery (malicious intent / adversary in the environment)",
    description:
      "Assumes an attacker has been in the environment, so the last backup can't automatically be trusted - it must be validated in isolation before anything is reconnected.",
    fields: [
      {
        name: "immutable_air_gapped_copy",
        label: "Is there an immutable and/or air-gapped copy of critical data, isolated from the production network?",
        type: "radio",
        options: ["Yes", "No", "Unsure"],
        required: true,
      },
      {
        name: "isolated_recovery_environment",
        label:
          "Is there an isolated recovery environment (a \"clean room\"/sandbox) to validate backups are free of malware before reconnecting them to production?",
        type: "radio",
        options: ["Yes", "No", "Unsure"],
        required: true,
      },
      {
        name: "known_clean_recovery_point",
        label:
          "If an incident happened today, could they confidently identify their most recent verified-clean (malware-free) recovery point - or would that have to be worked out during the incident?",
        type: "radio",
        options: ["Yes, known/monitored continuously", "No, would have to work it out during an incident", "Unsure"],
        required: true,
        helpText:
          "RTO and RPO both assume the recovered data is trustworthy. A fast restore of infected data isn't a recovery - it's reinfection. Knowing the last clean point in advance, rather than discovering it mid-incident, is what actually shortens real-world downtime.",
      },
      {
        name: "ransomware_detection_tooling",
        label: "Is ransomware / anomaly detection tooling in place to spot compromise before it spreads to backups?",
        type: "radio",
        options: ["Yes", "No", "Unsure"],
        required: true,
      },
      {
        name: "backup_immutability_verified",
        label: "Have backups themselves ever been tested to confirm they can't be deleted or encrypted by an attacker with network access?",
        type: "radio",
        options: ["Yes", "No", "Unsure"],
        required: true,
      },
      {
        name: "cyber_insurance",
        label: "Do they hold cyber insurance?",
        type: "radio",
        options: ["Yes", "No", "Unsure"],
        required: true,
      },
    ],
  },
  {
    id: "incident_response",
    title: "Incident response",
    fields: [
      {
        name: "incident_response_plan",
        label: "Is there a documented cyber incident response plan?",
        type: "radio",
        options: ["Yes", "No", "Unsure"],
        required: true,
      },
      {
        name: "incident_response_tested",
        label: "Has the incident response plan been tested (e.g. tabletop exercise) in the last 12 months?",
        type: "radio",
        options: ["Yes", "No", "No plan to test", "Unsure"],
        required: true,
        dependsOn: { field: "incident_response_plan", hideWhen: ["No"] },
      },
    ],
  },
  {
    id: "offline_resilience",
    title: "Offline resilience",
    description:
      "Per CISA's #StopRansomware Guide: incident response plans, recovery runbooks and network diagrams should exist in hard copy or offline form, and backups should be genuinely offline/air-gapped - not just another drive or cloud folder reachable from the compromised network.",
    fields: [
      {
        name: "ir_plan_offline_copy",
        label:
          "Is a hard-copy or offline copy of the incident response plan and key contact list kept outside normal IT systems (i.e. not only on SharePoint/OneDrive/the corporate network)?",
        type: "radio",
        options: ["Yes", "No", "Unsure"],
        required: true,
        dependsOn: { field: "incident_response_plan", hideWhen: ["No"] },
      },
      {
        name: "dr_runbook_offline_copy",
        label: "Is the DR/recovery runbook and network diagram available offline if the network itself is down or compromised?",
        type: "radio",
        options: ["Yes", "No", "Unsure"],
        required: true,
        dependsOn: { field: "dr_plan_documented", hideWhen: ["No"] },
      },
      {
        name: "out_of_band_communication",
        label: "Is there an out-of-band communication method (not dependent on the primary network/email) for use during an incident?",
        type: "radio",
        options: ["Yes", "No", "Unsure"],
        required: true,
      },
    ],
  },
  {
    id: "compliance",
    title: "Compliance & governance",
    fields: [
      {
        name: "applicable_regulations",
        label: "Applicable regulations / standards (select all that apply)",
        type: "checkbox-group",
        options: ["GDPR", "HIPAA / HITECH", "PCI DSS", "DORA", "NIS2", "ISO 27001", "Not sure / none identified"],
      },
      {
        name: "data_residency_requirements",
        label: "Are there specific data residency requirements?",
        type: "radio",
        options: ["Yes", "No", "Unsure"],
        required: true,
      },
    ],
  },
  {
    id: "notes",
    title: "Additional context",
    fields: [
      {
        name: "additional_notes",
        label: "Anything else relevant (policies, procedures, prior incidents at a company level - no personal data)",
        type: "textarea",
        helpText: "Company-level information only. Do not include names, email addresses, or other details that identify a specific person.",
      },
    ],
  },
];

export function getAllFieldNames(): string[] {
  return ASSESSMENT_SECTIONS.flatMap((section) => section.fields.map((field) => field.name));
}

export function getRequiredFieldNames(): string[] {
  return ASSESSMENT_SECTIONS.flatMap((section) =>
    section.fields.filter((field) => field.required).map((field) => field.name)
  );
}

// Which required, currently-applicable (per dependsOn) questions are
// still unanswered in a stored submission's data. Used to gate report
// generation on a submission that's otherwise allowed to be saved
// incomplete as a draft across multiple visits.
export function getMissingRequiredFields(data: Record<string, unknown>): AssessmentField[] {
  const values: Record<string, string | string[]> = {};
  for (const section of ASSESSMENT_SECTIONS) {
    for (const field of section.fields) {
      const raw = data[field.name];
      values[field.name] = Array.isArray(raw) ? (raw as string[]) : typeof raw === "string" ? raw : "";
    }
  }

  const missing: AssessmentField[] = [];
  for (const section of ASSESSMENT_SECTIONS) {
    for (const field of section.fields) {
      if (!field.required || !isFieldVisible(field, values)) continue;
      const value = values[field.name];
      const answered = Array.isArray(value) ? value.length > 0 : value.length > 0;
      if (!answered) missing.push(field);
    }
  }
  return missing;
}

// Sequential reference numbers (1, 2, 3...) for every question, in
// schema order, so a question can be referenced unambiguously (e.g.
// "Q14") regardless of which step it's currently shown in.
export function getQuestionNumbers(): Record<string, number> {
  const numbers: Record<string, number> = {};
  let n = 1;
  for (const section of ASSESSMENT_SECTIONS) {
    for (const field of section.fields) {
      numbers[field.name] = n++;
    }
  }
  return numbers;
}

// Whether a field should currently be shown, based on another field's
// answer (dependsOn). A field with no dependsOn is always visible.
export function isFieldVisible(field: AssessmentField, values: Record<string, string | string[]>): boolean {
  if (!field.dependsOn) return true;
  const currentValue = values[field.dependsOn.field];
  if (Array.isArray(currentValue)) {
    return !field.dependsOn.hideWhen.some((v) => currentValue.includes(v));
  }
  return !field.dependsOn.hideWhen.includes(currentValue ?? "");
}

// Reads all field values back out of a submitted FormData, matching
// the shape each field type needs (checkbox-group -> string[]), plus
// any optional per-field notes (name + "__note"). Pure function, safe
// to import from server actions/components.
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
      if (field.allowNotes) {
        const note = formData.get(`${field.name}__note`);
        if (note) data[`${field.name}__note`] = note;
      }
    }
  }
  return data;
}
