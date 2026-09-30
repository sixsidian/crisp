"use client";

import { useActionState, useState } from "react";
import { createUser, type CreateUserState } from "./actions";

const initialState: CreateUserState = {};

export function CreateUserForm({
  organizations,
}: {
  organizations: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createUser, initialState);
  const [copied, setCopied] = useState(false);

  const fieldClass =
    "rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted focus:border-accent focus:outline-none";

  return (
    <div>
      <form action={formAction} className="flex flex-col gap-3">
        <input type="email" name="email" required placeholder="Email" className={fieldClass} />
        <input type="text" name="full_name" placeholder="Full name" className={fieldClass} />
        <select name="partner_org_id" required defaultValue="" className={fieldClass}>
          <option value="" disabled>
            Select partner organization
          </option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        {state.error && <p className="text-sm text-accent">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Creating..." : "Create user"}
        </button>
      </form>

      {state.success && (
        <div className="mt-4 rounded-xl border border-accent bg-background px-4 py-3 text-sm">
          <p className="text-foreground">
            Created <strong>{state.success.email}</strong>. Temporary password (shown once only -
            copy it now and send it to them yourself; this app doesn&apos;t email login details):
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="rounded-lg border border-border bg-surface px-3 py-1.5 text-foreground">
              {state.success.tempPassword}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(state.success!.tempPassword);
                setCopied(true);
              }}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted transition-colors hover:text-foreground"
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
