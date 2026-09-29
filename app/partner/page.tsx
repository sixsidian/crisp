import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type SortOption = "created_desc" | "name_asc";

function isSortOption(value: string | undefined): value is SortOption {
  return value === "created_desc" || value === "name_asc";
}

// Customers visible here are every customer belonging to the signed-in
// partner's organization (enforced by RLS - see migration 0003), not
// just ones this particular user created, so colleagues at the same
// partner can collaborate on the same assessments.
export default async function PartnerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort: rawSort } = await searchParams;
  const sort: SortOption = isSortOption(rawSort) ? rawSort : "created_desc";

  const supabase = await createClient();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, company_name, created_at, partner_id, submissions(id, status, created_at)")
    .order(sort === "name_asc" ? "company_name" : "created_at", {
      ascending: sort === "name_asc",
    });

  const creatorIds = [...new Set((customers ?? []).map((c) => c.partner_id).filter(Boolean))];
  const { data: creators } = creatorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", creatorIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const creatorNames = new Map((creators ?? []).map((p) => [p.id, p.full_name]));

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

      <div className="mb-4 flex items-center gap-2 text-sm">
        <span className="text-muted">Sort by:</span>
        <Link
          href="/partner?sort=created_desc"
          className={`rounded-full border px-3 py-1 transition-colors ${
            sort === "created_desc"
              ? "border-accent text-foreground"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          Date added
        </Link>
        <Link
          href="/partner?sort=name_asc"
          className={`rounded-full border px-3 py-1 transition-colors ${
            sort === "name_asc" ? "border-accent text-foreground" : "border-border text-muted hover:text-foreground"
          }`}
        >
          Customer name (A-Z)
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
              {creatorNames.get(customer.partner_id) && ` - added by ${creatorNames.get(customer.partner_id)}`}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
