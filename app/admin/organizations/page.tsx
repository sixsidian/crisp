import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createOrganization } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminOrganizationsPage() {
  const supabase = await createClient();
  const { data: orgs } = await supabase
    .from("partner_organizations")
    .select("id, name, created_at")
    .order("name");

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">Partner organizations</h1>
        <Link href="/admin/users" className="text-sm text-muted transition-colors hover:text-foreground">
          Users →
        </Link>
      </div>

      <form action={createOrganization} className="mb-8 flex gap-2">
        <input
          type="text"
          name="name"
          required
          placeholder="Organization name (e.g. Softcat)"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          Add organization
        </button>
      </form>

      <ul className="flex flex-col gap-2 text-sm">
        {orgs?.map((org) => (
          <li
            key={org.id}
            className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground"
          >
            {org.name}
          </li>
        ))}
      </ul>
      {!orgs?.length && <p className="text-sm text-muted">No organizations yet.</p>}
    </main>
  );
}
