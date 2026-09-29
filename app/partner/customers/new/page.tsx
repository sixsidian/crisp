import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Placeholder intake questions. Structured selects rather than free
// text on purpose - see the compliance discussion on keeping personal
// data out of these fields. Swap these for the real assessment
// questionnaire once it's defined; the "data" JSON column on
// submissions accepts any shape, so no migration is needed to change
// these fields later.
const SECTORS = ["Financial services", "Healthcare", "Manufacturing", "Retail", "Public sector", "Other"];
const EMPLOYEE_BANDS = ["1-50", "51-250", "251-1000", "1000+"];
const BACKUP_MATURITY = ["No formal backup strategy", "Basic backups, untested", "Regular backups, tested recovery", "Immutable/air-gapped backups in place"];

async function createCustomer(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyName = formData.get("company_name") as string;

  const { data: customer, error } = await supabase
    .from("customers")
    .insert({ partner_id: user.id, company_name: companyName })
    .select()
    .single();

  if (error || !customer) {
    throw new Error(error?.message ?? "Failed to create customer");
  }

  const submissionData = {
    sector: formData.get("sector"),
    employee_band: formData.get("employee_band"),
    backup_maturity: formData.get("backup_maturity"),
  };

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .insert({
      customer_id: customer.id,
      partner_id: user.id,
      status: "draft",
      data: submissionData,
    })
    .select()
    .single();

  if (submissionError || !submission) {
    throw new Error(submissionError?.message ?? "Failed to create submission");
  }

  redirect(`/partner/customers/${customer.id}`);
}

const fieldClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none";

export default function NewCustomerPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="mb-6 font-display text-2xl text-foreground">New customer</h1>
      <form
        action={createCustomer}
        className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
      >
        <label className="flex flex-col gap-1 text-sm text-muted">
          Company name
          <input name="company_name" required className={fieldClass} />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Sector
          <select name="sector" required className={fieldClass}>
            {SECTORS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Employee count
          <select name="employee_band" required className={fieldClass}>
            {EMPLOYEE_BANDS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Current backup maturity
          <select name="backup_maturity" required className={fieldClass}>
            {BACKUP_MATURITY.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </label>

        <p className="text-xs text-muted">
          Enter company-level information only. Do not include names, email
          addresses, or other details that identify a specific person.
        </p>

        <button
          type="submit"
          className="mt-2 rounded-full bg-accent px-4 py-2 font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          Save and continue
        </button>
      </form>
    </main>
  );
}
