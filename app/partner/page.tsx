import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function PartnerDashboard() {
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, company_name, created_at, submissions(id, status, created_at)")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">Your customers</h1>
        <Link
          href="/partner/customers/new"
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          New customer
        </Link>
      </div>

      {!customers?.length && (
        <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-sm text-muted">
          No customers yet. Add one to start an assessment.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {customers?.map((customer) => (
          <li
            key={customer.id}
            className="rounded-2xl border border-border bg-surface px-5 py-4 transition-colors hover:bg-surface-hover"
          >
            <Link href={`/partner/customers/${customer.id}`} className="font-medium text-foreground">
              {customer.company_name}
            </Link>
            <p className="mt-1 text-xs text-muted">
              {customer.submissions?.length ?? 0} submission(s)
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
