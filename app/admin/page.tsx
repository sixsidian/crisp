import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";

// This page reads live data behind auth - never statically prerender it.
export const dynamic = "force-dynamic";

// Admin overview - uses the service-role client because an admin needs
// to see every partner's data, which RLS otherwise blocks. The actual
// access control for this happens one level up, in app/admin/layout.tsx
// (auth + profiles.role === 'admin' check, redirecting otherwise) - this
// page has no auth check of its own and relies entirely on that layout.
export default async function AdminDashboard() {
  const supabase = createServiceRoleClient();

  const { data: partners } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at, partner_organisations(name)")
    .eq("role", "partner")
    .order("created_at", { ascending: false });

  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, partner_id, status, created_at, customers(company_name)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="page-shell page-shell-wide">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Admin</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/admin/organisations" className="btn btn-ghost btn-sm">
            Organisations
          </Link>
          <Link href="/admin/users" className="btn btn-ghost btn-sm">
            Users
          </Link>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="section-label mb-3">Partners ({partners?.length ?? 0})</h2>
        <div className="row-list">
          {partners?.map((p) => (
            <div key={p.id} className="row-item">
              <span className="text-foreground">{p.full_name ?? p.id}</span>
              <span className="text-sm text-muted">
                {p.partner_organisations?.[0]?.name ?? "no organisation set"}
              </span>
            </div>
          ))}
          {!partners?.length && <div className="row-item text-sm text-muted">No partners yet.</div>}
        </div>
      </section>

      <section>
        <h2 className="section-label mb-3">Recent submissions</h2>
        <div className="row-list">
          {submissions?.map((s) => (
            <div key={s.id} className="row-item">
              <span className="text-foreground">{s.customers?.[0]?.company_name ?? "unknown customer"}</span>
              <StatusBadge status={s.status} />
            </div>
          ))}
          {!submissions?.length && <div className="row-item text-sm text-muted">No submissions yet.</div>}
        </div>
      </section>
    </main>
  );
}
