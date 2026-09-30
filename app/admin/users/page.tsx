import Link from "next/link";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { CreateUserForm } from "./create-user-form";
import { reassignUser } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: orgs } = await supabase
    .from("partner_organizations")
    .select("id, name")
    .order("name");

  // Service role: an admin needs to see every user's profile, not just
  // their own org's - requireAdmin() in ./actions.ts and the role check
  // in app/admin/layout.tsx are what gate that, not RLS.
  const serviceClient = createServiceRoleClient();
  const { data: users } = await serviceClient
    .from("profiles")
    .select("id, full_name, role, must_change_password, partner_org_id, created_at")
    .order("created_at", { ascending: false });

  // profiles has no email column (Supabase Auth owns that) - the Admin
  // API is the way to read it. perPage: 200 covers this project's scale;
  // revisit with pagination if the user list grows past that.
  const {
    data: { users: authUsers },
  } = await serviceClient.auth.admin.listUsers({ perPage: 200 });
  const emailById = new Map(authUsers.map((u) => [u.id, u.email ?? "(no email)"]));

  const orgNameById = new Map((orgs ?? []).map((o) => [o.id, o.name]));

  const fieldClass =
    "rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">Users</h1>
        <Link
          href="/admin/organizations"
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          ← Organizations
        </Link>
      </div>

      <section className="mb-10 rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm uppercase tracking-wide text-muted">New user</h2>
        <CreateUserForm organizations={orgs ?? []} />
      </section>

      <section>
        <h2 className="mb-3 text-sm uppercase tracking-wide text-muted">
          All users ({users?.length ?? 0})
        </h2>
        <ul className="flex flex-col gap-3 text-sm">
          {users?.map((u) => (
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
              <form action={reassignUser} className="flex items-center gap-2">
                <input type="hidden" name="user_id" value={u.id} />
                <select
                  name="partner_org_id"
                  defaultValue={u.partner_org_id ?? ""}
                  className={fieldClass}
                >
                  <option value="" disabled>
                    No organization
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
                  {orgNameById.get(u.partner_org_id ?? "") ? "Reassign" : "Assign"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
