"use client";

import { useActionState, useState } from "react";
import { createUser, type CreateUserState } from "./actions";

const initialState: CreateUserState = {};

export function CreateUserForm({
  organisations,
}: {
  organisations: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createUser, initialState);
  const [copied, setCopied] = useState(false);
  const [role, setRole] = useState("partner");

  return (
    <div>
      <form action={formAction} className="flex flex-col gap-3">
        <input type="email" name="email" required placeholder="Email" className="field" />
        <input type="text" name="full_name" placeholder="Full name" className="field" />
        <select
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="field"
        >
          <option value="partner">Partner</option>
          <option value="admin">Admin</option>
        </select>
        <select name="partner_organisation_id" required={role === "partner"} defaultValue="" className="field">
          <option value="">
            {role === "admin" ? "No organisation (optional)" : "Select partner organisation"}
          </option>
          {organisations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        {state.error && <p className="text-error text-sm">{state.error}</p>}
        <button type="submit" disabled={pending} className="btn btn-primary self-start">
          {pending ? "Creating..." : "Create user"}
        </button>
      </form>

      {state.success && (
        <div className="mt-4 rounded-[var(--radius-sm)] border border-accent bg-background px-4 py-3 text-sm">
          <p className="text-foreground">
            Created <strong>{state.success.email}</strong>. Temporary password (shown once only -
            copy it now and send it to them yourself; this app doesn&apos;t email login details):
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="data-value rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-1.5 text-foreground">
              {state.success.tempPassword}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(state.success!.tempPassword);
                setCopied(true);
              }}
              className="btn btn-secondary btn-sm"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            They&apos;ll be required to set their own password the first time they sign in.
          </p>
        </div>
      )}
    </div>
  );
}
