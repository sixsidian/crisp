import Link from "next/link";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { CreateUserForm } from "./create-user-form";
import { OrgFilter } from "./org-filter";
import { DeleteUserButton } from "./delete-user-button";
import { reassignUser, deleteUser } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const { org: orgFilter } = await searchParams;

  const supabase = await createClient();

  const { data: orgs } = await supabase
    .from("partner_organisations")
    .select("id, name")
    .order("name");

  const serviceClient = createServiceRoleClient();
  const { data: users } = await serviceClient
    .from("profiles")
    .select("id, full_name, role, must_change_password, partner_organisation_id, created_at")
    .order("created_at", { ascending: false });

  const {
    data: { users: authUsers },
  } = await serviceClient.auth.admin.listUsers({ perPage: 200 });
  const emailById = new Map(authUsers.map((u) => [u.id, u.email ?? "(no email)"]));

  const filteredUsers = orgFilter
    ? users?.filter((u) => u.partner_organisation_id === orgFilter)
    : users;

  return (
    <main className="page-shell">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Users</h1>
        <Link href="/admin/organisations" className="btn btn-ghost btn-sm">
          ← Organisations
        </Link>
      </div>

      <section className="panel mb-10">
        <h2 className="section-label mb-3">New user</h2>
        <CreateUserForm organisations={orgs ?? []} />
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-label">Users ({filteredUsers?.length ?? 0})</h2>
          <OrgFilter organisations={orgs ?? []} currentOrgId={orgFilter ?? ""} />
        </div>
        <div className="row-list">
          {filteredUsers?.map((u) => (
            <div key={u.id} className="row-item">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{u.full_name ?? "(no name set)"}</p>
                <p className="truncate text-xs text-muted">{emailById.get(u.id)}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {u.role}
                  {u.must_change_password && " · password change pending"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <form action={reassignUser} className="flex items-center gap-2">
                  <input type="hidden" name="user_id" value={u.id} />
                  <select
                    name="partner_organisation_id"
                    defaultValue={u.partner_organisation_id ?? ""}
                    className="field w-auto py-1.5 text-sm"
                  >
                    <option value="" disabled>
                      No organisation
                    </option>
                    {orgs?.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="btn btn-secondary btn-sm">
                    {u.partner_organisation_id ? "Reassign" : "Assign"}
                  </button>
                </form>
                <form action={deleteUser}>
                  <input type="hidden" name="user_id" value={u.id} />
                  <DeleteUserButton />
                </form>
              </div>
            </div>
          ))}
          {!filteredUsers?.length && (
            <div className="row-item text-sm text-muted">No users match this filter.</div>
          )}
        </div>
      </section>
    </main>
  );
}
