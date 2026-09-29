import { createServiceRoleClient } from "@/lib/supabase/server";

// This page reads live data behind auth - never statically prerender it.
export const dynamic = "force-dynamic";

// Admin overview - uses the service-role client because an admin
// needs to see every partner's data, which RLS otherwise blocks.
// The middleware already checked profiles.role === 'admin' before
// this page is reachable.
export default async function AdminDashboard() {
  const supabase = createServiceRoleClient();

  const { data: partners } = await supabase
    .from("profiles")
    .select("id, full_name, partner_company, role, created_at")
    .eq("role", "partner")
    .order("created_at", { ascending: false });

  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, partner_id, status, created_at, customers(company_name)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Admin</h1>

      <section className="mb-8">
        <h2 className="mb-3 font-medium">Partners ({partners?.length ?? 0})</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {partners?.map((p) => (
            <li key={p.id} className="rounded border px-3 py-2">
              {p.full_name ?? p.id} — {p.partner_company ?? "no company set"}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-medium">Recent submissions</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {submissions?.map((s) => (
            <li key={s.id} className="rounded border px-3 py-2">
              {s.customers?.[0]?.company_name ?? "unknown customer"} — {s.status}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
