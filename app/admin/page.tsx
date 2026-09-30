import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";

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
    .select("id, full_name, role, created_at, partner_organizations(name)")
    .eq("role", "partner")
    .order("created_at", { ascending: false });

  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, partner_id, status, created_at, customers(company_name)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">Admin</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/admin/organizations" className="text-muted transition-colors hover:text-foreground">
            Organizations
          </Link>
          <Link href="/admin/users" className="text-muted transition-colors hover:text-foreground">
            Users
          </Link>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm uppercase tracking-wide text-muted">
          Partners ({partners?.length ?? 0})
        </h2>
        <ul className="flex flex-col gap-2 text-sm">
          {partners?.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground"
            >
              {p.full_name ?? p.id} — {p.partner_organizations?.[0]?.name ?? "no organization set"}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm uppercase tracking-wide text-muted">Recent submissions</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {submissions?.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground"
            >
              {s.customers?.[0]?.company_name ?? "unknown customer"} — {s.status}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
