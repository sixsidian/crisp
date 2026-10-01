import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createOrganisation, renameOrganisation } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminOrganisationsPage() {
  const supabase = await createClient();
  const { data: orgs } = await supabase
    .from("partner_organisations")
    .select("id, name, created_at")
    .order("name");

  return (
    <main className="page-shell">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Partner organisations</h1>
        <Link href="/admin/users" className="btn btn-ghost btn-sm">
          Users →
        </Link>
      </div>

      <form action={createOrganisation} className="mb-8 flex gap-2">
        <input
          type="text"
          name="name"
          required
          placeholder="Organisation name (e.g. Softcat)"
          className="field"
        />
        <button type="submit" className="btn btn-primary shrink-0">
          Add organisation
        </button>
      </form>

      <div className="row-list">
        {orgs?.map((org) => (
          <div key={org.id} className="row-item">
            <form action={renameOrganisation} className="flex flex-1 items-center gap-2">
              <input type="hidden" name="id" value={org.id} />
              <input type="text" name="name" defaultValue={org.name} required className="field" />
              <button type="submit" className="btn btn-secondary btn-sm shrink-0">
                Save
              </button>
            </form>
          </div>
        ))}
        {!orgs?.length && <div className="row-item text-sm text-muted">No organisations yet.</div>}
      </div>
    </main>
  );
}
