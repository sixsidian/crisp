import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SortSelect } from "@/components/sort-select";
import { StatusBadge } from "@/components/status-badge";

type SortOption = "created_desc" | "name_asc";

function isSortOption(value: string | undefined): value is SortOption {
  return value === "created_desc" || value === "name_asc";
}

// Customers visible here are every customer belonging to the signed-in
// partner's organisation (enforced by RLS - see migration 0003), not
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
    <main className="page-shell">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Your customers</h1>
        <Link href="/partner/customers/new" className="btn btn-primary">
          New customer
        </Link>
      </div>

      <div className="mb-4">
        <SortSelect
          current={sort}
          basePath="/partner"
          options={[
            { value: "created_desc", label: "Date added" },
            { value: "name_asc", label: "Customer name (A-Z)" },
          ]}
        />
      </div>

      {!customers?.length && (
        <p className="panel text-sm text-muted">No customers yet. Add one to start an assessment.</p>
      )}

      {!!customers?.length && (
        <div className="row-list">
          {customers.map((customer) => {
            const latest = [...(customer.submissions ?? [])].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0];
            return (
              <Link
                key={customer.id}
                href={`/partner/customers/${customer.id}`}
                className="row-item row-item-link"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{customer.company_name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {customer.submissions?.length ?? 0} submission(s)
                    {creatorNames.get(customer.partner_id) &&
                      ` · added by ${creatorNames.get(customer.partner_id)}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {latest && <StatusBadge status={latest.status} />}
                  <span className="btn btn-secondary btn-sm pointer-events-none">View</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
