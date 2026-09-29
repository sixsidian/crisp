import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function PartnerDashboard() {
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, company_name, created_at, submissions(id, status, created_at)")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your customers</h1>
        <Link
          href="/partner/customers/new"
          className="rounded bg-black px-3 py-2 text-sm text-white"
        >
          New customer
        </Link>
      </div>

      {!customers?.length && (
        <p className="text-sm text-gray-500">
          No customers yet. Add one to start an assessment.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {customers?.map((customer) => (
          <li key={customer.id} className="rounded border px-4 py-3">
            <Link href={`/partner/customers/${customer.id}`} className="font-medium">
              {customer.company_name}
            </Link>
            <p className="text-xs text-gray-500">
              {customer.submissions?.length ?? 0} submission(s)
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
