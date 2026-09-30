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
    .from("partner_organizations")
    .select("id, name")
    .order("name");

  const serviceClient = createServiceRoleClient();
  const { data: users } = await serviceClient
    .from("profiles")
    .select("id, full_name, role, must_change_password, partner_org_id, created_at")
    .order("created_at", { ascending: false });

  const {
    data: { users: authUsers },
  } = await serviceClient.auth.admin.listUsers({ perPage: 200 });
  const emailById = new Map(authUsers.map((u) => [u.id, u.email ?? "(no email)"]));

  const filteredUsers = orgFilter ? users?.filter((u) => u.partner_org_id === orgFilter) : users;

  const fieldClass =
    "rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">Users</h1>
        <Link
          href="/admin/organisations"
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          ← Organisations
        </Link>
      </div>

      <section className="mb-10 rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm uppercase tracking-wide text-muted">New user</h2>
        <CreateUserForm organisations={orgs ?? []} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-wide text-muted">
            Users ({filteredUsers?.length ?? 0})
          </h2>
          <OrgFilter organisations={orgs ?? []} currentOrgId={orgFilter ?? ""} />
        </div>
        <ul className="flex flex-col gap-3 text-sm">
          {filteredUsers?.map((u) => (
            <li
              key={u.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-foreground sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-medium">{u.full_name ?? "(no name set)"}</div>
                <div className="text-xs text-muted">{emailById.get(u.id)}</div>
                <div className="mt-1 text-xs text-muted">
                  {u.role}
                  {u.must_change_password && " · password change pending"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <form action={reassignUser} className="flex items-center gap-2">
                  <input type="hidden" name="user_id" value={u.id} />
                  <select
                    name="partner_org_id"
                    defaultValue={u.partner_org_id ?? ""}
                    className={fieldClass}
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
                  <button
                    type="submit"
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-foreground"
                  >
                    {u.partner_org_id ? "Reassign" : "Assign"}
                  </button>
                </form>
                <form action={deleteUser}>
                  <input type="hidden" name="user_id" value={u.id} />
                  <DeleteUserButton />
                </form>
              </div>
            </li>
          ))}
        </ul>
        {!filteredUsers?.length && (
          <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-sm text-muted">
            No users match this filter.
          </p>
        )}
      </section>
    </main>
  );
}
